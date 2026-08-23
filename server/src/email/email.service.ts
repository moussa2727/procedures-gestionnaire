import {
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import * as fs from 'fs';
import * as path from 'path';
import * as Handlebars from 'handlebars';

export interface EmailAttachment {
  filename: string;
  content?: Buffer | string;
  path?: string;
}

export interface SendEmailOptions<
  T extends Record<string, unknown> = Record<string, unknown>,
> {
  to: string | string[];
  subject: string;
  template: string;
  context?: T;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  attachments?: EmailAttachment[];
}

const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 500;

export class EmailDeliveryException extends InternalServerErrorException {
  constructor(cause: unknown) {
    super("Échec de l'envoi de l'email après plusieurs tentatives");
    this.cause = cause;
  }
}

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private resend!: Resend;
  private readonly templateCache = new Map<
    string,
    HandlebarsTemplateDelegate
  >();
  private readonly templatesRoot = path.join(__dirname, 'templates');

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    this.initResend();
    this.registerCustomHelpers();
    await this.registerPartials();
  }

  private initResend(): void {
    try {
      const apiKey = this.configService.getOrThrow<string>('RESEND_API_KEY');
      this.resend = new Resend(apiKey);
      this.logger.log('Resend initialisé');

      const from = this.configService.get<string>('EMAIL_FROM');
      if (!from) {
        this.logger.warn(
          "EMAIL_FROM non défini dans les variables d'environnement",
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Échec de l'initialisation de Resend: ${errorMessage}`);
      throw error;
    }
  }

  private async registerPartials(): Promise<void> {
    const partialsDir = path.join(this.templatesRoot, 'partials');
    if (!fs.existsSync(partialsDir)) return;

    try {
      const files = await fs.promises.readdir(partialsDir);
      for (const file of files) {
        if (file.endsWith('.hbs')) {
          const partialName = path.basename(file, '.hbs');
          const content = await fs.promises.readFile(
            path.join(partialsDir, file),
            'utf-8',
          );
          Handlebars.registerPartial(partialName, content);
          this.logger.debug(`Partial enregistré: {{> ${partialName} }}`);
        }
      }
    } catch (error) {
      this.logger.warn(`Erreur lors du chargement des partials: ${error}`);
    }
  }

  private registerCustomHelpers(): void {
    Handlebars.registerHelper('formatDate', (date: Date | string) => {
      if (!date) return '';
      return new Date(date).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
    });

    Handlebars.registerHelper('eq', (a, b) => a === b);
  }

  async send<T extends Record<string, unknown> = Record<string, unknown>>(
    options: SendEmailOptions<T>,
  ): Promise<void> {
    const targetAddress = Array.isArray(options.to)
      ? options.to.join(', ')
      : options.to;
    const maskedTarget = this.maskEmail(targetAddress);
    this.logger.debug(
      `Envoi d'email à ${maskedTarget} (template: ${options.template})`,
    );

    const html = await this.render(options.template, options.context || {});
    const from = this.configService.getOrThrow<string>('EMAIL_FROM');

    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const { error } = await this.resend.emails.send({
          from,
          to: options.to,
          subject: options.subject,
          html,
          cc: options.cc,
          bcc: options.bcc,
          replyTo: options.replyTo,
          attachments: options.attachments,
        });

        if (error) {
          const errorMessage =
            typeof error === 'string' ? error : JSON.stringify(error);
          throw new Error(errorMessage);
        }

        this.logger.log(
          `Email envoyé avec succès à ${maskedTarget} (tentative ${attempt}/${MAX_ATTEMPTS})`,
        );
        return;
      } catch (error) {
        lastError = error;
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `Échec envoi email à ${maskedTarget} (tentative ${attempt}/${MAX_ATTEMPTS}): ${errorMessage}`,
        );

        if (attempt < MAX_ATTEMPTS) {
          await this.delay(BASE_DELAY_MS * 2 ** (attempt - 1));
        }
      }
    }

    this.logger.error(
      `Échec définitif de l'envoi de l'email à ${maskedTarget} après ${MAX_ATTEMPTS} tentatives`,
    );
    throw new EmailDeliveryException(lastError);
  }

  private async render(
    templateName: string,
    context: Record<string, unknown>,
  ): Promise<string> {
    let compiled = this.templateCache.get(templateName);

    if (!compiled) {
      const filePath = path.join(this.templatesRoot, `${templateName}.hbs`);

      if (!fs.existsSync(filePath)) {
        this.logger.error(`Template introuvable: ${templateName}`);
        throw new Error(`Template '${templateName}' introuvable`);
      }

      const source = await fs.promises.readFile(filePath, 'utf-8');
      compiled = Handlebars.compile(source);
      this.templateCache.set(templateName, compiled);
      this.logger.debug(`Template ${templateName} chargé et mis en cache`);
    }

    return compiled(context);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private maskEmail(email: string): string {
    if (!email || email.length === 0) return '***';
    const parts = email.split('@');
    if (parts.length !== 2) return '***';
    const [local, domain] = parts;
    if (local.length <= 2) {
      return `${local}@${this.maskDomain(domain)}`;
    }
    const maskedLocal =
      local.substring(0, 2) + '***' + local.substring(local.length - 1);
    return `${maskedLocal}@${this.maskDomain(domain)}`;
  }

  private maskDomain(domain: string): string {
    const parts = domain.split('.');
    if (parts.length < 2) return '***';
    const tld = parts.pop();
    const domainName = parts.join('.');
    if (domainName.length <= 2) {
      return `${domainName}.${tld}`;
    }
    const masked =
      domainName.substring(0, 2) +
      '***' +
      domainName.substring(domainName.length - 1);
    return `${masked}.${tld}`;
  }
}
