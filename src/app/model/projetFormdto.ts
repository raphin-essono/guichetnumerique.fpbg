import { OrganisationDTO } from "./organisationdto";
import { TypeOrganisation } from "./typeorganisation";

export interface ProjetFormDTO {
  id?:number;
  // Identité organisme
  idOrganisme?: OrganisationDTO;

  // Champs projet
  //activités principales
  actPrin?: string;
  // date limite estimée
  dateLimPro?: Date | string | null; // Date ou ISO string
  //resultat attendu
  rAtt?: string;
  //objectif de projet
  objP?: string;
  // Contexte & justification
  conjP?: string;
 // Lieu d'exécution & groupe cible
  lexGcp?: string;
  // Titre du projet
  title?: string;
  //date de creation
  dateCreation?: Date | string | null;
  //potentiel risque
  poRistEnvSoPo?: string;
  //durabilité et potentiel experience du projet
  dPRep?: string;
  //conseil pratique pour la redaction
  conseilPr?: string;

  // Fichiers (File côté front)
  cv?: File[];            // plusieurs CV
  //fiche circuit pour les pme,pmi et startup
  ficheC?: File | null;
  //lettre de motivation
  lM?: File | null;
  //statuts et règlement interieur pour les ONG
  stR?: File | null;
  //rib
  rib?: File | null;
  //copie de l'agrement
  cA?: File | null;
  //budget destimation
  budgetD?: File | null;
  //chronogramme d'execution
  che?: File | null;
  cartography?: File | null;
  //lettre de soutien//partenariat
  lP?: File | null;

  // État d'avancement
  stade?: string;
  funding?: string;
  
  // Utilisateur
  username?: string;
  email?: string;
  password?: string;
  numTel?: string;
  postalAddress?: string;
  physicalAddress?: string;
}
