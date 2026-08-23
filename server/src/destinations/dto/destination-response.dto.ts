import { ApiProperty } from '@nestjs/swagger';

export class DestinationPhotoMetadataDto {
  @ApiProperty({ required: false })
  width?: number;

  @ApiProperty({ required: false })
  height?: number;

  @ApiProperty({ required: false })
  format?: string;

  @ApiProperty({ required: false })
  bytes?: number;
}

export class DestinationResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  country!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty()
  photo!: string;

  @ApiProperty({ required: false })
  photoPublicId?: string;

  @ApiProperty({ required: false, type: DestinationPhotoMetadataDto })
  photoMetadata?: unknown;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty()
  isDeleted!: boolean;

  @ApiProperty({
    required: false,
    description: 'Nombre de consultants actifs affectés',
  })
  activeConsultantsCount?: number;
}
