-- CreateEnum
CREATE TYPE "Role" AS ENUM ('UTILISATEUR', 'ADMINISTRATEUR');

-- CreateEnum
CREATE TYPE "TypeOrganisation" AS ENUM ('ASSOCIATION', 'ONG', 'COMMUNAUTE', 'COOPERATIVE', 'PME', 'PMI', 'STARTUP', 'SECTEUR_PUBLIC', 'RECHERCHE', 'PRIVE', 'AUTRE');

-- CreateEnum
CREATE TYPE "StadeProjet" AS ENUM ('CONCEPTION', 'DEMARRAGE', 'AVANCE', 'PHASE_FINALE');

-- CreateEnum
CREATE TYPE "TypeBudget" AS ENUM ('DIRECT', 'INDIRECT');

-- CreateEnum
CREATE TYPE "CleDocument" AS ENUM ('LETTRE_MOTIVATION', 'CV', 'CERTIFICAT_ENREGISTREMENT', 'STATUTS_REGLEMENT', 'PV_ASSEMBLEE', 'RAPPORTS_FINANCIERS', 'RCCM', 'AGREMENT', 'ETATS_FINANCIERS', 'DOCUMENTS_STATUTAIRES', 'RIB', 'LETTRES_SOUTIEN', 'PREUVE_NON_FAILLITE', 'CARTOGRAPHIE', 'FICHE_CIRCUIT', 'BUDGET_DETAILLE', 'CHRONOGRAMME');

-- CreateEnum
CREATE TYPE "StatutSoumission" AS ENUM ('BROUILLON', 'SOUMIS', 'EN_REVUE', 'APPROUVE', 'REJETE');

-- CreateEnum
CREATE TYPE "TypeSoumission" AS ENUM ('NOTE_CONCEPTUELLE', 'PROPOSITION_COMPLETE');

-- CreateTable
CREATE TABLE "Utilisateur" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "hashMotPasse" TEXT NOT NULL,
    "prenom" TEXT,
    "nom" TEXT,
    "telephone" TEXT,
    "role" "Role" NOT NULL DEFAULT 'UTILISATEUR',
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "idOrganisation" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "misAJourLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Utilisateur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "jeton" TEXT NOT NULL,
    "idUtilisateur" TEXT NOT NULL,
    "agentUtilisateur" TEXT,
    "ip" TEXT,
    "expireLe" TIMESTAMP(3) NOT NULL,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TypeSubvention" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "montantMinCfa" BIGINT NOT NULL,
    "montantMaxCfa" BIGINT NOT NULL,
    "dureeMaxMois" INTEGER NOT NULL,

    CONSTRAINT "TypeSubvention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppelProjets" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3) NOT NULL,
    "etapes" JSONB,
    "idTypeSubvention" INTEGER,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "misAJourLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppelProjets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Thematique" (
    "id" TEXT NOT NULL,
    "idAppelProjets" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "points" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "idTypeSubvention" INTEGER NOT NULL,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "misAJourLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Thematique_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organisation" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "type" "TypeOrganisation" NOT NULL,
    "email" TEXT,
    "telephone" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "misAJourLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organisation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LienAppelOrganisation" (
    "id" TEXT NOT NULL,
    "idAppelProjets" TEXT NOT NULL,
    "idOrganisation" TEXT NOT NULL,
    "statut" TEXT,
    "dateDebut" TIMESTAMP(3),
    "dateFin" TIMESTAMP(3),

    CONSTRAINT "LienAppelOrganisation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemandeSubvention" (
    "id" TEXT NOT NULL,
    "code" TEXT,
    "statut" "StatutSoumission" NOT NULL DEFAULT 'SOUMIS',
    "typeSoumission" "TypeSoumission" NOT NULL DEFAULT 'NOTE_CONCEPTUELLE',
    "idParent" TEXT,
    "idAppelProjets" TEXT,
    "idOrganisation" TEXT,
    "idSoumisPar" TEXT,
    "titre" TEXT NOT NULL,
    "localisation" TEXT NOT NULL,
    "groupeCible" TEXT NOT NULL,
    "justificationContexte" TEXT NOT NULL,
    "objectifs" TEXT NOT NULL,
    "resultatsAttendus" TEXT NOT NULL,
    "dureeMois" INTEGER NOT NULL,
    "dateDebutActivites" TIMESTAMP(3) NOT NULL,
    "dateFinActivites" TIMESTAMP(3) NOT NULL,
    "resumeActivites" TEXT NOT NULL,
    "tauxUsd" INTEGER NOT NULL DEFAULT 600,
    "fraisIndirectsCfa" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "terrainCfa" DECIMAL(14,2),
    "investCfa" DECIMAL(14,2),
    "overheadCfa" DECIMAL(14,2),
    "cofinCfa" DECIMAL(14,2),
    "stadeProjet" "StadeProjet" NOT NULL DEFAULT 'DEMARRAGE',
    "aFinancement" BOOLEAN NOT NULL DEFAULT false,
    "detailsFinancement" TEXT,
    "honneurAccepte" BOOLEAN NOT NULL DEFAULT false,
    "texteDurabilite" TEXT NOT NULL,
    "texteReplication" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "misAJourLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DemandeSubvention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activite" (
    "id" TEXT NOT NULL,
    "idDemande" TEXT NOT NULL,
    "idLienAppelOrganisation" TEXT,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "titre" TEXT NOT NULL,
    "debut" TIMESTAMP(3) NOT NULL,
    "fin" TIMESTAMP(3) NOT NULL,
    "resume" TEXT NOT NULL,

    CONSTRAINT "Activite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SousActivite" (
    "id" TEXT NOT NULL,
    "idActivite" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "libelle" TEXT NOT NULL,
    "resume" TEXT,

    CONSTRAINT "SousActivite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LigneBudget" (
    "id" TEXT NOT NULL,
    "idActivite" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "libelle" TEXT NOT NULL,
    "type" "TypeBudget" NOT NULL DEFAULT 'DIRECT',
    "cfa" DECIMAL(14,2) NOT NULL,
    "pctFpbg" INTEGER NOT NULL DEFAULT 100,
    "pctCofin" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "LigneBudget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Risque" (
    "id" TEXT NOT NULL,
    "idDemande" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT NOT NULL,
    "mitigation" TEXT NOT NULL,

    CONSTRAINT "Risque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PieceJointe" (
    "id" TEXT NOT NULL,
    "idDemande" TEXT NOT NULL,
    "cle" "CleDocument" NOT NULL,
    "nomFichier" TEXT NOT NULL,
    "typeMime" TEXT NOT NULL,
    "tailleOctets" INTEGER NOT NULL,
    "cleStockage" TEXT NOT NULL,
    "url" TEXT,
    "requis" BOOLEAN NOT NULL DEFAULT false,
    "telechargeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valideLe" TIMESTAMP(3),
    "idValidateur" TEXT,

    CONSTRAINT "PieceJointe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evaluation" (
    "id" TEXT NOT NULL,
    "idDemande" TEXT NOT NULL,
    "idEvaluateur" TEXT NOT NULL,
    "score" DOUBLE PRECISION,
    "commentaires" TEXT,
    "criteres" JSONB,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "misAJourLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Evaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contrat" (
    "id" TEXT NOT NULL,
    "idDemande" TEXT NOT NULL,
    "signeLe" TIMESTAMP(3),
    "planningDecaissement" JSONB,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "misAJourLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contrat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rapport" (
    "id" TEXT NOT NULL,
    "idDemande" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "dateEcheance" TIMESTAMP(3) NOT NULL,
    "soumisLe" TIMESTAMP(3),
    "contenu" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "misAJourLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rapport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cofinanceur" (
    "id" TEXT NOT NULL,
    "idDemande" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "montant" DECIMAL(14,2) NOT NULL,
    "enNature" BOOLEAN NOT NULL DEFAULT false,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "misAJourLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cofinanceur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalAudit" (
    "id" TEXT NOT NULL,
    "entite" TEXT NOT NULL,
    "idEntite" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "idUtilisateur" TEXT,
    "details" JSONB,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JournalAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Otp" (
    "id" TEXT NOT NULL,
    "nomUtilisateur" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expireLe" TIMESTAMP(3) NOT NULL,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Otp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Utilisateur_email_key" ON "Utilisateur"("email");

-- CreateIndex
CREATE INDEX "Utilisateur_idOrganisation_idx" ON "Utilisateur"("idOrganisation");

-- CreateIndex
CREATE UNIQUE INDEX "Session_jeton_key" ON "Session"("jeton");

-- CreateIndex
CREATE INDEX "Session_idUtilisateur_idx" ON "Session"("idUtilisateur");

-- CreateIndex
CREATE UNIQUE INDEX "TypeSubvention_code_key" ON "TypeSubvention"("code");

-- CreateIndex
CREATE UNIQUE INDEX "AppelProjets_code_key" ON "AppelProjets"("code");

-- CreateIndex
CREATE INDEX "AppelProjets_idTypeSubvention_idx" ON "AppelProjets"("idTypeSubvention");

-- CreateIndex
CREATE INDEX "AppelProjets_dateDebut_dateFin_idx" ON "AppelProjets"("dateDebut", "dateFin");

-- CreateIndex
CREATE INDEX "Thematique_idAppelProjets_idTypeSubvention_ordre_idx" ON "Thematique"("idAppelProjets", "idTypeSubvention", "ordre");

-- CreateIndex
CREATE INDEX "Organisation_type_idx" ON "Organisation"("type");

-- CreateIndex
CREATE INDEX "Organisation_nom_idx" ON "Organisation"("nom");

-- CreateIndex
CREATE INDEX "LienAppelOrganisation_idAppelProjets_idx" ON "LienAppelOrganisation"("idAppelProjets");

-- CreateIndex
CREATE INDEX "LienAppelOrganisation_idOrganisation_idx" ON "LienAppelOrganisation"("idOrganisation");

-- CreateIndex
CREATE UNIQUE INDEX "LienAppelOrganisation_idAppelProjets_idOrganisation_key" ON "LienAppelOrganisation"("idAppelProjets", "idOrganisation");

-- CreateIndex
CREATE UNIQUE INDEX "DemandeSubvention_code_key" ON "DemandeSubvention"("code");

-- CreateIndex
CREATE INDEX "DemandeSubvention_idSoumisPar_creeLe_idx" ON "DemandeSubvention"("idSoumisPar", "creeLe");

-- CreateIndex
CREATE INDEX "DemandeSubvention_stadeProjet_statut_idx" ON "DemandeSubvention"("stadeProjet", "statut");

-- CreateIndex
CREATE INDEX "DemandeSubvention_idAppelProjets_idx" ON "DemandeSubvention"("idAppelProjets");

-- CreateIndex
CREATE INDEX "DemandeSubvention_idOrganisation_idx" ON "DemandeSubvention"("idOrganisation");

-- CreateIndex
CREATE INDEX "DemandeSubvention_typeSoumission_idx" ON "DemandeSubvention"("typeSoumission");

-- CreateIndex
CREATE INDEX "Activite_idDemande_ordre_idx" ON "Activite"("idDemande", "ordre");

-- CreateIndex
CREATE INDEX "Activite_idLienAppelOrganisation_idx" ON "Activite"("idLienAppelOrganisation");

-- CreateIndex
CREATE INDEX "Activite_debut_fin_idx" ON "Activite"("debut", "fin");

-- CreateIndex
CREATE INDEX "SousActivite_idActivite_ordre_idx" ON "SousActivite"("idActivite", "ordre");

-- CreateIndex
CREATE INDEX "LigneBudget_idActivite_ordre_idx" ON "LigneBudget"("idActivite", "ordre");

-- CreateIndex
CREATE INDEX "Risque_idDemande_ordre_idx" ON "Risque"("idDemande", "ordre");

-- CreateIndex
CREATE INDEX "PieceJointe_cle_idx" ON "PieceJointe"("cle");

-- CreateIndex
CREATE INDEX "PieceJointe_idValidateur_idx" ON "PieceJointe"("idValidateur");

-- CreateIndex
CREATE UNIQUE INDEX "PieceJointe_idDemande_cle_key" ON "PieceJointe"("idDemande", "cle");

-- CreateIndex
CREATE INDEX "Evaluation_idDemande_idx" ON "Evaluation"("idDemande");

-- CreateIndex
CREATE INDEX "Evaluation_idEvaluateur_idx" ON "Evaluation"("idEvaluateur");

-- CreateIndex
CREATE UNIQUE INDEX "Contrat_idDemande_key" ON "Contrat"("idDemande");

-- CreateIndex
CREATE INDEX "Contrat_idDemande_idx" ON "Contrat"("idDemande");

-- CreateIndex
CREATE INDEX "Rapport_idDemande_dateEcheance_idx" ON "Rapport"("idDemande", "dateEcheance");

-- CreateIndex
CREATE INDEX "Cofinanceur_idDemande_idx" ON "Cofinanceur"("idDemande");

-- CreateIndex
CREATE INDEX "JournalAudit_entite_idEntite_idx" ON "JournalAudit"("entite", "idEntite");

-- CreateIndex
CREATE INDEX "JournalAudit_idUtilisateur_idx" ON "JournalAudit"("idUtilisateur");

-- CreateIndex
CREATE INDEX "Otp_nomUtilisateur_idx" ON "Otp"("nomUtilisateur");

-- CreateIndex
CREATE INDEX "Otp_expireLe_idx" ON "Otp"("expireLe");

-- AddForeignKey
ALTER TABLE "Utilisateur" ADD CONSTRAINT "Utilisateur_idOrganisation_fkey" FOREIGN KEY ("idOrganisation") REFERENCES "Organisation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_idUtilisateur_fkey" FOREIGN KEY ("idUtilisateur") REFERENCES "Utilisateur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppelProjets" ADD CONSTRAINT "AppelProjets_idTypeSubvention_fkey" FOREIGN KEY ("idTypeSubvention") REFERENCES "TypeSubvention"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Thematique" ADD CONSTRAINT "Thematique_idAppelProjets_fkey" FOREIGN KEY ("idAppelProjets") REFERENCES "AppelProjets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Thematique" ADD CONSTRAINT "Thematique_idTypeSubvention_fkey" FOREIGN KEY ("idTypeSubvention") REFERENCES "TypeSubvention"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LienAppelOrganisation" ADD CONSTRAINT "LienAppelOrganisation_idAppelProjets_fkey" FOREIGN KEY ("idAppelProjets") REFERENCES "AppelProjets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LienAppelOrganisation" ADD CONSTRAINT "LienAppelOrganisation_idOrganisation_fkey" FOREIGN KEY ("idOrganisation") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandeSubvention" ADD CONSTRAINT "DemandeSubvention_idParent_fkey" FOREIGN KEY ("idParent") REFERENCES "DemandeSubvention"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandeSubvention" ADD CONSTRAINT "DemandeSubvention_idAppelProjets_fkey" FOREIGN KEY ("idAppelProjets") REFERENCES "AppelProjets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandeSubvention" ADD CONSTRAINT "DemandeSubvention_idOrganisation_fkey" FOREIGN KEY ("idOrganisation") REFERENCES "Organisation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandeSubvention" ADD CONSTRAINT "DemandeSubvention_idSoumisPar_fkey" FOREIGN KEY ("idSoumisPar") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activite" ADD CONSTRAINT "Activite_idDemande_fkey" FOREIGN KEY ("idDemande") REFERENCES "DemandeSubvention"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activite" ADD CONSTRAINT "Activite_idLienAppelOrganisation_fkey" FOREIGN KEY ("idLienAppelOrganisation") REFERENCES "LienAppelOrganisation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SousActivite" ADD CONSTRAINT "SousActivite_idActivite_fkey" FOREIGN KEY ("idActivite") REFERENCES "Activite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LigneBudget" ADD CONSTRAINT "LigneBudget_idActivite_fkey" FOREIGN KEY ("idActivite") REFERENCES "Activite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Risque" ADD CONSTRAINT "Risque_idDemande_fkey" FOREIGN KEY ("idDemande") REFERENCES "DemandeSubvention"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PieceJointe" ADD CONSTRAINT "PieceJointe_idDemande_fkey" FOREIGN KEY ("idDemande") REFERENCES "DemandeSubvention"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PieceJointe" ADD CONSTRAINT "PieceJointe_idValidateur_fkey" FOREIGN KEY ("idValidateur") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_idDemande_fkey" FOREIGN KEY ("idDemande") REFERENCES "DemandeSubvention"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_idEvaluateur_fkey" FOREIGN KEY ("idEvaluateur") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contrat" ADD CONSTRAINT "Contrat_idDemande_fkey" FOREIGN KEY ("idDemande") REFERENCES "DemandeSubvention"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rapport" ADD CONSTRAINT "Rapport_idDemande_fkey" FOREIGN KEY ("idDemande") REFERENCES "DemandeSubvention"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cofinanceur" ADD CONSTRAINT "Cofinanceur_idDemande_fkey" FOREIGN KEY ("idDemande") REFERENCES "DemandeSubvention"("id") ON DELETE CASCADE ON UPDATE CASCADE;
