// app/(gestionnaire)/admin/utilisateurs/page.tsx
'use client';

import React, { useState } from 'react';
import {
  useUsers,
  useUserStatistics,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useToggleUserStatus,
  usePromoteToConsultant,
  useUsersRealtime,
} from '@/src/hooks/use-users';
import {
  AdminUserList,
  AdminUserCreateModal,
  AdminUserEditModal,
} from '@/src/components/admin/users';
import type { UserResponse, CreateUserPayload, UpdateUserPayload } from '@/src/types/user';

export default function AdminUtilisateursPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserResponse | null>(null);

  // 1. Activer temps réel
  useUsersRealtime();

  // 2. Récupérer les données
  const { data: usersData, isLoading: isLoadingUsers, refetch: refetchUsers } = useUsers();
  const { data: stats, isLoading: isLoadingStats, refetch: refetchStats } = useUserStatistics();

  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser(editingUser?.id || '');
  const deleteMutation = useDeleteUser();
  const toggleStatusMutation = useToggleUserStatus();
  const promoteMutation = usePromoteToConsultant();

  const users: UserResponse[] = Array.isArray(usersData)
    ? usersData
    : (usersData as any)?.items || [];

  const handleRefresh = () => {
    refetchUsers();
    refetchStats();
  };

  const handleCreateSubmit = async (values: any) => {
    await createMutation.mutateAsync(values as CreateUserPayload);
    setIsCreateOpen(false);
  };

  const handleUpdateSubmit = async (values: any) => {
    if (!editingUser) return;
    await updateMutation.mutateAsync(values as UpdateUserPayload);
    setEditingUser(null);
  };

  const handleToggleStatus = (user: UserResponse) => {
    toggleStatusMutation.mutate({ id: user.id, isActive: !user.isActive });
  };

  const handlePromote = (user: UserResponse) => {
    promoteMutation.mutate(user.id);
  };

  const handleDelete = (user: UserResponse) => {
    deleteMutation.mutate(user.id);
  };

  return (
    <div className="space-y-6">
      <AdminUserList
        users={users}
        statistics={stats || null}
        isLoading={isLoadingUsers || isLoadingStats}
        onRefresh={handleRefresh}
        onCreate={() => setIsCreateOpen(true)}
        onEdit={(u) => setEditingUser(u)}
        onToggleStatus={handleToggleStatus}
        onPromoteToConsultant={handlePromote}
        onDelete={handleDelete}
      />

      {isCreateOpen && (
        <AdminUserCreateModal
          isOpen={true}
          onClose={() => setIsCreateOpen(false)}
          onCreate={handleCreateSubmit}
          isPending={createMutation.isPending}
        />
      )}

      {editingUser && (
        <AdminUserEditModal
          isOpen={true}
          onClose={() => setEditingUser(null)}
          user={editingUser}
          onUpdate={handleUpdateSubmit}
          isPending={updateMutation.isPending}
        />
      )}
    </div>
  );
}

