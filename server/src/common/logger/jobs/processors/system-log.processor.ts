// jobs/processors/system-log.processor.ts
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);

@Processor('system-log')
export class SystemLogProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(SystemLogProcessor.name);
  private readonly logsDir: string;
  private readonly archiveDir: string;

  constructor() {
    super();
    const baseDir =
      process.env.NODE_ENV === 'production' ? '/tmp' : process.cwd();
    this.logsDir = path.join(baseDir, 'logs');
    this.archiveDir = path.join(this.logsDir, 'archive');
    this.ensureDirectories();
  }

  onModuleInit(): void {
    this.logger.log(
      'SystemLogProcessor instancie et pret a consommer la queue "system-log"',
    );
  }

  @OnWorkerEvent('active')
  onActive(job: Job): void {
    this.logger.log(`Worker actif sur le job "${job.name}" (id=${job.id})`);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job): void {
    this.logger.log(
      `Job "${job.name}" (id=${job.id}) marque comme complete par le worker`,
    );
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error): void {
    this.logger.error(
      `Job "${job?.name}" (id=${job?.id}) marque comme echoue par le worker : ${error?.message}`,
    );
  }

  @OnWorkerEvent('error')
  onError(error: Error): void {
    this.logger.error(
      `Erreur worker sur la queue "system-log" : ${error?.message}`,
    );
  }

  private ensureDirectories() {
    try {
      if (!fs.existsSync(this.logsDir)) {
        fs.mkdirSync(this.logsDir, { recursive: true });
        this.logger.log(`Created logs directory: ${this.logsDir}`);
      }
      if (!fs.existsSync(this.archiveDir)) {
        fs.mkdirSync(this.archiveDir, { recursive: true });
        this.logger.log(`Created archive directory: ${this.archiveDir}`);
      }
    } catch (error) {
      this.logger.error(`Failed to create log directories: ${error}`);
      const fallbackDir = '/tmp/logs';
      const fallbackArchive = '/tmp/logs/archive';
      if (!fs.existsSync(fallbackDir)) {
        fs.mkdirSync(fallbackDir, { recursive: true });
      }
      if (!fs.existsSync(fallbackArchive)) {
        fs.mkdirSync(fallbackArchive, { recursive: true });
      }
      Object.assign(this, {
        logsDir: fallbackDir,
        archiveDir: fallbackArchive,
      });
      this.logger.warn(`Using fallback directories: ${fallbackDir}`);
    }
  }

  async process(job: Job): Promise<any> {
    this.logger.log(
      `Traitement du job "${job.name}" demarre (id=${job.id}, tentative=${job.attemptsMade + 1})`,
    );

    try {
      if (job.name === 'rotate-logs') {
        const result = await this.rotateLogs();
        this.logger.log(
          `Traitement du job "${job.name}" termine avec succes (id=${job.id})`,
        );
        return result;
      }
      this.logger.warn(
        `Job "${job.name}" recu mais aucun handler correspondant (id=${job.id})`,
      );
      return null;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      this.logger.error(
        `Echec du traitement du job "${job.name}" (id=${job.id}) : ${message}`,
      );
      throw err;
    }
  }

  private async rotateLogs() {
    const rotated: string[] = [];
    const logFiles = fs
      .readdirSync(this.logsDir)
      .filter((f) => f.endsWith('.log') && !f.includes('-'));

    for (const file of logFiles) {
      const filePath = path.join(this.logsDir, file);
      const date = new Date();
      const archiveName = `${file.replace('.log', '')}-${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}.log.gz`;
      const archivePath = path.join(this.archiveDir, archiveName);

      try {
        const content = fs.readFileSync(filePath);
        if (content.length > 0) {
          const compressed = await gzip(content);
          fs.writeFileSync(archivePath, compressed);
          fs.truncateSync(filePath, 0);
          rotated.push(file);

          this.logger.log(`Rotated log file: ${file} -> ${archiveName}`);
        }
      } catch (error) {
        this.logger.error(
          `Failed to rotate ${file}: ${(error as Error).message}`,
        );
      }
    }

    await this.cleanupOldArchives();

    this.logger.log(`Rotated ${rotated.length} log files`);
    return { rotated, count: rotated.length };
  }

  private cleanupOldArchives() {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const archives = fs
      .readdirSync(this.archiveDir)
      .filter((f) => f.endsWith('.gz'));
    let deleted = 0;

    for (const archive of archives) {
      const archivePath = path.join(this.archiveDir, archive);
      const stats = fs.statSync(archivePath);
      if (stats.mtimeMs < thirtyDaysAgo) {
        fs.unlinkSync(archivePath);
        deleted++;
        this.logger.debug(`Deleted old archive: ${archive}`);
      }
    }

    if (deleted > 0) {
      this.logger.log(`Cleaned up ${deleted} old log archives`);
    }
  }
}
