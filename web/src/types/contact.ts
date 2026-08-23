import { ContactStatus } from './enums';

export interface ContactResponse {
  id: string;
  name?: string | null;
  email: string;
  message: string;
  status: ContactStatus;
  reply?: string | null;
  repliedAt?: string | null;
  repliedById?: string | null;
  reminderSentAt?: string | null;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  userId?: string | null;
  ipAddress?: string | null;
  website?: string | null;
  emailSent?: boolean;
  adminNotified?: boolean;
  replyEmailSent?: boolean;
  deletedAt?: string | null;
}

export interface CreateContactPayload {
  name?: string;
  email: string;
  message: string;
  website?: string;
}

export interface ReplyContactPayload {
  reply: string;
}

export interface FilterContactQuery {
  search?: string;
  status?: ContactStatus;
  page?: number;
  limit?: number;
}

export interface BulkOperationPayload {
  ids: string[];
  permanent?: boolean;
}

export interface ContactStatistics {
  total: number;
  unread: number;
  replied: number;
  pending: number;
  archived: number;
  responseRate: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
  generatedAt: string;
}
