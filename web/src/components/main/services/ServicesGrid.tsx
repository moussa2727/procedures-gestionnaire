'use client';

import { Plane } from 'lucide-react';

const services = [
  // ===== SERVICES ÉTUDES À L'ÉTRANGER =====
  {
    id: 1,
    title: 'Orientation et choix de destination',
    description:
      'Nous vous aidons à choisir la destination et le programme qui correspondent le mieux à votre profil, vos objectifs académiques et votre budget.',
    tags: ['Bacheliers', 'Masters / MBA', 'Grandes Écoles'],
    features: [
      'Analyse de votre profil académique',
      'Identification de vos objectifs',
      'Sélection des destinations adaptées',
      'Comparaison des programmes',
      'Conseils personnalisés',
    ],
  },
  {
    id: 2,
    title: 'Accompagnement administratif',
    description:
      "Nous vous guidons à travers toutes les démarches administratives pour une inscription en toute sérénité dans l'établissement de votre choix.",
    tags: ['Inscription', 'Dossiers', 'Calendrier'],
    features: [
      'Aide à la constitution du dossier',
      'Vérification des documents requis',
      'Suivi des inscriptions',
      'Traduction de documents',
      'Gestion des délais',
    ],
  },
  {
    id: 3,
    title: 'Préparation aux tests de langue',
    description:
      'Bénéficiez de ressources et de conseils pour réussir vos tests de langue (TOEFL, IELTS, TCF, DALF, etc.) et atteindre le niveau requis au de notre partenaire ghanéen qui propose des cours dédiés.',
    tags: ['TOEFL', 'IELTS', 'TCF', 'DALF'],
    features: [
      'Tests blancs',
      "Ressources d'entraînement",
      'Conseils méthodologiques',
      "Simulations d'examen",
      'Suivi de progression',
    ],
  },
  {
    id: 4,
    title: 'Recherche de logement',
    description:
      "Nous vous aidons à trouver un logement adapté à vos besoins et à votre budget dans votre pays d'accueil.",
    tags: ['Location', 'Garantie', 'Installation'],
    features: [
      'Recherche personnalisée',
      'Vérification des annonces',
      'Aide à la réservation',
      'Conseils sur les quartiers',
      "Assistance à l'installation",
    ],
  },
  {
    id: 5,
    title: 'Obtention du visa étudiant',
    description:
      "Nous vous accompagnons dans toutes les étapes de votre demande de visa étudiant, de la constitution du dossier à l'entretien consulaire.",
    tags: ['Visa long séjour', 'Titre de séjour', 'Juridique'],
    features: [
      'Préparation du dossier',
      "Simulation d'entretien",
      'Suivi de la demande',
      'Conseils personnalisés',
      'Assistance en cas de problème',
    ],
  },
  {
    id: 6,
    title: 'Accueil et intégration',
    description:
      "Nous vous aidons à préparer votre arrivée et à vous intégrer dans votre nouveau pays d'accueil.",
    tags: ['Briefing culturel', 'Logistique', 'Arrivée'],
    features: [
      'Guide de préparation au départ',
      'Informations pratiques',
      "Aide à l'ouverture de compte bancaire",
      'Conseils pour les transports',
      "Mise en relation avec d'autres étudiants",
    ],
  },
  {
    id: 7,
    title: "Accompagnement pour études à l'étranger",
    description:
      'Conseils personnalisés et accompagnement dans vos démarches pour étudier dans les meilleures universités internationales.',
    tags: ['Universités', 'International', 'Personnalisé'],
    features: [
      'Orientation universitaire personnalisée',
      'Aide au choix des filières',
      'Accompagnement post-inscription',
      'Suivi personnalisé tout au long du processus',
    ],
  },
  {
    id: 8,
    title: "Organisation de voyages d'affaires",
    description:
      "Planification complète de vos déplacements professionnels à l'international avec un service premium.",
    tags: ['Voyages', 'Affaires', 'Premium'],
    features: [
      'Réservation de vols et hébergements',
      'Gestion des transports sur place',
      'Assistance 24h/24',
      'Planning personnalisé',
      'Service VIP en aéroport',
    ],
  },
  {
    id: 9,
    title: "Assistance dans les démarches de visa",
    description:
      'Accompagnement expert pour vos demandes de visa, avec suivi personnalisé et optimisation des dossiers.',
    tags: ['Visa', 'Juridique', 'Suivi'],
    features: [
      'Vérification de la conformité des pièces',
      'Optimisation du dossier',
      'Suivi en temps réel',
      "Conseils pour l'entretien",
      'Gestion des délais et urgences',
    ],
  },
];

export const ServicesGrid = () => {
  return (
    <section className="py-12 bg-white mt-5">
      <div className="container mx-auto px-4 md:px-6">
        {/* En-tête */}
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
            Des services adaptés à vos besoins
          </h2>
          <p className="text-base text-gray-600 max-w-2xl mx-auto">
            Que vous soyez au début de votre réflexion ou déjà engagé dans vos démarches, nous avons
            la solution qu'il vous faut.
          </p>
        </div>

        {/* Grille de services - Cartes réduites */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {services.map((service) => (
            <div
              key={service.id}
              className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100 hover:border-gray-200 overflow-hidden"
            >
              <div className="p-5">
                {/* Icône - sans rounded-full */}
                <div className="mb-3">
                  {service.id === 8 ? (
                    <Plane className="w-8 h-8 text-sky-500" strokeWidth={1.5} />
                  ) : (
                    <svg
                      className="w-8 h-8 text-sky-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                  )}
                </div>

                {/* Titre */}
                <h3 className="text-lg font-bold text-gray-900 mb-2">{service.title}</h3>

                {/* Description */}
                <p className="text-gray-600 text-sm leading-relaxed mb-3">{service.description}</p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {service.tags?.map((tag, index) => (
                    <span
                      key={index}
                      className="text-xs font-medium text-sky-600 bg-sky-50 px-2.5 py-0.5 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Features - avec espacement réduit */}
                <ul className="space-y-1.5">
                  {service.features.map((feature, index) => (
                    <li key={index} className="flex items-start text-xs text-gray-600">
                      <svg
                        className="w-3.5 h-3.5 text-sky-500 mr-1.5 mt-0.5 shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesGrid;