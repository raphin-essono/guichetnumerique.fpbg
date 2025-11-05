// Types et interfaces pour le backend FPBG (renommés en français)

import { Request } from 'express';

/// ==============================
/// DTOs d'authentification
/// ==============================

export interface ConnexionDTO {
  email: string;
  motDePasse: string;
}

// Ancien LoginVM conservé pour compatibilité temporaire
export interface LoginVM {
  email: string; // Correspond à l'email
  motDePasse: string;
}

/// ==============================
/// DTOs d'inscription
/// ==============================

export interface UtilisateurDTO {
  email: string;
  motDePasse: string;
  prenom?: string;
  nom?: string;
  telephone?: string;
  nomUtilisateur?: string;
  adressePostale?: string;
  adressePhysique?: string;
  typeUtilisateur?: string;
}

// Ancien FpbgUsersDTO conservé pour compatibilité temporaire
export interface FpbgUsersDTO {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  numTel?: string;
  postalAddress?: string;
  physicalAddress?: string;
  userType?: string;
}

export interface OrganisationDTO {
  // Informations organisation
  nom_organisation: string;
  email: string;
  motDePasse?: string;
  type?: string;
  telephone?: string;
  adressePostale?: string;
  adressePhysique?: string;

  // Informations supplémentaires du formulaire
  couvertureGeographique?: string;
  typeSubvention?: string; // "Petite subvention" | "Moyenne subvention"

  // Personne de contact (Utilisateur)
  prenom?: string;
  nom?: string;
  personneContact?: string;
  fonction?: string;
  telephoneContact?: string;
}

/// ==============================
/// DTOs pour les demandes de subvention
/// ==============================

export interface DemandeSubventionDTO {
  id?: string;
  idOrganisation?: string;
  idAppelProjets?: string;
  idSoumisPar?: string;

  // Métadonnées
  statut?: string;
  typeSoumission?: string;

  // Étape 1 — Proposition
  titre?: string;
  localisation?: string;
  groupeCible?: string;
  justificationContexte?: string;

  // Étape 2 — Objectifs & résultats
  objectifs?: string;
  resultatsAttendus?: string;
  dureeMois?: number;

  // Étape 3 — Activités
  dateDebutActivites?: Date | string;
  dateFinActivites?: Date | string;
  resumeActivites?: string;

  // Budget
  tauxUsd?: number;
  fraisIndirectsCfa?: number;
  terrainCfa?: number;
  investCfa?: number;
  overheadCfa?: number;
  cofinCfa?: number;

  // Autres
  stadeProjet?: string;
  aFinancement?: boolean;
  detailsFinancement?: string;
  honneurAccepte?: boolean;
  texteDurabilite?: string;
  texteReplication?: string;
}

// Ancien ProjetFormDTO conservé pour compatibilité temporaire
export interface ProjetFormDTO {
  id?: string;
  organisationId?: string;
  title?: string;
  actPrin?: string;
  dateLimPro?: Date | string | null;
  rAtt?: string;
  objP?: string;
  conjP?: string;
  lexGcp?: string;
  poRistEnvSoPo?: string;
  dPRep?: string;
  conseilPr?: string;
  stade?: string;
  funding?: string;
  username?: string;
  email?: string;
  password?: string;
  numTel?: string;
  postalAddress?: string;
  physicalAddress?: string;
}

/// ==============================
/// DTOs pour les activités
/// ==============================

export interface ActiviteDTO {
  id?: string;
  idDemande: string;
  ordre?: number;
  titre: string;
  debut: Date | string;
  fin: Date | string;
  resume: string;
}

export interface SousActiviteDTO {
  id?: string;
  idActivite: string;
  ordre?: number;
  libelle: string;
  resume?: string;
}

export interface LigneBudgetDTO {
  id?: string;
  idActivite: string;
  ordre?: number;
  libelle: string;
  type: 'DIRECT' | 'INDIRECT';
  cfa: number;
  pctFpbg?: number;
  pctCofin?: number;
}

/// ==============================
/// DTOs pour les risques et pièces jointes
/// ==============================

export interface RisqueDTO {
  id?: string;
  idDemande: string;
  ordre?: number;
  description: string;
  mitigation: string;
}

export interface PieceJointeDTO {
  id?: string;
  idDemande: string;
  cle: string;
  nomFichier: string;
  typeMime: string;
  tailleOctets: number;
  cleStockage: string;
  url?: string;
  requis?: boolean;
}

/// ==============================
/// JWT & Auth
/// ==============================

export interface JwtPayload {
  userId: string;
  email: string;
  userType?: string;
  role?: string;
}

export interface AuthUser {
  userId: string;
  role?: 'UTILISATEUR' | 'ADMINISTRATEUR';
  email: string; // Ajout pour votre nouvelle propriété
}

export interface AuthRequest extends Request {
  user: AuthUser;
}

/// ==============================
/// Réponses API
/// ==============================

export interface ReponseAuthDTO {
  message: string;
  token: string;
  user: any;
  type: 'user' | 'organisation' | 'utilisateur';
  role?: 'UTILISATEUR' | 'ADMINISTRATEUR'; // ✅ Rôle de l'utilisateur
  redirectTo?: string; // ✅ URL de redirection basée sur le rôle
}

export interface ReponseSuccesDTO {
  message: string;
  data?: any;
}

export interface ReponseErreurDTO {
  message: string;
  errors?: string[];
  statusCode?: number;
}

/// ==============================
/// Filtres et pagination
/// ==============================

export interface FiltresDemandeSubvention {
  statut?: string;
  typeSoumission?: string;
  idOrganisation?: string;
  idAppelProjets?: string;
  dateDebut?: Date | string;
  dateFin?: Date | string;
}

export interface OptionsPagination {
  page?: number;
  limit?: number;
  orderBy?: string;
  order?: 'asc' | 'desc';
}

export interface ReponsePaginee<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
