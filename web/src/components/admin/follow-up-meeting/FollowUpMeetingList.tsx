'use client';

import { FollowUpMeetingCard } from './FollowUpMeetingCard';
import { EmptyState, LoadingState } from '../../common';
import type { FollowUpMeetingResponse } from '@/src/types/follow-up-meeting';

interface FollowUpMeetingListProps {
  meetings: FollowUpMeetingResponse[];
  isLoading: boolean;
  getDestinationName: (id: string) => string;
  getConsultantName: (id: string) => string;
  getStudentName: (meeting: FollowUpMeetingResponse) => string;
  getProcedureNumber: (id: string) => string;
  getProcedureDestination: (id: string) => string | null;
  expandedId: string | null;
  onToggleExpand: (id: string) => void;
  onCancel?: (meeting: FollowUpMeetingResponse) => void;
  onReschedule?: (meeting: FollowUpMeetingResponse) => void;
  onComplete?: (meeting: FollowUpMeetingResponse) => void;
  canModify?: boolean;
  isConsultant?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
}

export function FollowUpMeetingList({
  meetings,
  isLoading,
  getDestinationName,
  getConsultantName,
  getStudentName,
  getProcedureNumber,
  getProcedureDestination,
  expandedId,
  onToggleExpand,
  onCancel,
  onReschedule,
  onComplete,
  canModify = true,
  isConsultant = false,
  emptyTitle = 'Aucun rendez-vous de suivi trouvé',
  emptyDescription = 'Aucun rendez-vous ne correspond à vos critères.',
  className = '',
}: FollowUpMeetingListProps) {
  if (isLoading) {
    return <LoadingState message="Chargement de vos rendez-vous de suivi..." />;
  }

  if (meetings.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className={`space-y-3.5 ${className}`}>
      {meetings.map((meeting) => {
        const isExpanded = expandedId === meeting.id;
        const destId = getProcedureDestination(meeting.procedureId);
        const destName = destId ? getDestinationName(destId) : 'Procédure';
        const consultantName = getConsultantName(meeting.consultantId);
        const studentName = getStudentName(meeting);
        const procedureNumber = getProcedureNumber(meeting.procedureId);
        const canComplete = meeting.status === 'CONFIRMED';

        return (
          <FollowUpMeetingCard
            key={meeting.id}
            meeting={meeting}
            destinationName={destName}
            consultantName={consultantName}
            studentName={studentName}
            procedureNumber={procedureNumber}
            isExpanded={isExpanded}
            onToggleExpand={() => onToggleExpand(meeting.id)}
            onCancel={onCancel ? () => onCancel(meeting) : undefined}
            onReschedule={onReschedule ? () => onReschedule(meeting) : undefined}
            onComplete={onComplete && canComplete ? () => onComplete(meeting) : undefined}
            canModify={canModify}
            canComplete={canComplete}
            isConsultant={isConsultant}
          />
        );
      })}
    </div>
  );
}