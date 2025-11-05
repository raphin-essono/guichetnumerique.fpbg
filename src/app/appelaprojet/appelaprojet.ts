import { Component, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

type GrantCycleStep = { step: string; dates: string };
type GrantInfo = {
  name: 'Petite subvention' | 'Subvention moyenne';
  amountMin: number; // FCFA
  amountMax: number; // FCFA
  durationMaxMonths: number;
  launchDate: string; // ISO or parseable
  deadlineNoteConceptuelle: string; // parseable
  cycle: GrantCycleStep[];
};
type Thematique = { title: string; bullets: string[] };

type AAP = {
  id: string;
  code: string;
  titre: string;
  resume: string;
  contexte: string;
  objectif: string;
  contactEmail: string;
  geographicEligibility: string[];
  eligibleOrganisations: string[];
  eligibleActivities: string[];
  cofinancement: string;
  annexes: string[];
  grants: GrantInfo[];
  thematiquesPetites: Thematique[];
  thematiquesMoyennes: Thematique[];
};

// ————————————————————————————————————————————
// Données de l’appel (extraites du document FPBG).
// Plus tard, ces données viendront d’une API / service.
// ————————————————————————————————————————————
const AAP_DATA: AAP = {
  id: 'aap-obl-2025',
  code: 'AAP-OBL-2025',
  titre: 'Appel à projets pour la conservation marine et littorale',
  resume:
    `Le FPBG (Fonds de Préservation de la Biodiversité au Gabon) lance, via le mécanisme des Obligations Bleues, ` +
    `un appel visant à soutenir des initiatives concrètes et innovantes de protection, restauration, sensibilisation ` +
    `et gestion durable des écosystèmes marins et littoraux au Gabon.`,
  contexte:
    `Le Gabon abrite des écosystèmes marins et littoraux riches mais vulnérables (océan, estuaires, mangroves, ` +
    `lagunes, plages, exutoires). L’appel cible des actions locales à fort impact environnemental et socio-économique.`,
  objectif:
    `Financer des projets portés par des acteurs locaux en faveur de la préservation des milieux marins et littoraux. ` +
    `Les petites subventions visent des projets pilotes à court terme ; les subventions moyennes soutiennent des actions ` +
    `structurantes à moyen/long terme.`,
  contactEmail: 'contact@fpbg.org',
  geographicEligibility: [
    'Projets mis en œuvre au Gabon',
    'Impact dans les zones marines et littorales (océan, estuaires, mangroves, lagunes, plages, exutoires)'
  ],
  eligibleOrganisations: [
    'Secteur privé (PME, PMI, Startups)',
    'ONG & Associations',
    'Coopératives communautaires',
    'Communautés organisées',
    'Entités gouvernementales',
    'Organismes de recherche'
  ],
  eligibleActivities: [
    'Matériels de pêche / conditionnement / transformation des ressources halieutiques',
    'Infrastructures contribuant à la pêche durable et à la conservation littorale',
    'Formations, ateliers, campagnes de sensibilisation',
    'Activités de terrain (collecte de déchets, planting, restauration d’habitats)',
    'Études scientifiques, enquêtes environnementales',
    'Frais de fonctionnement directement liés au projet (gestion, logistique)',
    'Frais indirects plafonnés à 10 % du budget total (administration, gestion financière…)',
    'NB : une liste d’exclusions est disponible sur le site fpbg.org'
  ],
  cofinancement:
    `Les projets peuvent être cofinancés. Une contrepartie en nature ou financière est encouragée mais non obligatoire.`,
  annexes: [
    'Formulaire de Note Conceptuelle complété',
    'Lettre de motivation du porteur',
    'Statuts & règlement intérieur (ONG/Coopératives)',
    'Fiche circuit (PME, PMI, Startup)',
    'RIB de l’organisation',
    'Copie d’agrément ou récépissé d’existence',
    'CV du porteur et des responsables techniques',
    'Budget détaillé du projet',
    'Chronogramme d’exécution',
    'Cartographie/localisation du projet (si disponible)',
    'Lettre de partenariat / de soutien (facultative)'
  ],
  grants: [
    {
      name: 'Petite subvention',
      amountMin: 5_000_000,
      amountMax: 50_000_000,
      durationMaxMonths: 12,
      launchDate: '2025-09-22',
      deadlineNoteConceptuelle: '2025-11-23',
      cycle: [
        { step: `Publication de l'appel d'offre – Petite Subvention`, dates: '22 septembre 2025' },
        { step: 'Réception des Notes Conceptuelles', dates: '22 sept. → 23 nov. 2025' },
        { step: 'Analyse des demandes', dates: '24 nov. → 21 déc. 2025' },
        { step: 'Communication des résultats', dates: '22 → 31 déc. 2025' },
        { step: 'Vérifications & préparation des contrats', dates: '02 → 18 janv. 2026' },
        { step: 'Signature des contrats & suivi des décaissements', dates: '19 janv. → 08 fév. 2026' }
      ]
    },
    {
      name: 'Subvention moyenne',
      amountMin: 51_000_000,
      amountMax: 200_000_000,
      durationMaxMonths: 24,
      launchDate: '2025-09-22',
      deadlineNoteConceptuelle: '2025-11-23',
      cycle: [
        { step: `Publication de l'appel d'offre – Subvention moyenne`, dates: '22 septembre 2025' },
        { step: 'Réception des Notes Conceptuelles', dates: '22 sept. → 23 nov. 2025' },
        { step: 'Résultats de présélection', dates: '22 → 31 déc. 2025' },
        { step: 'Réception des Propositions Complètes (présélectionnés)', dates: '02 janv. → 22 fév. 2026' },
        { step: 'Analyse des Propositions Complètes', dates: '23 fév. → 06 avr. 2026' },
        { step: 'Communication des résultats', dates: '06 → 12 avr. 2026' },
        { step: 'Vérifications & moralité des demandeurs', dates: '13 → 19 avr. 2026' },
        { step: 'Préparation des contrats', dates: '20 avr. → 03 mai 2026' }
        // Signature & décaissements : communiqué ultérieurement si besoin
      ]
    }
  ],
  thematiquesPetites: [
    {
      title: 'Pêche communautaire durable',
      bullets: [
        'Mécanismes de cogestion impliquant communautés et autorités',
        'Diversification des moyens de subsistance (aquaculture durable, valorisation des produits halieutiques, écotourisme)',
        'Capacités locales : surveillance, suivi des captures, lutte contre la pêche illégale',
        'Matériels de pêche durables et adaptés'
      ]
    },
    {
      title: 'Valorisation des savoirs locaux & chaîne de valeur',
      bullets: [
        'Infrastructures durables, dotations en matériel (production/transformation/distribution)',
        'Mise en pratique des savoirs locaux dans la pêche durable',
        'Recherche/synthèse sur l’intégration des savoirs locaux'
      ]
    },
    {
      title: 'Cartographie & restauration d’habitats littoraux pollués/dégradés',
      bullets: ['Programmes de recherche', 'Restauration des berges et exutoires', 'Planting de mangrove']
    },
    {
      title: 'Connaissances du milieu marin',
      bullets: ['Programmes de recherche', 'Inventaires', 'Suivi et évaluation des stocks']
    },
    {
      title: 'Interactions Homme / Faune aquatique',
      bullets: ['Programmes de recherche incluant un volet vulgarisation']
    },
    {
      title: 'Économie bleue',
      bullets: [
        'Filières économiques durables liées à la mer (biotech, tourisme durable, gestion des déchets, etc.)',
        'Transparence, traçabilité et durabilité de l’exploitation des ressources marines'
      ]
    },
    {
      title: 'Réduction de la pollution plastique',
      bullets: ['Assainissement des mangroves et exutoires', 'Valorisation des déchets plastiques', 'Alternatives au plastique']
    },
    {
      title: 'Sensibilisation environnementale',
      bullets: ['Information & éducation', 'Contenus pédagogiques et récréatifs (ateliers, etc.)']
    },
    {
      title: 'Renforcement des capacités / accompagnement',
      bullets: [
        'Structuration de coopératives, pêcheries et initiatives locales',
        'Formations (outils, orga, pêche durable, transformation/conditionnement)',
        'Dotation en matériel'
      ]
    },
    {
      title: 'Caractérisation des écosystèmes littoraux & marins',
      bullets: ['Projets de recherche (incluant achats de matériel scientifique)']
    }
  ],
  thematiquesMoyennes: [
    {
      title: 'Implication des communautés locales dans la gestion durable du milieu marin',
      bullets: [
        'Structuration / création de coopératives ou PME/PMI dédiées à la gestion durable des ressources halieutiques',
        'Appui à la mise en œuvre des techniques de pêche durable (formation, consultation, accompagnement)',
        'Dotation en matériel adapté à la pêche durable'
      ]
    }
  ]
};

@Component({
  selector: 'appelaprojet',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './appelaprojet.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Appelaprojet {
  readonly aap = signal<AAP>(AAP_DATA);

  // Section ouverte (accordéon)
  readonly open = signal<string | null>('thematiques');

  toggle(section: string) {
    this.open.set(this.open() === section ? null : section);
  }

  // Helpers
  fmtCurrency = (n: number) => n.toLocaleString('fr-FR') + ' FCFA';

  grantDeadlineLabel = (g: GrantInfo) => {
    const dl = new Date(g.deadlineNoteConceptuelle);
    const today = new Date();
    const ms = dl.getTime() - today.getTime();
    const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
    if (isNaN(days)) return '—';
    return days >= 0 ? `Clôture dans J-${days}` : `Clôturé (depuis ${Math.abs(days)} j)`;
  };

  timelineBadge = (g: GrantInfo) =>
    `${this.fmtCurrency(g.amountMin)} — ${this.fmtCurrency(g.amountMax)} · ${g.durationMaxMonths} mois max`;
}
