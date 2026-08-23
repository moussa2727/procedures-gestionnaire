// app/(gestionnaire)/admin/contacts/page.tsx
'use client';

import React, { useState } from 'react';
import {
  useContacts,
  useContactStatistics,
  useContactUnreadCount,
  useMarkAllContactsAsRead,
  useMarkContactAsRead,
  useArchiveContact,
  useRemoveContact,
  useContactsRealtime,
} from '@/src/hooks/use-contacts';
import { contactService } from '@/src/services/contact.service';
import { extractErrorMessage } from '@/src/lib/api-client';
import { contactKeys } from '@/src/hooks/use-contacts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AdminContactList, AdminContactReplyModal } from '@/src/components/admin/contacts';
import type { ContactResponse } from '@/src/types/contact';

export default function AdminContactsPage() {
  const [replyingContact, setReplyingContact] = useState<ContactResponse | null>(null);

  // 1. Activer temps réel
  useContactsRealtime();

  // 2. Récupérer données
  const { data: contactsData, isLoading: isLoadingContacts, refetch: refetchContacts } = useContacts();
  const { data: statistics, isLoading: isLoadingStats, refetch: refetchStats } = useContactStatistics();
  const { refetch: refetchUnread } = useContactUnreadCount();

  const markAllReadMutation = useMarkAllContactsAsRead();
  const markAsReadMutation = useMarkContactAsRead();
  const archiveMutation = useArchiveContact();
  const deleteMutation = useRemoveContact();

  const qc = useQueryClient();
  const replyMutation = useMutation({
    mutationFn: ({ contactId, reply }: { contactId: string; reply: string }) =>
      contactService.reply(contactId, { reply }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: contactKeys.all });
      toast.success('Réponse envoyée');
    },
    onError: (e) => toast.error(extractErrorMessage(e).message),
  });

  const contacts = Array.isArray(contactsData)
    ? contactsData
    : (contactsData as any)?.data || [];

  const handleRefresh = () => {
    refetchContacts();
    refetchStats();
    refetchUnread();
  };

  const handleMarkAsRead = (contact: ContactResponse) => {
    markAsReadMutation.mutate(contact.id);
  };

  const handleMarkAllAsRead = () => {
    markAllReadMutation.mutate();
  };

  const handleReplyClick = (contact: ContactResponse) => {
    setReplyingContact(contact);
  };

  const handleReplySubmit = async (reply: string) => {
    if (!replyingContact) return;
    await replyMutation.mutateAsync({ contactId: replyingContact.id, reply });
    setReplyingContact(null);
  };

  const handleArchive = (contact: ContactResponse) => {
    archiveMutation.mutate(contact.id);
  };

  const handleDelete = (contact: ContactResponse) => {
    deleteMutation.mutate(contact.id);
  };

  return (
    <div className="space-y-6">
      <AdminContactList
        contacts={contacts}
        statistics={statistics || null}
        isLoading={isLoadingContacts || isLoadingStats}
        onRefresh={handleRefresh}
        onMarkAsRead={handleMarkAsRead}
        onMarkAllAsRead={handleMarkAllAsRead}
        onReply={handleReplyClick}
        onArchive={handleArchive}
        onDelete={handleDelete}
      />

      {replyingContact && (
        <AdminContactReplyModal
          isOpen={true}
          onClose={() => setReplyingContact(null)}
          contact={replyingContact}
          onReply={handleReplySubmit}
          isPending={replyMutation.isPending}
        />
      )}
    </div>
  );
}

