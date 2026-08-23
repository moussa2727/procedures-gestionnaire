import { Opinion, RendezvousStatus, TimeSlot } from './enums';

export interface RendezVousResponse {
  id: string;
  studentId: string;
  consultantId: string;
  destinationId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  sector: string;
  studyLevel: string;
  date: string;
  time: TimeSlot;
  status: RendezvousStatus;
  opinion?: Opinion | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRendezVousPayload {
  consultantId: string;
  destinationId: string;
  date: string;
  time: TimeSlot;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  sector: string;
  studyLevel: string;
}

export interface RescheduleRendezVousPayload {
  date: string;
  time: TimeSlot;
}

export interface CancelRendezVousPayload {
  reason?: string;
}

export interface SetOpinionPayload {
  opinion: Opinion;
}

