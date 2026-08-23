import { MeetingCreator, MeetingStatus, TimeSlot } from './enums';

export interface FollowUpMeetingResponse {
  id: string;
  procedureId: string;
  consultantId: string;
  studentId: string;
  date: string;
  time: TimeSlot;
  createdBy: MeetingCreator;
  status: MeetingStatus;
  reason?: string | null;
  reminderSentAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFollowUpMeetingPayload {
  procedureId: string;
  date: string;
  time: TimeSlot;
  reason?: string;
}

export interface RescheduleFollowUpMeetingPayload {
  date: string;
  time: TimeSlot;
}

export interface CancelFollowUpMeetingPayload {
  reason?: string;
}
