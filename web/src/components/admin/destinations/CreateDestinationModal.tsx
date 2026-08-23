// components/destinations/CreateDestinationModal.tsx
'use client';

import React, { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Upload,
  X,
  Image as ImageIcon,
  AlertCircle,
  Check,
  Building2,
  Users,
} from 'lucide-react';
import { Modal } from '@/src/components/common';
import {
  createDestinationSchema,
  type CreateDestinationFormValues,
} from '@/src/schemas/destination.schema';
import type { ConsultantSemiPublicProfile } from '@/src/types/user';

interface CreateDestinationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (values: CreateDestinationFormValues) => Promise<void>;
  consultants: ConsultantSemiPublicProfile[];
  isPending?: boolean;
}

export function CreateDestinationModal({
  isOpen,
  onClose,
  onCreate,
  consultants,
  isPending = false,
}: CreateDestinationModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid },
    reset,
  } = useForm<CreateDestinationFormValues>({
    resolver: zodResolver(createDestinationSchema),
    mode: 'onChange',
    defaultValues: {
      country: '',
      description: '',
      consultantIds: [],
      imageFile: undefined as any,
    },
  });

  const selectedConsultantIds = watch('consultantIds') || [];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setValue('imageFile', file, { shouldValidate: true });
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setValue('imageFile', undefined as any, { shouldValidate: true });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const onSubmit = async (values: CreateDestinationFormValues) => {
    await onCreate(values);
    reset();
    setPreviewUrl(null);
    setSelectedFile(null);
    onClose();
  };

  const handleClose = () => {
    reset();
    setPreviewUrl(null);
    setSelectedFile(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Nouvelle destination"
      subtitle="Ajouter un pays ou un établissement"
      maxWidth="lg"
      footer={
        <div className="flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSubmit(onSubmit)}
            disabled={!isValid || isPending}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:bg-sky-400 text-white text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center gap-1.5"
          >
            {isPending ? 'Création...' : 'Créer la destination'}
          </button>
        </div>
      }
    >
      {/* Aperçu de l'image */}
      <div className="flex items-center gap-6">
        <div
          className={`w-24 h-24 rounded-xl border-2 border-dashed flex items-center justify-center shrink-0 overflow-hidden ${
            previewUrl ? 'border-sky-400' : 'border-slate-300'
          }`}
        >
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Aperçu"
              className="w-full h-full object-cover"
            />
          ) : (
            <ImageIcon className="w-8 h-8 text-slate-300" />
          )}
        </div>
        <div className="flex-1">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Photo de la destination <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-2 mt-1">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
              id="destination-image-upload"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 bg-slate-100 border border-slate-200 hover:border-sky-300 text-slate-700 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              {previewUrl ? 'Changer' : 'Choisir une image'}
            </button>
            {previewUrl && (
              <button
                type="button"
                onClick={handleRemoveFile}
                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <span className="text-[10px] text-slate-400">
              JPG, PNG, WebP - Max 5 Mo
            </span>
          </div>
          {errors.imageFile && (
            <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {errors.imageFile.message}
            </p>
          )}
        </div>
      </div>

      {/* Formulaire */}
      <div className="space-y-4">
        {/* Pays */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Pays <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Ex: Canada, France, Royaume-Uni..."
              {...register('country')}
              className={`w-full pl-10 pr-3.5 py-2.5 bg-white border ${
                errors.country ? 'border-red-500' : 'border-slate-300 hover:border-sky-300'
              } rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-600 transition-colors`}
            />
          </div>
          {errors.country && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {errors.country.message}
            </p>
          )}
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={3}
            placeholder="Décrivez la destination, les établissements, les spécificités..."
            {...register('description')}
            className={`w-full p-3 bg-white border ${
              errors.description ? 'border-red-500' : 'border-slate-300 hover:border-sky-300'
            } rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-600 transition-colors resize-none`}
          />
          {errors.description && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {errors.description.message}
            </p>
          )}
        </div>

        {/* Consultants */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Consultants assignés <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Users className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              {...register('consultantIds')}
              multiple
              className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-300 hover:border-sky-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-sky-600 transition-colors min-h-25"
            >
              {consultants.map((consultant) => (
                <option key={consultant.id} value={consultant.id}>
                  {consultant.firstName} {consultant.lastName}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {selectedConsultantIds.map((id) => {
              const c = consultants.find((cons) => cons.id === id);
              return c ? (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-sky-50 border border-sky-200 rounded-lg text-xs font-medium text-sky-800"
                >
                  <Check className="w-3 h-3 text-sky-600" />
                  {c.firstName} {c.lastName}
                </span>
              ) : null;
            })}
          </div>
          {errors.consultantIds && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {errors.consultantIds.message}
            </p>
          )}
          <p className="text-[10px] text-slate-400">
            Maintenez Ctrl (ou Cmd) pour sélectionner plusieurs consultants
          </p>
        </div>
      </div>
    </Modal>
  );
}