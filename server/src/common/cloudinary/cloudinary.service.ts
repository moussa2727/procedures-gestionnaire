// common/cloudinary/cloudinary.service.ts
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

export interface UploadResult {
  publicId: string;
  url: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
}

export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
];
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor(private configService: ConfigService) {
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');

    if (!cloudName || !apiKey || !apiSecret) {
      this.logger.warn(
        'Variables Cloudinary manquantes. Vérifiez CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET',
      );
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });

    this.logger.log('Cloudinary configuré avec succès');
  }

  /**
   * Valide un fichier avant upload
   */
  validateFile(file: Express.Multer.File): void {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Type de fichier non autorisé. Types acceptés : ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `Fichier trop volumineux. Taille max : ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      );
    }
  }

  /**
   * Upload un fichier vers Cloudinary
   */
  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'destinations',
  ): Promise<UploadResult> {
    this.validateFile(file);

    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          public_id: uniqueId,
          folder,
          resource_type: 'auto',
          transformation: [{ quality: 'auto' }, { fetch_format: 'auto' }],
        },
        (error, result) => {
          if (error || !result) {
            this.logger.error('Upload échoué', error);
            reject(error || new Error('Upload failed'));
          } else {
            this.logger.debug(`Upload réussi: ${result.public_id}`);
            resolve({
              publicId: result.public_id,
              url: result.secure_url,
              width: result.width,
              height: result.height,
              format: result.format,
              bytes: result.bytes,
            });
          }
        },
      );

      const readableStream = new Readable();
      readableStream.push(file.buffer);
      readableStream.push(null);
      readableStream.pipe(uploadStream);
    });
  }

  /**
   * Génère une URL Cloudinary
   */
  getFileUrl(publicId: string): string {
    if (!publicId) return '';
    if (publicId.startsWith('http')) return publicId;
    if (publicId.startsWith('/images/')) return publicId;

    return cloudinary.url(publicId, {
      secure: true,
      quality: 'auto',
      fetch_format: 'auto',
    });
  }

  /**
   * Supprime un fichier de Cloudinary
   */
  async deleteFile(publicId: string): Promise<boolean> {
    if (!publicId) return false;

    try {
      const result = await cloudinary.uploader.destroy(publicId);
      const success = result.result === 'ok';
      if (success) {
        this.logger.log(`Fichier supprimé: ${publicId}`);
      } else {
        this.logger.warn(
          `Suppression partielle: ${publicId} - ${result.result}`,
        );
      }
      return success;
    } catch (error) {
      this.logger.error(`Erreur suppression: ${publicId}`, error);
      return false;
    }
  }

  /**
   * Supprime les fichiers orphelins de Cloudinary
   */
  async cleanupOrphanedFiles(validPublicIds: string[]): Promise<string[]> {
    try {
      const allCloudinaryIds: string[] = [];
      let nextCursor: string | undefined;

      do {
        const response: any = await cloudinary.api.resources({
          type: 'upload',
          prefix: 'destinations/',
          max_results: 500,
          ...(nextCursor ? { next_cursor: nextCursor } : {}),
        });

        const ids: string[] = (response.resources ?? []).map(
          (r: any) => r.public_id as string,
        );
        allCloudinaryIds.push(...ids);

        nextCursor = response.next_cursor;
      } while (nextCursor);

      const orphanedIds = allCloudinaryIds.filter(
        (id) => !validPublicIds.includes(id),
      );

      if (orphanedIds.length === 0) {
        this.logger.log('Aucun fichier orphelin trouvé');
        return [];
      }

      let deletedCount = 0;
      for (const id of orphanedIds) {
        const success = await this.deleteFile(id);
        if (success) deletedCount++;
      }

      this.logger.log(
        `${deletedCount}/${orphanedIds.length} fichiers orphelins supprimés`,
      );
      return orphanedIds;
    } catch (error) {
      this.logger.error('Erreur nettoyage fichiers orphelins', error);
      return [];
    }
  }
}
