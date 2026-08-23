'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { LoadingState, EmptyState, ConfirmationModal } from '@/src/components/common';
import { useProcedure, useUpdateStep, useCompleteProcedure, useRejectProcedure, useAddProcedureComment, useDeleteProcedureComment } from '@/src/hooks/use-procedure';
import { useFollowUpMeetingsForProcedure } from '@/src/hooks/use-follow-up-meeting';
import type { ProcedureResponse, StepResponse, UpdateStepPayload, CommentResponse } from '@/src/types/procedure';
import type { FollowUpMeetingResponse } from '@/src/types/follow-up-meeting';
import { ProcedureStatus, StepStatus } from '@/src/types/enums';
import { FileText, User, MapPin, Calendar, CheckCircle2, XCircle, Clock, Info, ArrowLeft, Trash2, MessageSquare, Send, Plus } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';

export default function AdminProcedureDetailPage() {
  const params = useParams();
  const procedureId = params.id as string;

  const { data: procedure, isLoading, error, refetch } = useProcedure(procedureId);
  const { data: followUps, isLoading: isLoadingFollowUps } = useFollowUpMeetingsForProcedure(procedureId);
  const updateStepMutation = useUpdateStep(procedureId);
  const completeMutation = useCompleteProcedure();
  const rejectMutation = useRejectProcedure();
  const addCommentMutation = useAddProcedureComment(procedureId);
  const deleteCommentMutation = useDeleteProcedureComment(procedureId);

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [commentText, setCommentText] = useState('');

  const target = procedure as ProcedureResponse | undefined;
  const followUpList: FollowUpMeetingResponse[] = followUps || [];

  const handleUpdateStepStatus = async (stepId: string, status: StepStatus) => {
    try {
      await updateStepMutation.mutateAsync({
        stepId,
        payload: { status },
      });
      toast.success('Statut de l\'étape mis à jour');
      refetch();
    } catch {
      toast.error('Erreur lors de la mise à jour de l\'étape');
    }
  };

  const handleComplete = async () => {
    if (!target) return;
    try {
      await completeMutation.mutateAsync(target.id);
      toast.success('Procédure clôturée avec succès');
      refetch();
    } catch {
      toast.error('Erreur lors de la clôture de la procédure');
    }
  };

  const handleReject = async () => {
    if (!target || !rejectionReason.trim()) return;
    try {
      await rejectMutation.mutateAsync({ id: procedureId, reason: rejectionReason.trim() });
      toast.success('Procédure rejetée');
      setShowRejectModal(false);
      setRejectionReason('');
      refetch();
    } catch {
      toast.error('Erreur lors du rejet');
    }
  };

  const handleAddComment = async () => {
    if (!target || !commentText.trim()) return;
    try {
      await addCommentMutation.mutateAsync({ content: commentText.trim() });
      toast.success('Commentaire ajouté');
      setCommentText('');
      refetch();
    } catch {
      toast.error('Erreur lors de l\'ajout du commentaire');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!target) return;
    try {
      await deleteCommentMutation.mutateAsync(commentId);
      toast.success('Commentaire supprimé');
      refetch();
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  if (isLoading) return <LoadingState message="Chargement de la procédure..." />;
  if (error || !target) return <div className="p-6 text-center text-sm text-red-600">Procédure introuvable</div>;

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4">
        <Link href="/admin/procedures" className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-sky-300 hover:text-sky-700">
          <ArrowLeft className="w-3.5 h-3.5" />
          Retour
        </Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Administration</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900">
            Dossier #{target.numeroDossier}
          </h2>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Étapes */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-base font-bold text-slate-900">Étapes de la procédure</h3>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                target.status === ProcedureStatus.IN_PROGRESS ? 'bg-sky-50 text-sky-700 border-sky-200' :
                target.status === ProcedureStatus.COMPLETED ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                target.status === ProcedureStatus.REJECTED ? 'bg-red-50 text-red-700 border-red-200' :
                'bg-slate-50 text-slate-700 border-slate-200'
              }`}>
                {target.status}
              </span>
            </div>

            <div className="space-y-3">
              {target.steps?.map((step: StepResponse, index: number) => (
                <div key={step.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-white border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                        {index + 1}
                      </div>
                      <span className="text-sm font-semibold text-slate-900">{step.stepName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${
                        step.status === StepStatus.COMPLETED ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        step.status === StepStatus.REJECTED ? 'bg-red-50 text-red-700 border-red-200' :
                        step.status === StepStatus.IN_PROGRESS ? 'bg-sky-50 text-sky-700 border-sky-200' :
                        'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {step.status}
                      </span>
                      {target.status === ProcedureStatus.IN_PROGRESS && (
                        <div className="flex items-center gap-1">
                          {step.status !== StepStatus.COMPLETED && (
                            <button
                              type="button"
                              onClick={() => handleUpdateStepStatus(step.id, StepStatus.COMPLETED)}
                              disabled={updateStepMutation.isPending}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-semibold rounded-md transition-colors"
                            >
                              Valider
                            </button>
                          )}
                          {step.status !== StepStatus.IN_PROGRESS && step.status !== StepStatus.COMPLETED && (
                            <button
                              type="button"
                              onClick={() => handleUpdateStepStatus(step.id, StepStatus.IN_PROGRESS)}
                              disabled={updateStepMutation.isPending}
                              className="px-2 py-1 bg-sky-600 hover:bg-sky-700 text-white text-[10px] font-semibold rounded-md transition-colors"
                            >
                              Démarrer
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  {step.rejectionReason && step.status === StepStatus.REJECTED && (
                    <p className="mt-2 text-xs text-red-600 ml-10">
                      <span className="font-medium">Motif du rejet :</span> {step.rejectionReason}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Rendez-vous de suivi liés */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 mb-4">Rendez-vous de suivi liés</h3>
            {isLoadingFollowUps ? (
              <LoadingState message="Chargement des rendez-vous de suivi..." />
            ) : followUpList.length === 0 ? (
              <p className="text-sm text-slate-500">Aucun rendez-vous de suivi planifié pour cette procédure.</p>
            ) : (
              <div className="space-y-2">
                {followUpList.map((meeting: FollowUpMeetingResponse) => (
                  <div key={meeting.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-sky-600" />
                      <div>
                        <p className="font-medium text-slate-900">Le {meeting.date} à {meeting.time}</p>
                        <p className="text-slate-500">Statut : {meeting.status}</p>
                      </div>
                    </div>
                    {meeting.reason && (
                      <span className="text-slate-600">{meeting.reason}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Commentaires */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 mb-4">Commentaires et notes</h3>
            <div className="space-y-3 mb-4">
                {target.comments && target.comments.length > 0 ? (
                target.comments.map((c: CommentResponse) => (
                  <div key={c.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-800">Utilisateur</p>
                      <p className="mt-1 text-slate-700 whitespace-pre-wrap">{c.content}</p>
                      <p className="mt-1 text-[10px] text-slate-400">{new Date(c.createdAt).toLocaleString('fr-FR')}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteComment(c.id)}
                      disabled={deleteCommentMutation.isPending}
                      className="text-red-500 hover:text-red-700 p-1 transition-colors"
                      title="Supprimer le commentaire"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">Aucun commentaire pour le moment.</p>
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Ajouter un commentaire..."
                className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-sky-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddComment();
                }}
              />
              <button
                type="button"
                onClick={handleAddComment}
                disabled={addCommentMutation.isPending || !commentText.trim()}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                Envoyer
              </button>
            </div>
          </div>
        </div>

        {/* Colonne latérale Actions & Résumé */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 mb-4">Actions administrateur</h3>
            <div className="space-y-2">
              {target.status === ProcedureStatus.IN_PROGRESS && (
                <>
                  <button
                    type="button"
                    onClick={handleComplete}
                    disabled={completeMutation.isPending}
                    className="w-full px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Clôturer la procédure
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRejectModal(true)}
                    disabled={rejectMutation.isPending}
                    className="w-full px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
                  >
                    <XCircle className="w-4 h-4" />
                    Rejeter la procédure
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 mb-4">Informations</h3>
            <div className="space-y-3 text-xs text-slate-600">
              <div>
                <span className="font-semibold text-slate-700 uppercase tracking-wider text-[10px]">Créée le</span>
                <p className="mt-0.5 text-slate-900 font-medium">{new Date(target.createdAt).toLocaleDateString('fr-FR')}</p>
              </div>
              {target.updatedAt && (
                <div>
                  <span className="font-semibold text-slate-700 uppercase tracking-wider text-[10px]">Dernière mise à jour</span>
                  <p className="mt-0.5 text-slate-900 font-medium">{new Date(target.updatedAt).toLocaleDateString('fr-FR')}</p>
                </div>
              )}
              {target.cancellationReason && target.status === ProcedureStatus.REJECTED && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700">
                  <span className="font-semibold">Motif du rejet :</span>
                  <p className="mt-1">{target.cancellationReason}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        onConfirm={handleReject}
        title="Rejeter la procédure"
        subtitle="Veuillez indiquer le motif du rejet de cette procédure."
        confirmLabel="Rejeter"
        variant="danger"
      >
        <textarea
          value={rejectionReason}
          onChange={(e) => setRejectionReason(e.target.value)}
          placeholder="Ex: Documents non conformes ou conditions non remplies..."
          rows={3}
          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-sky-500 mt-2"
        />
      </ConfirmationModal>
    </div>
  );
}
