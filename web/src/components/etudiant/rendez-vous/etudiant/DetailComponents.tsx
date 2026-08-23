'use client';

import React from 'react';
import { Calendar, Clock, MapPin, User, Mail, Phone, GraduationCap, Briefcase, ArrowLeft, XCircle, CalendarDays, FileCheck2 } from 'lucide-react';

import { LoadingState, EmptyState, StatusBadge, OpinionBadge, ConfirmationModal, RescheduleModal } from '@/src/components/common';

import { TIME_SLOT_LABELS, RendezvousStatus, TimeSlot } from '@/src/types/enums';
import type { RendezVousResponse } from '@/src/types/rendez-vous';
import type { ConsultantSemiPublicProfile } from '@/src/types/user';
import type { DestinationResponse } from '@/src/types/destination';

import { formatFrenchDate, formatDateTime } from '@/src/lib/date-helpers';

interface InfoCardProps {
  title: string;
  items: { icon: any; label: string; value: string }[];
}

export function InfoCard({ title, items }: InfoCardProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
      <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2">
        {title}
      </h2>
      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={index} className="flex items-start gap-3">
            <item.icon className="w-4 h-4 text-slate-400 mt-0.5" />
            <div>
              <p className="text-xs text-slate-400">{item.label}</p>
              <p className="font-medium text-slate-900">{item.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface DetailRowProps {
  icon: any;
  label: string;
  value: string;
}

export function DetailRow({ icon: Icon, label, value }: DetailRowProps) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="w-4 h-4 text-slate-400 mt-0.5" />
      <div>
        <p className="text-xs text-slate-400">{label}</p>
        <p className="font-medium text-slate-900">{value}</p>
      </div>
    </div>
  );
}

interface InfoPillProps {
  label: string;
  value: string;
}

export function InfoPill({ label, value }: InfoPillProps) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="font-mono text-sm text-slate-900">{value}</p>
    </div>
  );
}
