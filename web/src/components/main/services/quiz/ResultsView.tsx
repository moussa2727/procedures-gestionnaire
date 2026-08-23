'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight, MapPin } from 'lucide-react';
import { DestinationCard } from './DestinationCard';

interface ResultDestination {
  id: string;
  name: string;
  description: string;
  advantages: string[];
  matchPercentage: number;
  flag: string;
  costLevel: 'low' | 'medium' | 'high';
  language: string[];
}

interface ResultsViewProps {
  results: ResultDestination[];
  onReset: () => void;
  questionCount: number;
}

export function ResultsView({ results, onReset, questionCount }: ResultsViewProps) {
  return (
    <div className="min-h-screen bg-white py-8 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-sky-50 border border-sky-200 mb-4">
            <MapPin className="h-7 w-7 text-sky-600" strokeWidth={1.8} />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Vos Destinations Ideales
          </h1>
          <p className="text-slate-500 text-sm max-w-2xl mx-auto mt-2">
            Base sur vos preferences, decouvrez les pays qui correspondent le mieux a votre projet
            d'etudes
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3 mb-8">
          {results.map((destination, index) => (
            <DestinationCard key={destination.id} destination={destination} rank={index + 1} />
          ))}
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 mb-8">
          <h3 className="font-semibold text-slate-800 mb-4 text-sm">Analyse de vos resultats</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="text-center p-3 bg-sky-50 rounded-lg border border-sky-100">
              <div className="text-xl font-bold text-sky-600">{results[0]?.matchPercentage}%</div>
              <div className="text-xs text-slate-500">Meilleur match</div>
            </div>
            <div className="text-center p-3 bg-sky-50 rounded-lg border border-sky-100">
              <div className="text-xl font-bold text-sky-600">{results.length}</div>
              <div className="text-xs text-slate-500">Destinations recommandees</div>
            </div>
            <div className="text-center p-3 bg-sky-50 rounded-lg border border-sky-100">
              <div className="text-xl font-bold text-sky-600">
                {results.filter((d) => d.costLevel === 'low').length}
              </div>
              <div className="text-xs text-slate-500">Destinations economiques</div>
            </div>
            <div className="text-center p-3 bg-sky-50 rounded-lg border border-sky-100">
              <div className="text-xl font-bold text-sky-600">
                {new Set(results.flatMap((d) => d.language)).size}
              </div>
              <div className="text-xs text-slate-500">Langues proposees</div>
            </div>
          </div>
        </div>

        <div className="text-center space-y-3">
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Link
              href="/rendez-vous"
              className="inline-flex items-center justify-center px-6 py-2.5 font-semibold text-white bg-sky-600 rounded-lg shadow-sm hover:bg-sky-700 transition-colors duration-200 text-sm"
            >
              Discuter avec un conseiller
              <ChevronRight className="ml-2 h-4 w-4" strokeWidth={1.8} />
            </Link>

            <button
              onClick={onReset}
              className="inline-flex items-center justify-center px-6 py-2.5 font-medium text-sky-600 border border-sky-200 rounded-lg hover:bg-sky-50 transition-colors duration-200 text-sm"
            >
              Refaire le test
            </button>
          </div>
          <p className="text-slate-400 text-xs">
            Ces resultats sont bases sur l'analyse de {questionCount} criteres personnalises
          </p>
        </div>
      </div>
    </div>
  );
}
