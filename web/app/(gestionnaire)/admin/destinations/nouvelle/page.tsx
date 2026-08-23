'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { useCreateDestination } from '@/src/hooks/use-destinations';
import { useUsersByRole } from '@/src/hooks/use-users';
import { createDestinationSchema, type CreateDestinationFormValues } from '@/src/schemas/destination.schema';
import { UserRole } from '@/src/types/enums';
import type { UserResponse } from '@/src/types/user';
import { AuthButton } from '@/src/components/common/auth/AuthButton';
import { AuthCard } from '@/src/components/common/auth/AuthCard';
import { AuthHeader } from '@/src/components/common/auth/AuthHeader';
import { AuthInput } from '@/src/components/common/auth/AuthInput';
import { MapPin, Image, Users } from 'lucide-react';

export default function AdminNouvelleDestinationPage() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const createMutation = useCreateDestination();

  const { data: consultants } = useUsersByRole(UserRole.CONSULTANT);
  const consultantList: UserResponse[] = consultants || [];

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting }, reset } = useForm<CreateDestinationFormValues>({
    resolver: zodResolver(createDestinationSchema),
    defaultValues: {
      consultantIds: [],
    },
  });

  const onSubmit = async (data: CreateDestinationFormValues) => {
    if (!imageFile) {
      toast.error('Veuillez sélectionner une image');
      return;
    }
    try {
      await createMutation.mutateAsync({
        country: data.country,
        description: data.description,
        consultantIds: data.consultantIds || [],
        imageFile,
      });
      toast.success('Destination créée');
      reset();
      setImageFile(null);
    } catch {
      toast.error('Erreur lors de la création');
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Administration</p>
        <h2 className="mt-2 text-3xl font-bold text-slate-900">Nouvelle destination</h2>
        <p className="mt-3 max-w-2xl text-sm text-slate-600">
          Ajoutez un nouveau pays de destination avec sa description et son image.
        </p>
      </header>

      <AuthCard maxWidth="md">
        <AuthHeader title="Créer une destination" subtitle="Remplissez les informations" />
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <AuthInput
            label="Pays"
            icon={MapPin}
            name="country"
            register={register}
            error={errors.country?.message}
            placeholder="Canada"
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              {...register('description')}
              rows={4}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-sky-500"
              placeholder="Décrivez cette destination..."
            />
            {errors.description && <p className="mt-1 text-sm text-red-500">{errors.description.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Image</label>
            <div className="relative">
              <Image className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setImageFile(file);
                  if (file) setValue('imageFile', file, { shouldValidate: true });
                }}
                className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-sky-500"
              />
            </div>
            {errors.imageFile && <p className="mt-1 text-sm text-red-500">{errors.imageFile.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Consultants associés</label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <select
                multiple
                {...register('consultantIds')}
                className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-sky-500 min-h-[120px]"
              >
                {consultantList.map((c: UserResponse) => (
                  <option key={c.id} value={c.id}>
                    {c.firstName} {c.lastName}
                  </option>
                ))}
              </select>
            </div>
            <p className="mt-1 text-xs text-slate-500">Maintenez Ctrl/Cmd pour sélectionner plusieurs consultants</p>
          </div>
          <AuthButton type="submit" isLoading={isSubmitting || createMutation.isPending} loadingText="Création...">
            Créer la destination
          </AuthButton>
        </form>
      </AuthCard>
    </div>
  );
}
