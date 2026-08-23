export interface DestinationResponse {
  id: string;
  country: string;
  description: string;
  photo: string;
  photoPublicId?: string;
  photoMetadata?: unknown;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  activeConsultantsCount?: number;
}

// Photo jamais une URL — toujours un fichier uploadé, obligatoire à la création.
export interface CreateDestinationPayload {
  country: string;
  description: string;
  consultantIds: string[];
  imageFile: File;
}

export interface UpdateDestinationPayload {
  country?: string;
  description?: string;
  imageFile?: File;
}
