/**
 * ==============================
 * Modèles TypeScript Frontend - FPBG
 * ==============================
 * Interfaces alignées sur le schema Prisma français (backend/prisma/schema.prisma)
 * Tous les noms et champs sont en français pour correspondre au PDF d'appel à projet
 */

/// ==============================
/// Enums (référentiels fixes)
/// ==============================

export enum Role {
  UTILISATEUR = 'UTILISATEUR',
  ADMINISTRATEUR = 'ADMINISTRATEUR',
}

export enum TypeOrganisation {
  ASSOCIATION = 'ASSOCIATION',
  ONG = 'ONG',
  COMMUNAUTE = 'COMMUNAUTE',
  COOPERATIVE = 'COOPERATIVE',
  PME = 'PME',
  PMI = 'PMI',
  STARTUP = 'STARTUP',
  SECTEUR_PUBLIC = 'SECTEUR_PUBLIC',
  RECHERCHE = 'RECHERCHE',
  PRIVE = 'PRIVE',
  AUTRE = 'AUTRE',
}

export enum StadeProjet {
  CONCEPTION = 'CONCEPTION',
  DEMARRAGE = 'DEMARRAGE',
  AVANCE = 'AVANCE',
  PHASE_FINALE = 'PHASE_FINALE',
}

export enum TypeBudget {
  DIRECT = 'DIRECT',
  INDIRECT = 'INDIRECT',
}

export enum CleDocument {
  NOTE_CONCEPTUELLE = 'NOTE_CONCEPTUELLE',
  LETTRE_MOTIVATION = 'LETTRE_MOTIVATION',
  BUDGET_DETAILLE = 'BUDGET_DETAILLE',
  CHRONOGRAMME = 'CHRONOGRAMME',
  CV_RESPONSABLES = 'CV_RESPONSABLES',
  RIB = 'RIB',
  STATUTS_REGLEMENT = 'STATUTS_REGLEMENT',
  FICHE_CIRCUIT = 'FICHE_CIRCUIT',
  AGREMENT = 'AGREMENT',
  CARTOGRAPHIE = 'CARTOGRAPHIE',
  LETTRES_SOUTIEN = 'LETTRES_SOUTIEN',
  CERTIFICAT_ENREGISTREMENT = 'CERTIFICAT_ENREGISTREMENT',
  PV_ASSEMBLEE = 'PV_ASSEMBLEE',
  RAPPORTS_FINANCIERS = 'RAPPORTS_FINANCIERS',
  RCCM = 'RCCM',
  ETATS_FINANCIERS = 'ETATS_FINANCIERS',
  DOCUMENTS_STATUTAIRES = 'DOCUMENTS_STATUTAIRES',
  PREUVE_NON_FAILLITE = 'PREUVE_NON_FAILLITE',
}

export enum StatutSoumission {
  BROUILLON = 'BROUILLON',
  SOUMIS = 'SOUMIS',
  EN_REVUE = 'EN_REVUE',
  APPROUVE = 'APPROUVE',
  REJETE = 'REJETE',
}

export enum TypeSoumission {
  NOTE_CONCEPTUELLE = 'NOTE_CONCEPTUELLE',
  PROPOSITION_COMPLETE = 'PROPOSITION_COMPLETE',
}

/// ==============================
/// Interfaces Auth / Comptes
/// ==============================

export interface Utilisateur {
  id: string;
  email: string;
  prenom?: string;
  nom?: string;
  telephone?: string;
  role: Role;
  actif: boolean;
  organisation?: Organisation;
  idOrganisation?: string;
  creeLe: Date | string;
  misAJourLe: Date | string;
}

export interface Session {
  id: string;
  jeton: string;
  idUtilisateur: string;
  agentUtilisateur?: string;
  ip?: string;
  expireLe: Date | string;
  creeLe: Date | string;
}

/// ==============================
/// Interfaces Référentiels
/// ==============================

export interface TypeSubvention {
  id: number;
  code: string; // "PETITE" | "MOYENNE"
  libelle: string;
  montantMinCfa: number;
  montantMaxCfa: number;
  dureeMaxMois: number;
}

export interface AppelProjets {
  id: string;
  code: string; // ex: AAP-OBL-2025
  titre: string;
  description?: string;
  dateDebut: Date | string;
  dateFin: Date | string;
  etapes?: any; // JSON chronogramme
  typeSubvention?: TypeSubvention;
  idTypeSubvention?: number;
  thematiques?: Thematique[];
  creeLe: Date | string;
  misAJourLe: Date | string;
}

export interface Thematique {
  id: string;
  idAppelProjets: string;
  titre: string;
  points: string[]; // Liste de points / exigences
  ordre: number;
  typeSubvention?: TypeSubvention;
  idTypeSubvention: number;
  creeLe: Date | string;
  misAJourLe: Date | string;
}

/// ==============================
/// Interfaces Organisation
/// ==============================

export interface Organisation {
  id: string;
  nom: string;
  type: TypeOrganisation;
  email?: string;
  telephone?: string;
  utilisateurs?: Utilisateur[];
  projets?: DemandeSubvention[];
  creeLe: Date | string;
  misAJourLe: Date | string;
}

export interface LienAppelOrganisation {
  id: string;
  idAppelProjets: string;
  idOrganisation: string;
  statut?: string;
  dateDebut?: Date | string;
  dateFin?: Date | string;
}

/// ==============================
/// Interface DemandeSubvention (Projet)
/// ==============================

export interface DemandeSubvention {
  id: string;
  code?: string;
  statut: StatutSoumission;
  typeSoumission: TypeSoumission;
  idParent?: string;

  // Relations
  appelProjets?: AppelProjets;
  idAppelProjets?: string;
  organisation?: Organisation;
  idOrganisation?: string;
  soumisPar?: Utilisateur;
  idSoumisPar?: string;

  // Étape 1 — Proposition
  titre: string;
  localisation: string;
  groupeCible: string;
  justificationContexte: string;
  domaines?: string[]; // Conservation marine, Restauration des écosystèmes, etc.

  // Champs optionnels pour l'affichage
  description?: string;
  montantTotal?: number;

  // Étape 2 — Objectifs & résultats
  objectifs: string;
  resultatsAttendus: string;
  dureeMois: number;

  // Étape 3 — Activités
  dateDebutActivites: Date | string;
  dateFinActivites: Date | string;
  resumeActivites: string;

  // Dates du projet (pour l'affichage)
  dateDebut?: Date | string;
  dateFin?: Date | string;

  // Relations activités/risques/pièces
  activites?: Activite[];
  risques?: Risque[];
  piecesJointes?: PieceJointe[];
  evaluations?: Evaluation[];
  contrat?: Contrat;
  rapports?: Rapport[];
  // cofinanceurs?: Cofinanceur[];  // COMMENTÉ - Cofinanceur désactivé

  // Budget
  tauxUsd: number;
  fraisIndirectsCfa: number;
  terrainCfa?: number;
  investCfa?: number;
  overheadCfa?: number;
  cofinCfa?: number;

  // Autres
  stadeProjet: StadeProjet;
  aFinancement: boolean;
  detailsFinancement?: string;
  honneurAccepte: boolean;
  texteDurabilite: string;
  texteReplication?: string;

  creeLe: Date | string;
  misAJourLe: Date | string;
}

/// ==============================
/// Interfaces Activités & Budget
/// ==============================

export interface Activite {
  id: string;
  idDemande: string;
  idLienAppelOrganisation?: string;
  ordre: number;
  titre: string;
  debut: Date | string;
  fin: Date | string;
  resume: string;
  sousActivites?: SousActivite[];
  lignesBudget?: LigneBudget[];
}

export interface SousActivite {
  id: string;
  idActivite: string;
  ordre: number;
  libelle: string;
  resume?: string;
}

export interface LigneBudget {
  id: string;
  idActivite: string;
  ordre: number;
  libelle: string;
  type: TypeBudget;
  cfa: number;
  pctFpbg: number;
  pctCofin: number;
}

/// ==============================
/// Interfaces Risques & Pièces Jointes
/// ==============================

export interface Risque {
  id: string;
  idDemande: string;
  ordre: number;
  description: string;
  mitigation: string;
}

export interface PieceJointe {
  id: string;
  idDemande: string;
  cle: CleDocument;
  nomFichier: string;
  typeMime: string;
  tailleOctets: number;
  cleStockage: string;
  url?: string;
  requis: boolean;
  telechargeLe: Date | string;
  valideLe?: Date | string;
  idValidateur?: string;
}

/// ==============================
/// Interfaces Suivi Post-Soumission
/// ==============================

export interface Evaluation {
  id: string;
  idDemande: string;
  idEvaluateur: string;
  evaluateur?: Utilisateur;
  score?: number;
  commentaires?: string;
  criteres?: any; // JSON
  creeLe: Date | string;
  misAJourLe: Date | string;
}

export interface Contrat {
  id: string;
  idDemande: string;
  signeLe?: Date | string;
  planningDecaissement?: any; // JSON
  creeLe: Date | string;
  misAJourLe: Date | string;
}

export interface Rapport {
  id: string;
  idDemande: string;
  type: string; // "intermediaire" | "final"
  dateEcheance: Date | string;
  soumisLe?: Date | string;
  contenu?: string;
  creeLe: Date | string;
  misAJourLe: Date | string;
}

// COMMENTÉ - Interface Cofinanceur désactivée
// export interface Cofinanceur {
//   id: string;
//   idDemande: string;
//   source: string;
//   montant: number;
//   enNature: boolean;
//   creeLe: Date | string;
//   misAJourLe: Date | string;
// }

export interface JournalAudit {
  id: string;
  entite: string;
  idEntite: string;
  action: string;
  idUtilisateur?: string;
  details?: any; // JSON
  creeLe: Date | string;
}

/// ==============================
/// DTOs pour les formulaires
/// ==============================

/**
 * DTO pour l'inscription d'une organisation
 */
export interface InscriptionOrganisationDTO {
  // Organisation
  nomOrganisation: string;
  typeOrganisation: TypeOrganisation;
  emailOrganisation: string;
  telephoneOrganisation: string;
  couvertureGeographique: string;
  typeSubvention: string; // "Petite subvention" | "Moyenne subvention"

  // Utilisateur (personne de contact)
  prenom: string;
  nom: string;
  personneContact: string;
  fonction?: string;
  telephone: string;
  email: string;
  motDePasse: string;
}

/**
 * DTO pour la connexion
 */
export interface ConnexionDTO {
  email: string;
  motDePasse: string;
}

/**
 * DTO pour la réponse d'authentification
 */
export interface ReponseAuthDTO {
  message: string;
  token: string;
  utilisateur: Utilisateur;
  type: 'utilisateur' | 'organisation';
  redirectTo?: string;
}

/**
 * DTO pour la création d'une demande de subvention
 */
export interface CreationDemandeSubventionDTO {
  idAppelProjets: string;
  idOrganisation: string;
  typeSoumission: TypeSoumission;

  // Étape 1
  titre: string;
  localisation: string;
  groupeCible: string;
  justificationContexte: string;

  // Étape 2
  objectifs: string;
  resultatsAttendus: string;
  dureeMois: number;

  // Étape 3
  dateDebutActivites: Date | string;
  dateFinActivites: Date | string;
  resumeActivites: string;

  // Autres
  stadeProjet: StadeProjet;
  aFinancement: boolean;
  detailsFinancement?: string;
  texteDurabilite: string;
  texteReplication?: string;
}

/// ==============================
/// Utilitaires de mapping
/// ==============================

/**
 * Labels pour les types d'organisation (affichage UI)
 */
export const LABELS_TYPE_ORGANISATION: Record<TypeOrganisation, string> = {
  [TypeOrganisation.ASSOCIATION]: 'Association',
  [TypeOrganisation.ONG]: 'ONG',
  [TypeOrganisation.COMMUNAUTE]: 'Communauté organisée',
  [TypeOrganisation.COOPERATIVE]: 'Coopérative communautaire',
  [TypeOrganisation.PME]: 'PME (Petite et Moyenne Entreprise)',
  [TypeOrganisation.PMI]: 'PMI (Petite et Moyenne Industrie)',
  [TypeOrganisation.STARTUP]: 'Startup',
  [TypeOrganisation.SECTEUR_PUBLIC]: 'Entité gouvernementale',
  [TypeOrganisation.RECHERCHE]: 'Organisme de recherche',
  [TypeOrganisation.PRIVE]: 'Secteur privé',
  [TypeOrganisation.AUTRE]: 'Autre',
};

/**
 * Labels pour les statuts de soumission (affichage UI)
 */
export const LABELS_STATUT_SOUMISSION: Record<StatutSoumission, string> = {
  [StatutSoumission.BROUILLON]: 'Brouillon',
  [StatutSoumission.SOUMIS]: 'Soumis',
  [StatutSoumission.EN_REVUE]: 'En cours de révision',
  [StatutSoumission.APPROUVE]: 'Approuvé',
  [StatutSoumission.REJETE]: 'Rejeté',
};

/**
 * Couleurs pour les statuts (affichage UI)
 */
export const COULEURS_STATUT_SOUMISSION: Record<StatutSoumission, string> = {
  [StatutSoumission.BROUILLON]: 'bg-gray-100 text-gray-700',
  [StatutSoumission.SOUMIS]: 'bg-blue-100 text-blue-700',
  [StatutSoumission.EN_REVUE]: 'bg-yellow-100 text-yellow-700',
  [StatutSoumission.APPROUVE]: 'bg-green-100 text-green-700',
  [StatutSoumission.REJETE]: 'bg-red-100 text-red-700',
};

/**
 * Labels pour les clés de documents (affichage UI)
 */
export const LABELS_CLE_DOCUMENT: Record<CleDocument, string> = {
  [CleDocument.NOTE_CONCEPTUELLE]: 'Note conceptuelle',
  [CleDocument.LETTRE_MOTIVATION]: 'Lettre de motivation',
  [CleDocument.BUDGET_DETAILLE]: 'Budget détaillé',
  [CleDocument.CHRONOGRAMME]: 'Chronogramme des activités',
  [CleDocument.CV_RESPONSABLES]: 'CV des responsables du projet',
  [CleDocument.RIB]: "RIB (Relevé d'Identité Bancaire)",
  [CleDocument.STATUTS_REGLEMENT]: 'Statuts et règlement intérieur',
  [CleDocument.FICHE_CIRCUIT]: 'Fiche de circuit touristique',
  [CleDocument.AGREMENT]: 'Agrément',
  [CleDocument.CARTOGRAPHIE]: 'Cartographie de la zone',
  [CleDocument.LETTRES_SOUTIEN]: 'Lettres de soutien',
  [CleDocument.CERTIFICAT_ENREGISTREMENT]: "Certificat d'enregistrement",
  [CleDocument.PV_ASSEMBLEE]: "PV de l'assemblée générale",
  [CleDocument.RAPPORTS_FINANCIERS]: 'Rapports financiers',
  [CleDocument.RCCM]: 'RCCM (Registre de Commerce)',
  [CleDocument.ETATS_FINANCIERS]: 'États financiers',
  [CleDocument.DOCUMENTS_STATUTAIRES]: 'Documents statutaires',
  [CleDocument.PREUVE_NON_FAILLITE]: 'Preuve de non-faillite',
};
