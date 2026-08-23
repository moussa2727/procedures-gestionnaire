// src/components/(main)/shared/CtaSection.tsx
'use client';

import { motion, Variants } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { BookOpen as FaBookOpen } from 'lucide-react';

interface CtaSectionProps {
  className?: string;
}

const CtaSection: React.FC<CtaSectionProps> = ({ className }) => {
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: 'easeOut' },
    },
  };

  return (
    <section
      className={`relative py-12 md:py-16 mb-3 overflow-hidden bg-linear-to-br from-slate-50 via-white to-sky-100/30 ${className || ''}`}
    >
      <div className="absolute inset-0 pointer-events-none z-0">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'radial-gradient(circle, rgba(14,165,233,0.3) 1.2px, transparent 1.2px)',
            backgroundSize: '10px 10px',
          }}
        />
        <div className="absolute inset-0 bg-linear-to-r from-sky-50/50 to-transparent" />
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            x: [0, 10, 0],
            y: [0, -10, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute top-0 left-0 w-60 h-60 bg-sky-200/20 rounded-full filter blur-2xl"
        />
        <motion.div
          animate={{
            scale: [1, 1.15, 1],
            x: [0, -15, 0],
            y: [0, 15, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 1,
          }}
          className="absolute bottom-0 right-0 w-60 h-60 bg-sky-200/20 rounded-full filter blur-2xl"
        />
      </div>

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={containerVariants}
            className="text-center lg:text-left space-y-4 max-w-2xl"
          >
            <motion.div
              variants={itemVariants}
              className="flex items-center gap-2 text-sky-600 mb-2 justify-center lg:justify-start"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-100">
                <FaBookOpen className="w-4 h-4 text-sky-600" />
              </div>
              <span className="text-sm font-semibold uppercase tracking-wider text-sky-700">
                Votre Avenir Commence Ici
              </span>
            </motion.div>

            <motion.h3
              variants={itemVariants}
              className="text-2xl sm:text-3xl md:text-4xl font-black leading-tight tracking-tight"
            >
              <span className="block text-slate-800">PANAME CONSULTING</span>
              <span className="block bg-linear-to-r from-sky-600 via-sky-500 to-sky-400 bg-clip-text text-transparent">
                LE CAP VERS L'EXCELLENCE
              </span>
            </motion.h3>

            <motion.p
              variants={itemVariants}
              className="text-base sm:text-lg text-slate-600 font-medium tracking-wide"
            >
              VOTRE PARTENAIRE VERS L'EXCELLENCE ACADÉMIQUE INTERNATIONALE
            </motion.p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4, duration: 0.5, ease: 'backOut' }}
            className="group relative shrink-0"
          >
            <div className="absolute -inset-1 rounded-full bg-linear-to-r from-sky-400 to-sky-500 opacity-0 blur-md transition duration-500 group-hover:opacity-30" />

            <Link
              href="/rendez-vous"
              className="relative flex items-center gap-3 bg-linear-to-r from-sky-500 to-sky-600 px-6 py-3 rounded-lg shadow-md shadow-sky-500/25 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] group"
            >
              <span className="text-white font-semibold text-sm tracking-wide">RENDEZ-VOUS</span>
              <ArrowRight className="w-4 h-4 text-white transition-transform duration-300 group-hover:translate-x-0.5" />
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default CtaSection;