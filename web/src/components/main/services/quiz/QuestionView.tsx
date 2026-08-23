'use client';

import React from 'react';
import { ChevronLeft, Sparkles } from 'lucide-react';

interface Question {
  id: string;
  question: string;
  icon: React.ReactElement;
  options: {
    value: string;
    label: string;
    description?: string;
  }[];
}

interface QuestionViewProps {
  currentStep: number;
  questions: Question[];
  selectedOption: string | null;
  onAnswer: (questionId: string, answer: string) => void;
  onPrevious: () => void;
  answers: Record<string, string>;
}

export function QuestionView({
  currentStep,
  questions,
  selectedOption,
  onAnswer,
  onPrevious,
  answers,
}: QuestionViewProps) {
  const currentQuestion = questions[currentStep];
  const progress = ((currentStep + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-medium text-sky-600 bg-sky-50 px-3 py-1 rounded-full border border-sky-100">
              Question {currentStep + 1}/{questions.length}
            </span>
            <span className="text-sm font-medium text-sky-500">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5">
            <div
              className="bg-sky-600 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
          <div className="p-6 text-center border-b border-slate-100">
            <div className="flex justify-center mb-3">
              <div className="p-2 bg-sky-50 rounded-full border border-sky-100">{currentQuestion.icon}</div>
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mb-1">{currentQuestion.question}</h2>
            <p className="text-xs text-slate-400">Selectionnez l'option qui vous correspond le mieux</p>
          </div>

          <div className="p-4 space-y-2">
            {currentQuestion.options.map((option) => (
              <button
                key={option.value}
                onClick={() => onAnswer(currentQuestion.id, option.value)}
                className={[
                  'w-full p-3 text-left rounded-lg border transition-all duration-200',
                  selectedOption === option.value
                    ? 'border-sky-500 bg-sky-50 shadow-sm'
                    : 'border-slate-200 hover:border-sky-300 hover:bg-sky-50/50',
                ].join(' ')}
              >
                <div className="flex items-start">
                  <div
                    className={[
                      'shrink-0 flex items-center justify-center h-5 w-5 rounded-full border mr-3 mt-0.5',
                      selectedOption === option.value
                        ? 'border-sky-500 bg-sky-500'
                        : 'border-slate-300 bg-white',
                    ].join(' ')}
                  >
                    {selectedOption === option.value && (
                      <div className="h-1.5 w-1.5 rounded-full bg-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-slate-800 text-sm">{option.label}</div>
                    {option.description && (
                      <div className="text-xs text-slate-400 mt-0.5">{option.description}</div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="bg-slate-50 px-5 py-3 flex items-center justify-between border-t border-slate-100">
            <button
              onClick={onPrevious}
              disabled={currentStep === 0}
              className={[
                'flex items-center font-medium px-3 py-1.5 rounded-lg transition-colors text-sm',
                currentStep === 0
                  ? 'text-slate-300 cursor-not-allowed'
                  : 'text-slate-600 hover:text-sky-600 hover:bg-sky-50',
              ].join(' ')}
            >
              <ChevronLeft className="w-4 h-4 mr-1.5" strokeWidth={1.8} />
              Precedent
            </button>
            <span className="text-xs text-slate-400 font-medium">
              <span className="text-sky-500 font-semibold">{currentStep + 1}</span> / {questions.length}
            </span>
          </div>
        </div>

        <div className="flex justify-between items-center px-2">
          <span className="text-xs text-slate-400">
            {currentStep > 0
              ? `${Object.keys(answers).length} reponses enregistrees`
              : 'Commencez par la premiere question'}
          </span>
          <div className="flex space-x-1.5">
            {questions.map((_, index) => (
              <div
                key={index}
                className={[
                  'h-1.5 w-5 rounded-full transition-all duration-300',
                  index === currentStep
                    ? 'bg-sky-500'
                    : index < currentStep
                      ? 'bg-emerald-400'
                      : 'bg-slate-200',
                ].join(' ')}
              />
            ))}
          </div>
        </div>

        <div className="mt-6 text-center">
          <span className="inline-flex items-center text-xs text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-200">
            <Sparkles className="h-3 w-3 text-sky-500 mr-1.5" strokeWidth={1.8} />
            Analyse personnalisee de {questions.length} destinations
          </span>
        </div>
      </div>
    </div>
  );
}
