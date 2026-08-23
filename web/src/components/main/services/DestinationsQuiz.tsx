'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  Banknote,
  Languages,
  BookOpen,
  Briefcase,
  Heart,
} from 'lucide-react';

import { QuizLoader, QuestionView, ResultsView } from '@/src/components/main/services/quiz';

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

interface Destination {
  id: string;
  name: string;
  description: string;
  advantages: string[];
  score: number;
  matchPercentage: number;
  flag: string;
  costLevel: 'low' | 'medium' | 'high';
  language: string[];
}

const DestinationsQuiz = () => {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Destination[]>([]);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const questions: Question[] = useMemo(
    () => [
      {
        id: 'budget',
        question: 'Quel est votre budget annuel pour les etudes ?',
        icon: <Banknote className="w-5 h-5 text-sky-600" strokeWidth={1.8} />,
        options: [
          { value: 'low', label: '2-3M FCFA', description: 'Budget economique' },
          { value: 'medium', label: '3-5M FCFA', description: 'Budget moyen' },
          { value: 'high', label: '5-10M FCFA', description: 'Budget confortable' },
          { value: 'premium', label: '10M+ FCFA', description: 'Budget premium' },
        ],
      },
      {
        id: 'language',
        question: 'Quelle est votre preference linguistique ?',
        icon: <Languages className="w-5 h-5 text-sky-600" strokeWidth={1.8} />,
        options: [
          { value: 'fr', label: 'Francais', description: 'Exclusivement' },
          { value: 'en', label: 'Anglais', description: 'Exclusivement' },
          { value: 'fr-en', label: 'Francais/Anglais', description: 'Bilingue' },
          { value: 'other', label: 'Autre', description: 'Ouvert aux autres langues' },
        ],
      },
      {
        id: 'field',
        question: 'Dans quel domaine souhaitez-vous etudier ?',
        icon: <BookOpen className="w-5 h-5 text-sky-600" strokeWidth={1.8} />,
        options: [
          { value: 'tech', label: 'Technologie & Informatique' },
          { value: 'medical', label: 'Medecine & Sante' },
          { value: 'engineering', label: 'Ingenierie & Sciences' },
          { value: 'business', label: 'Commerce & Management' },
          { value: 'arts', label: 'Arts & Culture' },
        ],
      },
      {
        id: 'career',
        question: 'Quel est votre objectif professionnel principal ?',
        icon: <Briefcase className="w-5 h-5 text-sky-600" strokeWidth={1.8} />,
        options: [
          { value: 'local', label: 'Travailler dans mon pays' },
          { value: 'international', label: 'Carriere internationale' },
          { value: 'research', label: 'Recherche academique' },
          { value: 'entrepreneur', label: 'Entrepreneuriat' },
        ],
      },
      {
        id: 'lifestyle',
        question: 'Quel style de vie recherchez-vous ?',
        icon: <Heart className="w-5 h-5 text-sky-600" strokeWidth={1.8} />,
        options: [
          { value: 'dynamic', label: 'Vie dynamique et urbaine' },
          { value: 'traditional', label: 'Culture traditionnelle' },
          { value: 'balanced', label: 'Equilibre vie pro/perso' },
          { value: 'adventure', label: 'Aventure et decouverte' },
        ],
      },
    ],
    [],
  );

  const destinations: Destination[] = useMemo(
    () => [
      {
        id: 'france',
        name: 'France',
        description:
          'Excellence academique avec grandes ecoles prestigieuses, culture riche et reconnaissance mondiale.',
        advantages: [
          'Grandes ecoles (Polytechnique, HEC, Sorbonne)',
          'Frais universitaires tres bas',
          'Systeme de bourses Excellence-Major',
          'Vie etudiante dynamique',
          'Diplomes reconnus mondialement',
        ],
        score: 0,
        matchPercentage: 0,
        flag: '🇫🇷',
        costLevel: 'medium',
        language: ['Francais', 'Anglais'],
        specialties: ['Ingenierie', 'Commerce', 'Sciences', 'Arts'],
      },
      {
        id: 'russie',
        name: 'Russie',
        description:
          "Formation scientifique d'excellence avec couts abordables, tradition academique solide.",
        advantages: [
          'Universites reputees en medecine (Sechenov)',
          'Couts tres competitifs (1-3M FCFA/an)',
          'Programmes en anglais disponibles',
          'Logement etudiant a bas prix',
          'Bourses gouvernementales nombreuses',
        ],
        score: 0,
        matchPercentage: 0,
        flag: '🇷🇺',
        costLevel: 'low',
        language: ['Russe', 'Anglais'],
        specialties: ['Medecine', 'Sciences', 'Ingenierie', 'Technologie'],
      },
      {
        id: 'maroc',
        name: 'Maroc',
        description: 'Proximite culturelle, couts abordables, pont entre Afrique et Europe.',
        advantages: [
          'Couts tres competitifs (1-2M FCFA/an)',
          'Environnement francophone familier',
          'Universites reconnues (UM6P, Al Akhawayn)',
          'Proximite geographique pour africains',
          'Culture riche et hospitaliere',
        ],
        score: 0,
        matchPercentage: 0,
        flag: '🇲🇦',
        costLevel: 'low',
        language: ['Francais', 'Arabe'],
        specialties: ['Commerce', 'Ingenierie', 'Tourisme', 'Agriculture'],
      },
      {
        id: 'algerie',
        name: 'Algerie',
        description: 'Destination economique avec systeme educatif francophone en developpement.',
        advantages: [
          'Couts extremement bas (&lt; 1M FCFA/an)',
          'Environnement francophone integral',
          'Proximite culturelle totale',
          'Universites en developpement rapide',
          'Frais de scolarite presque gratuits',
        ],
        score: 0,
        matchPercentage: 0,
        flag: '🇩🇿',
        costLevel: 'low',
        language: ['Francais', 'Arabe'],
        specialties: ['Medecine', 'Ingenierie', 'Droit', 'Sciences'],
      },
      {
        id: 'turquie',
        name: 'Turquie',
        description: 'Pont entre Orient et Occident, education de qualite a prix modere.',
        advantages: [
          'Couts raisonnables (2-4M FCFA/an)',
          'Mix culturel unique',
          'Universites anglophones de qualite',
          'Position geostrategique importante',
          'Programmes de bourses Turkiye Burslari',
        ],
        score: 0,
        matchPercentage: 0,
        flag: '🇹🇷',
        costLevel: 'medium',
        language: ['Turc', 'Anglais'],
        specialties: ['Ingenierie', 'Medecine', 'Relations Internationales', 'Tourisme'],
      },
      {
        id: 'chine',
        name: 'Chine',
        description: "Superpuissance economique avec investissements massifs dans l'education.",
        advantages: [
          'Bourses gouvernementales completes',
          'Universites de rang mondial (Tsinghua, Peking)',
          'Croissance economique exceptionnelle',
          'Programmes en anglais nombreux',
          'Technologie de pointe',
        ],
        score: 0,
        matchPercentage: 0,
        flag: '🇨🇳',
        costLevel: 'medium',
        language: ['Chinois', 'Anglais'],
        specialties: ['Technologie', 'Ingenierie', 'Business', 'Medecine Traditionnelle'],
      },
    ],
    [],
  );

  const calculateResults = useCallback(
    (answers: Record<string, string>): Destination[] => {
      const scoredDestinations = destinations.map((d) => ({ ...d, score: 0 }));

      const weights = { budget: 4, language: 3, field: 3, career: 2, lifestyle: 2 };

      Object.entries(answers).forEach(([questionId, answer]) => {
        const weight = weights[questionId as keyof typeof weights] || 1;

        scoredDestinations.forEach((dest) => {
          let scoreToAdd = 0;

          switch (questionId) {
            case 'budget':
              if (answer === 'low' && ['algerie', 'maroc', 'russie'].includes(dest.id))
                scoreToAdd = 4;
              if (answer === 'medium' && ['turquie', 'chine', 'france'].includes(dest.id))
                scoreToAdd = 3;
              if (answer === 'high' && ['france', 'chine'].includes(dest.id)) scoreToAdd = 3;
              if (answer === 'premium' && ['france'].includes(dest.id)) scoreToAdd = 4;
              break;

            case 'language':
              if (answer === 'fr' && ['france', 'maroc', 'algerie'].includes(dest.id))
                scoreToAdd = 4;
              if (answer === 'en' && ['chine', 'turquie', 'russie'].includes(dest.id))
                scoreToAdd = 3;
              if (answer === 'fr-en' && ['france', 'maroc'].includes(dest.id)) scoreToAdd = 3;
              if (answer === 'other' && ['chine', 'turquie'].includes(dest.id)) scoreToAdd = 2;
              break;

            case 'field':
              if (answer === 'tech' && ['chine', 'russie', 'france'].includes(dest.id))
                scoreToAdd = 4;
              if (answer === 'medical' && ['russie', 'france', 'chine'].includes(dest.id))
                scoreToAdd = 4;
              if (answer === 'engineering' && ['france', 'chine', 'turquie', 'russie'].includes(dest.id))
                scoreToAdd = 3;
              if (answer === 'business' && ['france', 'maroc', 'turquie'].includes(dest.id))
                scoreToAdd = 3;
              if (answer === 'arts' && ['france', 'turquie', 'maroc'].includes(dest.id))
                scoreToAdd = 3;
              break;

            case 'career':
              if (answer === 'international' && ['france', 'chine', 'turquie'].includes(dest.id))
                scoreToAdd = 3;
              if (answer === 'local' && ['maroc', 'algerie'].includes(dest.id)) scoreToAdd = 4;
              if (answer === 'research' && ['france', 'chine', 'russie'].includes(dest.id))
                scoreToAdd = 3;
              if (answer === 'entrepreneur' && ['chine', 'turquie', 'maroc'].includes(dest.id))
                scoreToAdd = 3;
              break;

            case 'lifestyle':
              if (answer === 'dynamic' && ['chine', 'turquie', 'france'].includes(dest.id))
                scoreToAdd = 3;
              if (answer === 'traditional' && ['maroc', 'algerie', 'turquie'].includes(dest.id))
                scoreToAdd = 3;
              if (answer === 'balanced' && ['france', 'maroc'].includes(dest.id)) scoreToAdd = 3;
              if (answer === 'adventure' && ['chine', 'russie', 'turquie'].includes(dest.id))
                scoreToAdd = 4;
              break;
          }

          dest.score += scoreToAdd * weight;
        });
      });

      scoredDestinations.forEach((dest) => {
        if (answers.language === 'fr' && dest.language.includes('Francais')) {
          dest.score += 2;
        }
        if (answers.language === 'en' && dest.language.includes('Anglais')) {
          dest.score += 2;
        }
        if (
          (answers.budget === 'low' && dest.costLevel === 'low') ||
          (answers.budget === 'premium' && dest.costLevel === 'high')
        ) {
          dest.score += 3;
        }
      });

      const maxPossibleScore = 70;
      const filtered = scoredDestinations.filter((d) => d.score > 0);

      if (filtered.length === 0) {
        return destinations.slice(0, 3).map((d, i) => ({
          ...d,
          matchPercentage: 80 - i * 10,
        }));
      }

      return filtered
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map((d) => ({
          ...d,
          matchPercentage: Math.min(98, Math.max(65, Math.round((d.score / maxPossibleScore) * 100))),
        }));
    },
    [destinations],
  );

  const handleAnswer = useCallback(
    async (questionId: string, answer: string) => {
      setSelectedOption(answer);

      const newAnswers = { ...answers, [questionId]: answer };
      setAnswers(newAnswers);

      await new Promise((resolve) => setTimeout(resolve, 300));

      if (currentStep < questions.length - 1) {
        setCurrentStep((prev) => prev + 1);
        setSelectedOption(null);
      } else {
        setIsCalculating(true);
        setTimeout(() => {
          const topDestinations = calculateResults(newAnswers);
          setResults(topDestinations);
          setIsCalculating(false);
        }, 1500);
      }
    },
    [answers, currentStep, questions.length, calculateResults],
  );

  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
      setSelectedOption(answers[questions[currentStep - 1].id] || null);
    }
  }, [currentStep, answers, questions]);

  if (results.length > 0) {
    return (
      <ResultsView
        results={results}
        onReset={() => {
          setCurrentStep(0);
          setAnswers({});
          setResults([]);
          setSelectedOption(null);
        }}
        questionCount={questions.length}
      />
    );
  }

  if (isCalculating) {
    return <QuizLoader message="Calcul de vos resultats..." subMessage={`Analyse de ${destinations.length} destinations selon ${Object.keys(answers).length} criteres`} />;
  }

  return (
    <QuestionView
      currentStep={currentStep}
      questions={questions}
      selectedOption={selectedOption}
      onAnswer={handleAnswer}
      onPrevious={handlePrevious}
      answers={answers}
    />
  );
};

export default DestinationsQuiz;
