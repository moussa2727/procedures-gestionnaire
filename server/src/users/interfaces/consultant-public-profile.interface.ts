// users/interfaces/consultant-public-profile.interface.ts

import { TimeSlot } from '@prisma/client';

export interface ConsultantSemiPublicProfile {
  id: string;
  firstName: string;
  lastName: string;
  photo: string;
}

export interface ConsultantPublicProfile {
  id: string;
  firstName: string;
  lastName: string;
  photo: string;
  destinations: ConsultantDestinationPublic[];
  stats: ConsultantStatsPublic;
  availability: ConsultantAvailabilityPublic[];
  reviews: ConsultantReviewPublic[];
}

export interface ConsultantDestinationPublic {
  id: string;
  country: string;
}

export interface ConsultantStatsPublic {
  totalAppointments: number;
  rating: number;
  totalReviews: number;
}

export interface ConsultantAvailabilityPublic {
  date: string;
  availableSlots: TimeSlot[];
}

export interface ConsultantReviewPublic {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
}
