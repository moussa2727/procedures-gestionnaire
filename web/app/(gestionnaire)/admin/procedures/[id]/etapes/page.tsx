// app/(gestionnaire)/admin/procedures/[id]/etapes/page.tsx
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { LoadingState, EmptyState } from '@/src/components/common';
import { useProcedure, useUpdateStep, useCompleteProcedure, useRejectProcedure, useAddProcedureComment, useDeleteProcedureComment } from '@/src/hooks/use-procedure';
import type { ProcedureResponse, StepResponse, UpdateStepPayload, CommentResponse } from '@/src/types/procedure';
import { ProcedureStatus, StepStatus } from '@/src/types/enums';
import { ArrowLeft, CheckCircle2, XCircle, Clock, Send, Trash2, FileText } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';

export default function AdminProcedureEtapesPage() {
  const params = useParams();
  const procedureId = params.id as string;

  const { data: procedure, isLoading, error, refetch } = useProcedure(procedureId);
  const updateStepMutation = useUpdateStep(procedureId);
  const completeMutation = useCompleteProcedure();
  const rejectMutation = useRejectProcedure();
  const addCommentMutation = useAddProcedureComment(procedureId);
  const deleteCommentMutation = useDeleteProcedureComment(procedureId);
  const qc = useQueryClient();

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [commentText, setCommentText] = useState('');

  const target = procedure as ProcedureResponse | undefined;

  const handleUpdateStepStatus = async (stepId: string, status: StepStatus) => {
    try {
      await updateStepMutation.mutateAsync({ stepId, payload: { status } });
      toast.success('Étape mise à jour');
      refetch();
    } catch {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleComplete = async () => {
    if (!target) return;
    try {
      await completeMutation.mutateAsync(target.id);
      toast.success('Procédure terminée');
      refetch();
    } catch {
      toast.error('Erreur');
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
      toast.error('Erreur');
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
      toast.error('Erreur');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!target) return;
    try {
      await deleteCommentMutation.mutateAsync(commentId);
      toast.success('Commentaire supprimé');
      refetch();
    } catch {
      toast.error('Erreur');
    }
  };

  if (isLoading) return <LoadingState message="Chargement des étapes..." />;
  if (error || !target) return <div className="p-6 text-center text-sm text-red-600">Procédure introuvable</div>;

  const canModify = target.status === ProcedureStatus.IN_PROGRESS;

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4">
        <Link href={`/admin/procedures/${target.id}`} className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-sky-300 hover:text-sky-700">
          <ArrowLeft className="w-3.5 h-3.5" />
          Retour
        </Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Administration</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900">
            Étapes - Dossier #{target.numeroDossier}
          </h2>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
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
                      {canModify && (
                        <div className="flex items-center gap-1">
                          {step.status !== StepStatus.COMPLETED && (
                            <button type="button" onClick={() => handleUpdateStepStatus(step.id, StepStatus.COMPLETED)} disabled={updateStepMutation.isPending} className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-semibold rounded-md transition-colors">Valider</button>
                          )}
                          {step.status !== StepStatus.IN_PROGRESS && step.status !== StepStatus.COMPLETED && (
                            <button type="button" onClick={() => handleUpdateStepStatus(step.id, StepStatus.IN_PROGRESS)} disabled={updateStepMutation.isPending} className="px-2 py-1 bg-sky-600 hover:bg-sky-700 text-white text-[10px] font-semibold rounded-md transition-colors">Démarrer</button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  {step.rejectionReason && step.status === StepStatus.REJECTED && (
                    <p className="mt-2 text-xs text-red-600 ml-10"><span className="font-medium">Motif :</span> {step.rejectionReason}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 mb-4">Commentaires</h3>
            <div className="space-y-3 mb-4">
              {target.comments && target.comments.length > 0 ? (
                target.comments.map((c: CommentResponse) => (
                  <div key={c.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-800">Note</p>
                      <p className="mt-1 text-slate-700 whitespace-pre-wrap">{c.content}</p>
                      <p className="mt-1 text-[10px] text-slate-400">{new Date(c.createdAt).toLocaleString('fr-FR')}</p>
                    </div>
                    <button type="button" onClick={() => handleDeleteComment(c.id)} disabled={deleteCommentMutation.isPending} className="text-red-500 hover:text-red-700 p-1 transition-colors" title="Supprimer">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">Aucun commentaire.</p>
              )}
            </div>
            <div className="flex gap-2">
              <input type="text" value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Ajouter un commentaire..." className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-sky-500" onKeyDown={(e) => { if (e.key === 'Enter') handleAddComment(); }} />
              <button type="button" onClick={handleAddComment} disabled={addCommentMutation.isPending || !commentText.trim()} className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5" /> Envoyer
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 mb-4">Actions</h3>
            <div className="space-y-2">
              {canModify && (
                <>
                  <button type="button" onClick={handleComplete} disabled={completeMutation.isPending} className="w-full px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Terminer
                  </button>
                  <button type="button" onClick={() => setShowRejectModal(true)} disabled={rejectMutation.isPending} className="w-full px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2">
                    <XCircle className="w-4 h-4" /> Rejeter
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
