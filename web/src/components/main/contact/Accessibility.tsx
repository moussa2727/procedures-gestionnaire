// src/components/contact/Accessibility.tsx
'use client';

import { motion } from 'framer-motion';
import {
  Phone,
  MessageCircle,
  Mail,
  Clock,
  CheckCircle,
  XCircle,
  BadgeCheck,
  ArrowRight,
} from 'lucide-react';
import { useState, useEffect } from 'react';

interface ContactPoint {
  id: string;
  icon: React.ReactNode;
  label: string;
  value: string;
  action: string;
  link: string;
}

interface DaySchedule {
  day: string;
  hours: string;
  isOpen: boolean;
}

const contactPoints: ContactPoint[] = [
  {
    id: 'phone',
    icon: <Phone className="h-4 w-4" />,
    label: 'Appel direct',
    value: '+223 91 83 09 41',
    action: 'Appeler maintenant',
    link: 'tel:+22391830941',
  },
  {
    id: 'whatsapp',
    icon: <MessageCircle className="h-4 w-4" />,
    label: 'WhatsApp',
    value: '+223 91 83 09 41',
    action: 'Ecrire sur WhatsApp',
    link: 'https://wa.me/22391830941',
  },
  {
    id: 'email',
    icon: <Mail className="h-4 w-4" />,
    label: 'Email',
    value: 'panameconsulting906@gmail.com',
    action: 'Envoyer un email',
    link: 'mailto:panameconsulting906@gmail.com',
  },
];

const schedule: DaySchedule[] = [
  { day: 'Lundi - Vendredi', hours: '9h00 - 16h30', isOpen: true },
  { day: 'Samedi', hours: 'Ferme', isOpen: false },
  { day: 'Dimanche', hours: 'Ferme', isOpen: false },
];

export function Accessibility() {
  const [isAvailable, setIsAvailable] = useState(false);
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const checkAvailability = () => {
      const now = new Date();
      const day = now.getDay();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const currentMinutes = hours * 60 + minutes;

      const isWeekday = day >= 1 && day <= 5;
      const isWorkHours = currentMinutes >= 570 && currentMinutes <= 990;

      setIsAvailable(isWeekday && isWorkHours);

      setCurrentTime(
        now.toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
        })
      );
    };

    checkAvailability();
    const interval = setInterval(checkAvailability, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="py-12 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center text-center mb-8"
        >
          <div className="inline-block rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-sky-700 mb-3">
            Accessibilite
          </div>
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Nous sommes a votre ecoute
          </h2>
          <div className="mt-2 h-1 w-16 rounded-full bg-sky-600" />
          <p className="mt-3 text-sm text-slate-500 max-w-2xl">
            Plusieurs moyens de nous contacter selon vos preferences
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
          {contactPoints.map((point, index) => (
            <motion.a
              key={point.id}
              href={point.link}
              target={point.id === 'phone' || point.id === 'email' ? '_self' : '_blank'}
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.06, duration: 0.4 }}
              whileHover={{ y: -2 }}
              className="flex flex-col items-center rounded-xl p-4 text-center transition-all bg-white border border-sky-100 text-slate-700 hover:border-sky-200 hover:shadow-md"
            >
              <div className="mb-2 rounded-full bg-sky-100 p-2">
                <div className="text-sky-600">{point.icon}</div>
              </div>

              <p className="text-[11px] font-medium text-sky-700">{point.label}</p>

              <p className="mt-0.5 text-xs font-semibold text-slate-800 truncate max-w-full">
                {point.value}
              </p>

              <span className="mt-2 text-[10px] font-medium text-sky-600 underline underline-offset-1 flex items-center gap-0.5">
                {point.action}
                <ArrowRight className="h-2.5 w-2.5" />
              </span>
            </motion.a>
          ))}

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.25, duration: 0.4 }}
            className="sm:col-span-2 lg:col-span-1"
          >
            <div className="h-full rounded-xl bg-white border border-sky-100 p-4 transition-all hover:border-sky-200 hover:shadow-md">
              <div className="flex items-center gap-2 mb-3">
                <div className="relative shrink-0">
                  {isAvailable ? (
                    <CheckCircle className="h-5 w-5 text-emerald-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-rose-600" />
                  )}
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-white ${
                      isAvailable ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                    }`}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800 leading-tight">
                    {isAvailable ? 'Disponible' : 'Indisponible'}
                  </p>
                  <p className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5" />
                    {currentTime} • {isAvailable ? 'Reponse rapide' : 'Hors horaires'}
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-sky-700">
                  <Clock className="h-3 w-3" />
                  <span>Horaires d'ouverture</span>
                </div>

                {schedule.map((slot) => (
                  <div
                    key={slot.day}
                    className="flex items-center justify-between rounded-md px-2 py-1 text-xs transition-colors hover:bg-sky-50"
                  >
                    <span className="text-slate-500">{slot.day}</span>
                    <div className="flex items-center gap-1.5">
                      <span className={slot.isOpen ? 'text-slate-700' : 'text-rose-600'}>
                        {slot.hours}
                      </span>
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${slot.isOpen ? 'bg-emerald-500' : 'bg-rose-500'}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="mt-6 text-center text-xs text-slate-500 flex items-center justify-center gap-1.5"
        >
          {isAvailable ? (
            <>
              <BadgeCheck className="h-3.5 w-3.5 text-emerald-600" />
              Nous sommes actuellement disponibles pour vous repondre.
            </>
          ) : (
            <>
              <Clock className="h-3.5 w-3.5 text-sky-600" />
              Notre equipe est disponible du lundi au vendredi de 9h30 a 16h30. Vous pouvez nous
              laisser un message, nous vous repondrons des notre retour.
            </>
          )}
        </motion.p>
      </div>
    </section>
  );
}

export default Accessibility;
