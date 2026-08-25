// src/components/contact/ContactForm.tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Mail,
  User,
  MessageSquare,
  Send,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Phone,
  Clock,
  Loader2,
} from 'lucide-react';
import { createContactSchema, type CreateContactFormValues } from '@/src/schemas/contact.schema';
import { useCreateContact } from '@/src/hooks/use-contacts';

function ContactInfoItem({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-sky-100 bg-white p-3 sm:p-4 transition-colors hover:border-sky-200">
      <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
        <Icon className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={1.8} />
      </div>
      <div className="min-w-0">
        <p className="text-xs sm:text-sm font-medium text-slate-700">{label}</p>
        <p className="text-xs sm:text-sm text-slate-500 truncate">{value}</p>
      </div>
    </div>
  );
}

function ContactFormSection() {
  const [isSuccess, setIsSuccess] = useState(false);
  const { mutate, isPending, error } = useCreateContact();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateContactFormValues>({
    resolver: zodResolver(createContactSchema),
    defaultValues: {
      name: '',
      email: '',
      message: '',
      website: '',
    },
  });

  const onSubmit = (data: CreateContactFormValues) => {
    mutate(data, {
      onSuccess: () => {
        setIsSuccess(true);
        reset();
        setTimeout(() => setIsSuccess(false), 5000);
      },
    });
  };

  if (isSuccess) {
    return (
      <div className="w-full rounded-xl border border-emerald-200 bg-emerald-50 p-4 sm:p-6">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={1.8} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-emerald-800">Message envoye</h3>
            <p className="mt-1 text-xs sm:text-sm text-emerald-700">
              Votre message a bien ete transmis. Nous vous repondrons dans les plus brefs delais.
            </p>
            <button
              type="button"
              onClick={() => setIsSuccess(false)}
              className="mt-3 text-xs sm:text-sm font-medium text-emerald-700 transition-colors hover:text-emerald-800"
            >
              Envoyer un autre message
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full space-y-4 sm:space-y-5">
      <div className="sr-only">
        <label htmlFor="website">Website</label>
        <input id="website" type="text" tabIndex={-1} autoComplete="off" {...register('website')} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="name" className="text-xs sm:text-sm font-medium text-slate-700">
          Nom complet
        </label>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <User className="h-4 w-4" strokeWidth={1.8} />
          </div>
          <input
            id="name"
            type="text"
            placeholder="Votre nom"
            className={`w-full rounded-lg border bg-white px-3 py-2.5 pl-10 text-sm text-slate-800 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-0 focus:border-sky-600 hover:border-sky-300 disabled:opacity-50 disabled:cursor-not-allowed ${
              errors.name ? 'border-rose-300' : 'border-sky-200'
            }`}
            disabled={isPending}
            {...register('name')}
          />
        </div>
        {errors.name && (
          <p className="flex items-center gap-1.5 text-xs text-rose-600">
            <AlertCircle className="h-3 w-3" strokeWidth={1.8} />
            {errors.name.message}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="email" className="text-xs sm:text-sm font-medium text-slate-700">
          Email
          <span className="text-rose-500 ml-1">*</span>
        </label>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <Mail className="h-4 w-4" strokeWidth={1.8} />
          </div>
          <input
            id="email"
            type="email"
            placeholder="vous@exemple.fr"
            className={`w-full rounded-lg border bg-white px-3 py-2.5 pl-10 text-sm text-slate-800 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-0 focus:border-sky-600 hover:border-sky-300 disabled:opacity-50 disabled:cursor-not-allowed ${
              errors.email ? 'border-rose-300' : 'border-sky-200'
            }`}
            disabled={isPending}
            {...register('email')}
          />
        </div>
        {errors.email && (
          <p className="flex items-center gap-1.5 text-xs text-rose-600">
            <AlertCircle className="h-3 w-3" strokeWidth={1.8} />
            {errors.email.message}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="message" className="text-xs sm:text-sm font-medium text-slate-700">
          Message
          <span className="text-rose-500 ml-1">*</span>
        </label>
        <div className="relative">
          <div className="absolute left-3 top-3 text-slate-400">
            <MessageSquare className="h-4 w-4" strokeWidth={1.8} />
          </div>
          <textarea
            id="message"
            rows={4}
            placeholder="Decrivez votre demande..."
            className={`w-full rounded-lg border bg-white px-3 py-2.5 pl-10 text-sm text-slate-800 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-0 focus:border-sky-600 hover:border-sky-300 disabled:opacity-50 disabled:cursor-not-allowed resize-y min-h-24 ${
              errors.message ? 'border-rose-300' : 'border-sky-200'
            }`}
            disabled={isPending}
            {...register('message')}
          />
        </div>
        {errors.message && (
          <p className="flex items-center gap-1.5 text-xs text-rose-600">
            <AlertCircle className="h-3 w-3" strokeWidth={1.8} />
            {errors.message.message}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-medium text-white bg-sky-600 transition-all hover:bg-sky-700 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Envoi en cours...
          </>
        ) : (
          <>
            <Send className="h-4 w-4" strokeWidth={1.8} />
            Envoyer
          </>
        )}
      </button>

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" strokeWidth={1.8} />
          <p className="text-sm text-rose-700">
            Une erreur est survenue lors de l&apos;envoi. Veuillez reessayer.
          </p>
        </div>
      )}
    </form>
  );
}

export function ContactForm() {
  return (
    <section className="w-full bg-white py-10 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12 xl:gap-16">
          <div className="flex flex-col justify-center space-y-6">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5">
                <span className="flex h-5 w-5 items-center justify-center text-sky-600" aria-hidden="true">
                  <Mail className="h-4 w-4" strokeWidth={1.8} />
                </span>
                <span className="text-xs font-medium tracking-wide text-sky-700">Nous contacter</span>
              </div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-semibold tracking-tight text-slate-900">
                Une question ? <span className="text-sky-600">Ecrivez-nous</span>
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-500 sm:text-base">
                Notre equipe vous repond dans les plus brefs delais. Que vous soyez etudiant,
                consultant ou partenaire, nous sommes a votre ecoute.
              </p>
            </div>

            <div className="grid gap-3 sm:gap-4">
              <ContactInfoItem icon={MapPin} label="Adresse" value="Kalaban Coura, Imm. Bore en face de l&apos;hotel Wassulu" />
              <ContactInfoItem icon={Phone} label="Telephone" value="+223 91 83 09 41" />
              <ContactInfoItem icon={Clock} label="Horaires" value="Lun - Ven : 9h00 - 17h00 | Sam - Dim : Ferme" />
            </div>

            <div className="border-t border-sky-100 pt-5">
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-sky-100 text-xs font-semibold text-sky-700">
                    A
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-sky-50 text-xs font-semibold text-sky-700">
                    B
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-xs font-semibold text-slate-600">
                    +3
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-slate-500">Une equipe dediee a votre service</p>
              </div>
            </div>
          </div>

          <div className="flex items-start lg:items-center">
            <ContactFormSection />
          </div>
        </div>
      </div>
    </section>
  );
}
