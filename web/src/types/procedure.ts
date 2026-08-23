import { ProcedureStatus, StepStatus } from './enums';

export interface StepResponse {
  id: string;
  stepName: string;
  orderIndex: number;
  status: StepStatus;
  rejectionReason?: string | null;
  cascadeCancelledFromStepId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CommentResponse {
  id: string;
  authorId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProcedureResponse {
  id: string;
  numeroDossier: string;
  rendezVousId: string;
  studentId: string;
  consultantId: string;
  destinationId: string;
  status: ProcedureStatus;
  cancellationReason?: string | null;
  createdAt: string;
  updatedAt: string;
  steps?: StepResponse[];
  comments?: CommentResponse[];
}

export interface CreateProcedurePayload {
  rendezVousId: string;
  stepNames: string[];
}

export interface UpdateStepPayload {
  status: StepStatus;
  rejectionReason?: string;
}

export interface RejectProcedurePayload {
  reason: string;
}

export interface CancelProcedurePayload {
  reason: string;
}

export interface CreateCommentPayload {
  content: string;
}
