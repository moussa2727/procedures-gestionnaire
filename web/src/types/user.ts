import { TimeSlot, UserRole } from './enums';

export interface UserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  photo: string;
  photoPublicId?: string;
  role: UserRole;
  isActive: boolean;
  isDeleted: boolean;
  isOnline: boolean;
  lastSeen?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConsultantSemiPublicProfile {
  id: string;
  firstName: string;
  lastName: string;
  photo: string;
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
  createdAt: string;
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

export interface UserStatistics {
  total: number;
  byRole: { ETUDIANT: number; CONSULTANT: number; ADMIN: number };
  active: number;
  inactive: number;
  online: number;
  newThisMonth: number;
  newThisWeek: number;
  generatedAt: string;
}

export interface SessionResponse {
  id: string;
  deviceInfo?: string | null;
  ipAddress?: string | null;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

export interface ConsultantStudent {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  photo: string;
}

export interface CreateUserPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: UserRole.CONSULTANT | UserRole.ETUDIANT;
  isActive?: boolean;
}

export interface UpdateUserPayload {
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  isActive?: boolean;
}

export interface UpdateProfilePayload {
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export interface UsersQuery {
  page?: number;
  limit?: number;
  role?: UserRole;
  isActive?: boolean;
  isDeleted?: boolean;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateReviewPayload {
  rating: number;
  comment?: string;
}

export interface RespondReviewPayload {
  response: string;
}

export interface ModerateReviewPayload {
  reason: string;
}
