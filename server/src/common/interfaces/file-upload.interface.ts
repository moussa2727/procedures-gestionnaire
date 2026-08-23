// common/interfaces/file-upload.interface.ts
import { Readable } from 'stream';

/**
 * Interface pour les fichiers uploadés (Multer)
 */
export interface UploadedFile {
  /** Nom du champ du formulaire */
  fieldname: string;

  /** Nom original du fichier */
  originalname: string;

  /** Encodage du fichier */
  encoding: string;

  /** Type MIME du fichier */
  mimetype: string;

  /** Taille du fichier en bytes */
  size: number;

  /** Buffer contenant les données du fichier (memoryStorage) */
  buffer: Buffer;

  /** Chemin de destination (diskStorage) - optionnel */
  destination?: string;

  /** Nom du fichier (diskStorage) - optionnel */
  filename?: string;

  /** Chemin complet (diskStorage) - optionnel */
  path?: string;

  /** Stream du fichier */
  stream?: Readable;
}

/**
 * Interface pour la configuration d'upload
 */
export interface UploadConfig {
  /** Dossier de destination */
  destination?: string;

  /** Types MIME autorisés */
  allowedMimeTypes?: string[];

  /** Taille maximale en bytes */
  maxFileSize?: number;

  /** Nombre maximal de fichiers */
  maxFiles?: number;
}

/**
 * Interface pour le résultat d'upload Cloudinary
 */
export interface CloudinaryUploadResult {
  /** Identifiant public Cloudinary */
  publicId: string;

  /** URL sécurisée du fichier */
  url: string;

  /** Largeur de l'image (si image) */
  width?: number;

  /** Hauteur de l'image (si image) */
  height?: number;

  /** Format du fichier */
  format?: string;

  /** Taille en bytes */
  bytes?: number;

  /** Type de ressource (image, video, raw) */
  resourceType?: string;

  /** Date de création */
  createdAt?: string;
}

/**
 * Interface pour la suppression de fichier
 */
export interface DeleteFileResult {
  /** Succès de l'opération */
  success: boolean;

  /** Message d'information */
  message?: string;

  /** ID public supprimé (Cloudinary) ou nom de fichier */
  identifier?: string;
}

/**
 * Interface pour la réponse d'upload
 */
export interface UploadResponse {
  /** Message de succès */
  message: string;

  /** Données du fichier uploadé */
  file: {
    /** Identifiant unique */
    id?: string;

    /** Nom original */
    originalName: string;

    /** Nom final */
    fileName: string;

    /** Chemin ou URL */
    path: string;

    /** URL complète d'accès */
    url: string;

    /** Type MIME */
    mimetype: string;

    /** Taille en bytes */
    size: number;

    /** Métadonnées additionnelles */
    metadata?: Record<string, any>;
  };
}

/**
 * Interface pour les options de transformation d'image
 */
export interface ImageTransformation {
  /** Largeur souhaitée */
  width?: number;

  /** Hauteur souhaitée */
  height?: number;

  /** Mode de recadrage (fill, fit, scale, etc.) */
  crop?: 'fill' | 'fit' | 'scale' | 'thumb' | 'crop';

  /** Qualité (1-100 ou 'auto') */
  quality?: number | 'auto';

  /** Format de sortie */
  format?: 'jpg' | 'png' | 'webp' | 'avif';

  /** Gravité pour le recadrage */
  gravity?: 'center' | 'north' | 'south' | 'east' | 'west' | 'face';

  /** Niveau de flou */
  blur?: number;

  /** Niveau de netteté */
  sharpen?: number;

  /** Rotation en degrés */
  angle?: number;

  /** Opacité (0-100) */
  opacity?: number;
}

/**
 * Interface pour les options d'upload Cloudinary
 */
export interface CloudinaryUploadOptions {
  /** Dossier de destination */
  folder?: string;

  /** ID public personnalisé */
  publicId?: string;

  /** Transformations à appliquer */
  transformations?: ImageTransformation[];

  /** Remplacer si existant */
  overwrite?: boolean;

  /** Types de ressources autorisés */
  resourceType?: 'auto' | 'image' | 'video' | 'raw';

  /** Tags associés au fichier */
  tags?: string[];

  /** Métadonnées contextuelles */
  context?: Record<string, string>;
}

/**
 * Interface pour le nettoyage des fichiers orphelins
 */
export interface CleanupResult {
  /** Nombre de fichiers supprimés */
  deletedCount: number;

  /** Liste des fichiers supprimés */
  deletedFiles: string[];

  /** Fichiers non supprimés */
  failedFiles?: string[];
}

/**
 * Interface pour la validation de fichier
 */
export interface FileValidation {
  /** Type MIME valide */
  isValidMimeType: boolean;

  /** Taille valide */
  isValidSize: boolean;

  /** Extension valide */
  isValidExtension: boolean;

  /** Erreurs de validation */
  errors?: string[];
}

/**
 * Interface pour la réponse WebSocket (broadcast)
 */
export interface FileUploadEvent {
  /** Type d'événement */
  event:
    'upload-start' | 'upload-progress' | 'upload-complete' | 'upload-error';

  /** Identifiant du fichier */
  fileId?: string;

  /** Nom du fichier */
  fileName?: string;

  /** Progression (0-100) */
  progress?: number;

  /** URL du fichier uploadé */
  url?: string;

  /** Message d'erreur */
  error?: string;

  /** Timestamp */
  timestamp: Date;
}

/**
 * Interface pour les statistiques de stockage
 */
export interface StorageStats {
  /** Espace total utilisé en bytes */
  totalUsed: number;

  /** Nombre total de fichiers */
  totalFiles: number;

  /** Types de fichiers présents */
  fileTypes: Record<string, number>;

  /** Espace restant (si limité) */
  remainingSpace?: number;

  /** Limite maximale (si définie) */
  maxAllowed?: number;
}

/**
 * Constantes pour les configurations d'upload
 */
export const UPLOAD_CONSTANTS = {
  /** Types MIME d'images acceptés */
  IMAGE_MIME_TYPES: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/avif',
    'image/svg+xml',
  ],

  /** Types MIME de documents acceptés */
  DOCUMENT_MIME_TYPES: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],

  /** Extensions de fichiers valides */
  VALID_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.svg', '.pdf'],

  /** Taille maximale par défaut (5MB) */
  DEFAULT_MAX_SIZE: 5 * 1024 * 1024,

  /** Taille maximale pour les avatars (1MB) */
  AVATAR_MAX_SIZE: 1 * 1024 * 1024,

  /** Taille maximale pour les documents (10MB) */
  DOCUMENT_MAX_SIZE: 10 * 1024 * 1024,

  /** Nombre maximal de fichiers en batch */
  BATCH_MAX_FILES: 10,

  /** Dossiers par défaut */
  DEFAULT_FOLDERS: {
    DESTINATIONS: 'destinations',
    PROFILES: 'profiles',
    DOCUMENTS: 'documents',
  },
} as const;

/**
 * Type helper pour les réponses d'upload
 */
export type UploadResponseType<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: Record<string, any>;
};

/**
 * Type helper pour les callbacks de progression d'upload
 */
export type UploadProgressCallback = (
  progress: number,
  file: UploadedFile,
) => void;

/**
 * Interface pour le service d'upload générique
 */
export interface IUploadService {
  /**
   * Upload d'un seul fichier
   */
  uploadFile(
    file: UploadedFile,
    options?: CloudinaryUploadOptions,
  ): Promise<CloudinaryUploadResult>;

  /**
   * Upload de multiples fichiers
   */
  uploadMultiple(
    files: UploadedFile[],
    options?: CloudinaryUploadOptions,
  ): Promise<CloudinaryUploadResult[]>;

  /**
   * Suppression d'un fichier
   */
  deleteFile(identifier: string): Promise<DeleteFileResult>;

  /**
   * Récupération de l'URL d'un fichier
   */
  getFileUrl(
    identifier: string,
    transformations?: ImageTransformation,
  ): Promise<string>;

  /**
   * Validation d'un fichier
   */
  validateFile(
    file: UploadedFile,
    allowedTypes?: string[],
    maxSize?: number,
  ): FileValidation;

  /**
   * Nettoyage des fichiers orphelins
   */
  cleanupOrphanedFiles(validIdentifiers: string[]): Promise<CleanupResult>;
}
