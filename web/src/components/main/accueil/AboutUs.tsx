'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import AboutUsImage from '@/public/images/CEOPANAME.webp';
import { Sparkles, Quote } from 'lucide-react';

const AboutUs = () => {
  const starPositions = [
    { top: '8%', right: '12%', delay: 0 },
    { top: '22%', right: '78%', delay: 0.6 },
    { top: '35%', right: '5%', delay: 1.2 },
    { top: '48%', right: '85%', delay: 0.3 },
    { top: '62%', right: '15%', delay: 1.8 },
    { top: '75%', right: '70%', delay: 0.9 },
    { top: '12%', right: '45%', delay: 2.1 },
    { top: '88%', right: '25%', delay: 1.5 },
    { top: '42%', right: '55%', delay: 0.7 },
    { top: '68%', right: '40%', delay: 2.4 },
    { top: '5%', right: '92%', delay: 1.1 },
    { top: '95%', right: '88%', delay: 0.4 },
  ];

  return (
    <section className="relative w-full overflow-hidden bg-slate-50 py-16 md:py-24">
      <div className="relative z-10 container mx-auto px-4 md:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={{
            hidden: { opacity: 0, y: 30 },
            visible: {
              opacity: 1,
              y: 0,
              transition: {
                duration: 0.6,
                staggerChildren: 0.2,
              },
            },
          }}
          className="text-center lg:text-left max-w-3xl mb-12 lg:mb-16"
        >
          <motion.span
            variants={{
              hidden: { opacity: 0, x: -20 },
              visible: { opacity: 1, x: 0 },
            }}
            className="text-sky-600 font-bold text-sm tracking-[0.2em] uppercase block"
          >
            Qui sommes-nous
          </motion.span>

          <motion.h2
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0 },
            }}
            className="text-3xl md:text-5xl font-extrabold text-slate-900 mt-3"
          >
            Votre partenaire de confiance pour <br className="hidden md:block" />
            <span className="text-sky-500">une mobilité sans frontières</span>
          </motion.h2>

          <motion.div
            variants={{
              hidden: { scaleX: 0, opacity: 0 },
              visible: {
                scaleX: 1,
                opacity: 1,
                transition: { duration: 0.8, ease: 'circOut' },
              },
            }}
            style={{ originX: 0 }}
            className="w-16 h-1 bg-sky-600 mt-4 mx-auto lg:ml-0 rounded-full"
          />
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative lg:w-1/2 shrink-0"
          >
            <div className="absolute inset-0 bg-sky-100/50 rounded-2xl -z-10" />

            {starPositions.map((pos, i) => (
              <motion.div
                key={i}
                className="absolute text-sky-300/40"
                style={{
                  top: pos.top,
                  right: pos.right,
                }}
                animate={{
                  opacity: [0.2, 0.8, 0.2],
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  delay: pos.delay,
                  ease: 'easeInOut',
                }}
              >
                <Sparkles className="w-3 h-3" />
              </motion.div>
            ))}

            <div className="relative z-10 mx-auto rounded-2xl w-56 h-56 sm:w-64 sm:h-64 md:w-72 md:h-72 lg:w-80 lg:h-80 xl:w-96 xl:h-96 flex items-center justify-center overflow-hidden shadow-xl border-4 border-white">
              <Image
                src={AboutUsImage}
                alt="Sangare Damini - Fondateur & CEO Paname Consulting"
                fill
                className="object-cover object-top"
                sizes="(max-width: 640px) 224px, (max-width: 768px) 256px, (max-width: 1024px) 288px, 384px"
                priority
                quality={90}
              />
            </div>

            <div className="absolute -bottom-3 -right-3 w-full h-full border border-slate-200/60 rounded-2xl z-0" />

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm px-5 py-2.5 rounded-xl shadow-lg border border-slate-100 text-center min-w-44 z-20"
            >
              <p className="font-bold text-slate-800 text-sm">Sangare Damini</p>
              <p className="text-sky-600 text-[10px] font-black uppercase tracking-wider">
                Fondateur & CEO
              </p>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="lg:w-1/2 space-y-6"
          >
            <div className="relative">
              <Quote className="absolute -top-2 -left-2 h-8 w-8 text-sky-200" />
              <p className="pl-6 text-lg text-slate-700 leading-relaxed font-semibold italic">
                "Notre mission : vous offrir un accompagnement sur mesure pour vos projets d'études
                à l'étranger, dans un monde en constante mutation."
              </p>
            </div>

            <div className="space-y-4">
              <p className="text-slate-600 leading-relaxed text-sm md:text-base">
                <span className="font-semibold text-sky-700">Paname Consulting</span> est né d'un
                constat simple : les étudiants francophones rencontrent trop d'obstacles dans leur
                projet d'études à l'étranger. Notre fondateur, fort de son expérience
                internationale, a créé une solution d'accompagnement sur-mesure, de la sélection de
                la destination jusqu'à l'installation sur place.
              </p>

              <p className="text-slate-600 leading-relaxed text-sm md:text-base">
                Aujourd'hui, <span className="font-semibold text-sky-700">PANAME CONSULTING</span>{' '}
                est votre passerelle vers l'international, portée par une équipe multiculturelle
                passionnée par l'éducation et l'accompagnement. Nous sommes engagés à{' '}
                <span className="font-semibold text-slate-800 bg-sky-50 px-1.5 py-0.5 rounded">
                  briser les barrières de la mobilité internationale
                </span>{' '}
                en offrant à chaque talent un accompagnement d'excellence, humain et personnalisé.
              </p>

              <p className="text-slate-600 leading-relaxed text-sm md:text-base">
                Nous transformons l'éducation en opportunités mondiales grâce à un accompagnement
                sur-mesure pour vos projets en{' '}
                <span className="font-medium text-sky-600">France</span>,{' '}
                <span className="font-medium text-sky-600">Canada</span>,{' '}
                <span className="font-medium text-sky-600">Turquie</span> et bien d'autres
                destinations.
              </p>
            </div>

            <div className="pl-6 border-l-4 border-sky-400 py-2">
              <p className="text-slate-600 italic text-sm md:text-base">
                "L'éducation est le passeport pour l'avenir, car demain appartient à ceux qui s'y
                préparent aujourd'hui." —{' '}
                <span className="font-semibold text-slate-700">Malcolm X</span>
              </p>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.7, duration: 0.6 }}
          className="relative mt-12 rounded-2xl bg-sky-50 p-8 overflow-hidden border border-sky-100/50"
        >
          <Quote className="absolute top-4 left-4 h-10 w-10 text-sky-200/50" />
          <div className="relative z-10">
            <p className="text-lg italic font-light text-slate-700 leading-relaxed">
              "Ensemble, transformons vos ambitions en réussites concrètes, mettez le cap vers
              l'excellence."
            </p>
              <div className="mt-4 flex items-center gap-3">
                <div className="w-12 h-0.5 bg-sky-600" />
              <span className="text-sky-600 text-sm font-bold uppercase tracking-widest">
                Paname Consulting Team
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default AboutUs;