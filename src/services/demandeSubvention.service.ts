import { Prisma } from '@prisma/client';
import prisma from '../config/db.js';
import { AppError } from '../middlewares/error.middleware.js';
import { DemandeSubventionDTO } from '../types/index.js';
import { DemandeData, sendProjectSubmissionEmails } from '../utils/mail_projet.js';

/**
 * Interface pour les données du formulaire frontend
 */
interface FrontendProjectData {
  // Étape 1 - Proposition
  title: string;
  domains: string[];
  location: string;
  targetGroup: string;
  contextJustification: string;

  // Étape 2 - Objectifs
  objectives: string;
  expectedResults: string;
  durationMonths: number;

  // Étape 3 - Activités
  activitiesStartDate: string;
  activitiesEndDate: string;
  activitiesSummary: string;
  activities: Array<{
    title: string;
    start: string;
    end: string;
    summary: string;
    subs?: Array<{
      label: string;
      summary?: string;
    }>;
    budget?: {
      lines: Array<{
        label: string;
        cfa: number;
        fpbgPct: number;
        cofinPct: number;
      }>;
    };
  }>;

  // Étape 4 - Risques
  risks: Array<{
    description: string;
    mitigation: string;
  }>;

  // Étape 5 - Budget
  usdRate: number;
  budgetActivities: Array<{
    activityIndex: number;
    lines: Array<{
      label: string;
      cfa: number;
      fpbgPct: number;
      cofinPct: number;
    }>;
  }>;
  indirectOverheads: number;

  // Étape 6 - État
  projectStage: 'CONCEPTION' | 'DEMARRAGE' | 'AVANCE' | 'PHASE_FINALE';
  hasFunding: boolean;
  fundingDetails?: string;
  honorAccepted: boolean;

  // Étape 7 - Durabilité
  sustainability: string;
  replicability?: string;

  // Collaborateurs (optionnel)
  collaborateurs?: Array<{
    nom: string;
    prenom: string;
    email: string;
    telephone?: string;
    role?: string;
  }>;

  // Pièces jointes - uniquement les métadonnées (noms des fichiers)
  attachments?: Array<{
    key: string;
    label: string;
    fileName: string;
    fileSize: number;
    fileType: string;
    required: boolean;
    base64?: string;
  }>;
}

/**
 * Service pour gérer les demandes de subvention
 * Utilise le nouveau schema Prisma avec noms en français
 */
export class DemandeSubventionService {
  /**
   * ========================================
   * MÉTHODE PRINCIPALE : Soumettre un projet complet
   * ========================================
   * Cette méthode transforme les données du formulaire frontend
   * en structure Prisma compatible avec les relations imbriquées
   */
  async soumettre(
    data: FrontendProjectData,
    files: { [fieldname: string]: Express.Multer.File[] },
    attachmentsIndex: any[],
    idUtilisateur: string
  ) {
    try {
      console.log('🔄 Début de la soumission du projet...');
      console.log('📊 Données reçues:', {
        title: data?.title,
        hasActivities: !!data?.activities,
        activitiesCount: data?.activities?.length || 0,
        hasRisks: !!data?.risks,
        risksCount: data?.risks?.length || 0,
        filesCount: Object.keys(files || {}).length
      });

      // ✅ Validation des données essentielles
      if (!data) {
        throw new AppError('Aucune donnée de projet fournie.', 400);
      }

      if (!data.title || data.title.trim() === '') {
        throw new AppError('Le titre du projet est requis.', 400);
      }

      if (!data.activitiesStartDate || !data.activitiesEndDate) {
        throw new AppError('Les dates de début et fin des activités sont requises.', 400);
      }

      // 1️⃣ Vérifier que l'utilisateur existe et récupérer son organisation
      const utilisateur = await prisma.utilisateur.findUnique({
        where: { id: idUtilisateur },
        include: { organisation: true }
      });

      if (!utilisateur) {
        throw new AppError('Utilisateur non trouvé.', 404);
      }

      if (!utilisateur.idOrganisation) {
        throw new AppError('Aucune organisation associée à cet utilisateur.', 400);
      }

      console.log('✅ Utilisateur vérifié:', utilisateur.email);
      console.log('✅ Organisation:', utilisateur.organisation?.nom);

      // 2️⃣ Utiliser une transaction Prisma pour garantir l'intégrité des données
      const demande = await prisma.$transaction(
        async (tx) => {
          // ========================================
          // A) Créer la demande principale
          // ========================================
          const nouveleDemande = await tx.demandeSubvention.create({
            data: {
              // Métadonnées
              statut: 'SOUMIS',
              typeSoumission: 'NOTE_CONCEPTUELLE',

              // Relations
              idSoumisPar: idUtilisateur,
              idOrganisation: utilisateur.idOrganisation!,
              idAppelProjets: null, // TODO: lier à un AAP si nécessaire

              // ========================================
              // Étape 1 - Proposition
              // ========================================
              titre: data.title,
              domaines: data.domains || [],
              localisation: data.location,
              groupeCible: data.targetGroup,
              justificationContexte: data.contextJustification,

              // ========================================
              // Étape 2 - Objectifs & résultats
              // ========================================
              objectifs: data.objectives,
              resultatsAttendus: data.expectedResults,
              dureeMois: data.durationMonths,

              // ========================================
              // Étape 3 - Activités (dates et résumé uniquement)
              // ========================================
              dateDebutActivites: data.activitiesStartDate ? new Date(data.activitiesStartDate) : new Date(),
              dateFinActivites: data.activitiesEndDate ? new Date(data.activitiesEndDate) : new Date(),
              resumeActivites: data.activitiesSummary || '',

              // ========================================
              // Étape 5 - Budget
              // ========================================
              tauxUsd: data.usdRate || 655,
              fraisIndirectsCfa: new Prisma.Decimal(data.indirectOverheads || 0),

              // ========================================
              // Étape 6 - État & financement
              // ========================================
              stadeProjet: data.projectStage,
              aFinancement: data.hasFunding,
              detailsFinancement: data.fundingDetails || null,
              honneurAccepte: data.honorAccepted,

              // ========================================
              // Étape 7 - Durabilité
              // ========================================
              texteDurabilite: data.sustainability,
              texteReplication: data.replicability || data.sustainability
            }
          });

          console.log('✅ Demande créée avec ID:', nouveleDemande.id);

          // ========================================
          // B) Créer les activités avec relations imbriquées
          // ========================================
          if (data.activities && Array.isArray(data.activities) && data.activities.length > 0) {
            console.log(`🔄 Création de ${data.activities.length} activité(s)...`);

            for (let i = 0; i < data.activities.length; i++) {
              const act = data.activities[i];

              // Vérifier que l'activité existe et a des données valides
              if (!act || !act.title) {
                console.warn(`⚠️ Activité ${i} manquante ou invalide, ignorée`);
                continue;
              }

              // Valider et parser les dates de l'activité
              let dateDebut: Date;
              let dateFin: Date;

              try {
                dateDebut = act.start ? new Date(act.start) : new Date(data.activitiesStartDate);
                dateFin = act.end ? new Date(act.end) : new Date(data.activitiesEndDate);

                // Vérifier que les dates sont valides
                if (isNaN(dateDebut.getTime())) {
                  console.warn(`⚠️ Date de début invalide pour activité ${i}, utilisation de la date du projet`);
                  dateDebut = new Date(data.activitiesStartDate);
                }
                if (isNaN(dateFin.getTime())) {
                  console.warn(`⚠️ Date de fin invalide pour activité ${i}, utilisation de la date du projet`);
                  dateFin = new Date(data.activitiesEndDate);
                }
              } catch (error) {
                console.warn(`⚠️ Erreur parsing dates activité ${i}:`, error);
                dateDebut = new Date(data.activitiesStartDate);
                dateFin = new Date(data.activitiesEndDate);
              }

              // Créer l'activité principale
              const activiteCreee = await tx.activite.create({
                data: {
                  idDemande: nouveleDemande.id,
                  ordre: i,
                  titre: act.title.trim(),
                  debut: dateDebut,
                  fin: dateFin,
                  resume: act.summary || ''
                }
              });

              console.log(`  ✅ Activité ${i + 1} créée:`, act.title);

              // Créer les sous-activités si présentes
              if (act.subs && act.subs.length > 0) {
                for (let j = 0; j < act.subs.length; j++) {
                  const sub = act.subs[j];

                  // Vérifier que la sous-activité existe
                  if (!sub) {
                    console.warn(`⚠️ Sous-activité ${j} manquante`);
                    continue;
                  }

                  await tx.sousActivite.create({
                    data: {
                      idActivite: activiteCreee.id,
                      ordre: j,
                      libelle: sub.label,
                      resume: sub.summary || null
                    }
                  });
                }
                console.log(`    ✅ ${act.subs.length} sous-activité(s) créée(s)`);
              }

              // Créer les lignes de budget si présentes
              if (act.budget && act.budget.lines && Array.isArray(act.budget.lines) && act.budget.lines.length > 0) {
                let lignesCreees = 0;

                for (let k = 0; k < act.budget.lines.length; k++) {
                  const line = act.budget.lines[k];

                  // Vérifier que la ligne de budget existe et a des données valides
                  if (!line || !line.label) {
                    console.warn(`⚠️ Ligne de budget ${k} manquante ou invalide, ignorée`);
                    continue;
                  }

                  // Valider les montants
                  const montantCfa = Number(line.cfa) || 0;
                  const pctFpbg = Number(line.fpbgPct) || 0;
                  const pctCofin = Number(line.cofinPct) || 0;

                  // Vérifier que les pourcentages sont valides (0-100)
                  if (pctFpbg < 0 || pctFpbg > 100) {
                    console.warn(`⚠️ Pourcentage FPBG invalide (${pctFpbg}) pour ligne "${line.label}", ajusté à 0`);
                  }
                  if (pctCofin < 0 || pctCofin > 100) {
                    console.warn(
                      `⚠️ Pourcentage cofinancement invalide (${pctCofin}) pour ligne "${line.label}", ajusté à 0`
                    );
                  }

                  try {
                    await tx.ligneBudget.create({
                      data: {
                        idActivite: activiteCreee.id,
                        ordre: k,
                        libelle: line.label.trim(),
                        type: 'DIRECT',
                        cfa: new Prisma.Decimal(montantCfa),
                        pctFpbg: Math.max(0, Math.min(100, pctFpbg)),
                        pctCofin: Math.max(0, Math.min(100, pctCofin))
                      }
                    });
                    lignesCreees++;
                  } catch (error: any) {
                    console.error(`❌ Erreur création ligne budget ${k}:`, error.message);
                    // Continue avec les autres lignes
                  }
                }
                console.log(`    ✅ ${lignesCreees}/${act.budget.lines.length} ligne(s) de budget créée(s)`);
              }
            }
          }

          // ========================================
          // C) Créer les risques
          // ========================================
          if (data.risks && data.risks.length > 0) {
            for (let i = 0; i < data.risks.length; i++) {
              const risk = data.risks[i];

              // Vérifier que le risque existe
              if (!risk) {
                console.warn(`⚠️ Risque ${i} manquant`);
                continue;
              }

              await tx.risque.create({
                data: {
                  idDemande: nouveleDemande.id,
                  ordre: i,
                  description: risk.description,
                  mitigation: risk.mitigation
                }
              });
            }
            console.log(`✅ ${data.risks.length} risque(s) créé(s)`);
          }

          // ========================================
          // D) Créer les pièces jointes (métadonnées uniquement - pas de fichiers réels)
          // ========================================
          if (data.attachments && Array.isArray(data.attachments) && data.attachments.length > 0) {
            console.log(`🔄 Enregistrement de ${data.attachments.length} pièce(s) jointe(s) (métadonnées)...`);
            let fichiersCreees = 0;

            // 🎯 ACCEPTER TOUS LES PDFS - Plus de restriction sur les clés
            // Toutes les clés de documents sont acceptées maintenant
            for (let attachmentIndex = 0; attachmentIndex < data.attachments.length; attachmentIndex++) {
              const attachment = data.attachments[attachmentIndex];
              try {
                // Vérifier que l'attachement a les propriétés requises
                if (!attachment || !attachment.key || !attachment.fileName) {
                  console.warn(`⚠️ Pièce jointe invalide, ignorée`);
                  continue;
                }

                // 🎯 Utiliser la clé du type de document directement (conforme à l'enum CleDocument)
                const cleDocument = attachment.key as any;

                // 🎯 Générer un nom de fichier UNIQUE en ajoutant l'index et un timestamp
                // Format: FILENAME_INDEX_TIMESTAMP.ext (ex: statuts_0_1729432156789.pdf)
                const extension = attachment.fileName.split('.').pop() || 'pdf';
                const baseFileName = attachment.fileName.replace(/\.[^/.]+$/, ''); // Sans extension
                const nomFichierUnique = `${baseFileName}_${attachmentIndex}_${Date.now()}.${extension}`;

                // 🎯 Sauvegarder le PDF avec son contenu base64 s'il existe
                const urlPdf = attachment.base64 ? `data:application/pdf;base64,${attachment.base64}` : '';

                // Créer la pièce jointe avec les métadonnées + base64
                await tx.pieceJointe.create({
                  data: {
                    idDemande: nouveleDemande.id,
                    cle: cleDocument, // ✅ Clé conforme à l'enum CleDocument
                    nomFichier: nomFichierUnique, // ✅ Nom de fichier unique avec timestamp
                    typeMime: attachment.fileType || 'application/pdf',
                    tailleOctets: attachment.fileSize || 0,
                    cleStockage: nomFichierUnique, // ✅ Nom du fichier unique pour le stockage
                    url: urlPdf, // 🎯 URL avec base64 pour accès direct
                    requis: attachment.required || false
                  }
                });

                fichiersCreees++;
                console.log(`  ✅ Document "${attachment.fileName}" enregistré (type: ${cleDocument}, fichier: ${nomFichierUnique})`);
              } catch (error: any) {
                console.error(`❌ Erreur enregistrement document ${attachment?.key}:`, error.message);
                // ⚠️ ATTENTION: Relancer l'erreur pour arrêter la transaction
                throw new AppError(
                  `Erreur lors de l'enregistrement de la pièce jointe "${attachment?.fileName}": ${error.message}`,
                  400
                );
              }
            }
            console.log(`✅ ${fichiersCreees}/${data.attachments.length} pièce(s) jointe(s) enregistrée(s)`);
          } else {
            console.log('ℹ️  Aucune pièce jointe fournie');
          }

          // ========================================
          // E) Gérer les cofinanceurs (collaborateurs) - COMMENTÉ
          // ========================================
          // if (data.collaborateurs && data.collaborateurs.length > 0) {
          //   for (const collab of data.collaborateurs) {
          //     await tx.cofinanceur.create({
          //       data: {
          //         idDemande: nouveleDemande.id,
          //         source: `${collab.prenom} ${collab.nom} (${collab.email})`,
          //         montant: new Prisma.Decimal(0), // Montant à définir plus tard
          //         enNature: false
          //       }
          //     });
          //   }
          //   console.log(`✅ ${data.collaborateurs.length} collaborateur(s) enregistré(s)`);
          // }

          // Retourner la demande complète avec toutes les relations
          return tx.demandeSubvention.findUnique({
            where: { id: nouveleDemande.id },
            include: {
              organisation: true,
              soumisPar: {
                select: {
                  id: true,
                  email: true,
                  prenom: true,
                  nom: true
                }
              },
              activites: {
                include: {
                  sousActivites: true,
                  lignesBudget: true
                },
                orderBy: { ordre: 'asc' }
              },
              risques: {
                orderBy: { ordre: 'asc' }
              },
              piecesJointes: true
              // cofinanceurs: true  // COMMENTÉ - Cofinanceur désactivé
            }
          });
        },
        { timeout: 300000 }
      );

      console.log('🎉 Projet soumis avec succès !');

      // ========================================
      // F) Envoyer les emails de confirmation
      // ========================================
      if (demande) {
        try {
          console.log('\n📧 Envoi des emails de confirmation...');

          const demandeData: DemandeData = {
            titre: demande.titre,
            organisation: {
              nom: demande.organisation?.nom || 'Organisation',
              email: demande.organisation?.email || null,
              telephone: demande.organisation?.telephone || null
            },
            soumisPar: {
              nom: demande.soumisPar?.nom || null,
              prenom: demande.soumisPar?.prenom || null,
              email: demande.soumisPar?.email || 'unknown@example.com'
            },
            domaines: demande.domaines as string[],
            localisation: demande.localisation,
            groupeCible: demande.groupeCible,
            contextJustification: demande.justificationContexte,
            objectifs: demande.objectifs,
            expectedResults: demande.resultatsAttendus,
            dureeMois: demande.dureeMois,
            montantTotal: 0, // Sera calculé ci-dessous
            dateDebutActivites: demande.dateDebutActivites,
            dateFinActivites: demande.dateFinActivites,
            activitiesSummary: demande.resumeActivites,
            activites: demande.activites?.map((act) => {
              // Garantir que start et end sont toujours des strings non-nullables
              const startDate = act.debut instanceof Date ? act.debut : new Date();
              const endDate = act.fin instanceof Date ? act.fin : new Date();

              return {
                titre: act.titre,
                start: startDate.toISOString().split('T')[0],
                end: endDate.toISOString().split('T')[0],
                resume: act.resume,
                subs:
                  act.sousActivites?.map((sub) => ({
                    label: sub.libelle,
                    summary: sub.resume || undefined
                  })) || [],
                lignesBudget:
                  act.lignesBudget?.map((ligne) => ({
                    libelle: ligne.libelle,
                    cfa: Number(ligne.cfa), // Convertir Decimal en number pour le JSON
                    fpbgPct: ligne.pctFpbg,
                    cofinPct: ligne.pctCofin
                  })) || []
              };
            }),
            risques: demande.risques?.map((r) => ({
              description: r.description,
              mitigation: r.mitigation
            })),
            usdRate: demande.tauxUsd,
            indirectOverheads: Number(demande.fraisIndirectsCfa),
            projectStage: demande.stadeProjet,
            hasFunding: demande.aFinancement,
            fundingDetails: demande.detailsFinancement || undefined,
            sustainability: demande.texteDurabilite,
            replicability: demande.texteReplication || undefined
          };

          // Calculer le montant total
          let montantTotal = 0;
          demande.activites?.forEach((activite) => {
            activite.lignesBudget?.forEach((ligne) => {
              montantTotal += Number(ligne.cfa) || 0;
            });
          });
          demandeData.montantTotal = montantTotal;

          console.log(`💰 Montant total calculé: ${montantTotal.toLocaleString('fr-FR')} FCFA`);

          // Envoyer les emails (ne pas bloquer si erreur)
          await sendProjectSubmissionEmails(demandeData, demande.id);

          console.log('✅ Emails envoyés avec succès !');
        } catch (emailError: any) {
          console.error("⚠️  ATTENTION: Erreur lors de l'envoi des emails (le projet a bien été soumis):");
          console.error('   ', emailError.message);
          // Ne pas lancer d'erreur, le projet est déjà soumis
        }
      }

      return demande;
    } catch (error: any) {
      console.error('\n❌ =============================================');
      console.error('❌ ERREUR LORS DE LA SOUMISSION');
      console.error('❌ =============================================');
      console.error("Type d'erreur:", error.constructor?.name);
      console.error('Message:', error.message);
      console.error('Stack:', error.stack);

      // Si c'est une erreur Prisma, la rendre plus lisible
      if (error.code) {
        console.error('Code Prisma:', error.code);

        if (error.code === 'P2002') {
          const target = error.meta?.target;
          throw new AppError(
            `Un doublon a été détecté. Un projet avec ces informations existe déjà (champs: ${target}).`,
            400
          );
        }
        if (error.code === 'P2003') {
          const field = error.meta?.field_name;
          throw new AppError(`Référence invalide pour le champ: ${field}.`, 400);
        }
        if (error.code === 'P2025') {
          throw new AppError('Enregistrement requis non trouvé.', 404);
        }
        if (error.code === 'P1001') {
          throw new AppError('Impossible de se connecter à la base de données.', 500);
        }
        if (error.code === 'P1008') {
          throw new AppError('Timeout de la base de données - opération trop longue.', 504);
        }
      }

      // Si c'est déjà une AppError, la relancer
      if (error instanceof AppError) {
        throw error;
      }

      // Erreur de validation de données
      if (error.message?.includes('Invalid') || error.message?.includes('required')) {
        throw new AppError('Données invalides: ' + error.message, 400);
      }

      // Erreur générique avec le message complet
      throw new AppError(
        'Erreur lors de la soumission du projet: ' + (error.message || 'Erreur inconnue'),
        error.statusCode || 500
      );
    }
  }

  /**
   * ========================================
   * MÉTHODES CRUD CLASSIQUES (inchangées)
   * ========================================
   */

  /**
   * Créer une nouvelle demande de subvention (brouillon)
   */
  async creer(data: DemandeSubventionDTO, idUtilisateur: string) {
    try {
      // Exécuter l'ensemble dans une transaction avec timeout de 15 secondes
      const demande = await prisma.$transaction(
        async (tx) => {
          // Vérifier que l'utilisateur existe
          const utilisateur = await tx.utilisateur.findUnique({
            where: { id: idUtilisateur },
            include: { organisation: true }
          });

          if (!utilisateur) {
            throw new AppError('Utilisateur non trouvé.', 404);
          }

          // Créer la demande de subvention
          const demandeCree = await tx.demandeSubvention.create({
            data: {
              // Métadonnées
              statut: (data.statut as any) || 'BROUILLON',
              typeSoumission: (data.typeSoumission as any) || 'NOTE_CONCEPTUELLE',

              // Relations
              idSoumisPar: idUtilisateur,
              idOrganisation: utilisateur.idOrganisation ?? data.idOrganisation ?? null,
              idAppelProjets: data.idAppelProjets ?? null,

              // Étape 1 – Proposition
              titre: data.titre ?? '',
              domaines: [], // Sera rempli lors de la soumission complète
              localisation: data.localisation!,
              groupeCible: data.groupeCible!,
              justificationContexte: data.justificationContexte!,

              // Étape 2 – Objectifs & résultats
              objectifs: data.objectifs!,
              resultatsAttendus: data.resultatsAttendus!,
              dureeMois: data.dureeMois!,

              // Étape 3 – Activités
              dateDebutActivites: new Date(data.dateDebutActivites!),
              dateFinActivites: new Date(data.dateFinActivites!),
              resumeActivites: data.resumeActivites!,

              // Budget
              tauxUsd: data.tauxUsd ?? 655,
              fraisIndirectsCfa: new Prisma.Decimal(data.fraisIndirectsCfa ?? 0),

              // Autres
              stadeProjet: (data.stadeProjet as any) || 'DEMARRAGE',
              aFinancement: data.aFinancement ?? false,
              detailsFinancement: data.detailsFinancement ?? null,
              honneurAccepte: data.honneurAccepte ?? false,
              texteDurabilite: data.texteDurabilite!,
              texteReplication: data.texteReplication ?? null
            },
            include: {
              organisation: true,
              soumisPar: {
                select: {
                  id: true,
                  email: true,
                  prenom: true,
                  nom: true
                }
              },
              appelProjets: {
                include: {
                  typeSubvention: true
                }
              }
            }
          });

          return demandeCree;
        },
        { timeout: 300000 }
      );

      return demande;
    } catch (error: any) {
      console.error('Erreur création demande:', error);
      throw new AppError('Erreur lors de la création de la demande: ' + error.message, 500);
    }
  }

  /**
   * Récupérer toutes les demandes de subvention (admin)
   */
  async obtenirTout(filtres?: {
    statut?: string;
    typeSoumission?: string;
    idOrganisation?: string;
    idAppelProjets?: string;
  }) {
    try {
      const where: any = {};

      if (filtres?.statut) {
        where.statut = filtres.statut;
      }
      if (filtres?.typeSoumission) {
        where.typeSoumission = filtres.typeSoumission;
      }
      if (filtres?.idOrganisation) {
        where.idOrganisation = filtres.idOrganisation;
      }
      if (filtres?.idAppelProjets) {
        where.idAppelProjets = filtres.idAppelProjets;
      }

      const demandes = await prisma.$transaction(
        async (tx) => {
          return tx.demandeSubvention.findMany({
            where,
            include: {
              organisation: true,
              soumisPar: {
                select: {
                  id: true,
                  email: true,
                  prenom: true,
                  nom: true
                }
              },
              appelProjets: {
                include: {
                  typeSubvention: true
                }
              },
              activites: {
                include: {
                  sousActivites: true,
                  lignesBudget: true
                }
              }
            },
            orderBy: {
              creeLe: 'desc'
            }
          });
        },
        { timeout: 300000 }
      );

      // Calculer le montantTotal pour chaque demande
      const demandesAvecMontantTotal = demandes.map((demande) => {
        let montantTotal = 0;

        // Additionner tous les montants CFA des lignes de budget
        if (demande.activites && demande.activites.length > 0) {
          demande.activites.forEach((activite) => {
            if (activite.lignesBudget && activite.lignesBudget.length > 0) {
              activite.lignesBudget.forEach((ligne) => {
                montantTotal += Number(ligne.cfa) || 0;
              });
            }
          });
        }

        // Retourner la demande avec le montantTotal calculé
        return {
          ...demande,
          montantTotal
        };
      });

      return demandesAvecMontantTotal;
    } catch (error: any) {
      console.error('Erreur récupération demandes:', error);
      throw new AppError('Erreur lors de la récupération des demandes: ' + error.message, 500);
    }
  }

  /**
   * ✅ NOUVELLE MÉTHODE - Récupérer les demandes d'un utilisateur PAR EMAIL
   * Cette méthode est spécifique pour le dashboard utilisateur
   * Elle vérifie l'email de l'utilisateur connecté et retourne SES demandes
   */
  async obtenirParUtilisateur(idUtilisateur: string) {
    try {
      console.log('🔍 [USER SERVICE] Recherche des demandes pour utilisateur ID:', idUtilisateur);

      // 1️⃣ Trouver l'utilisateur connecté
      const utilisateurConnecte = await prisma.utilisateur.findUnique({
        where: { id: idUtilisateur },
        select: { id: true, email: true, nom: true, prenom: true }
      });

      if (!utilisateurConnecte) {
        console.error('❌ Utilisateur non trouvé avec ID:', idUtilisateur);
        throw new AppError('Utilisateur non trouvé.', 404);
      }

      console.log('✅ Utilisateur connecté:', {
        id: utilisateurConnecte.id,
        email: utilisateurConnecte.email,
        nom: utilisateurConnecte.prenom + ' ' + (utilisateurConnecte.nom || '')
      });

      // 2️⃣ Chercher TOUTES les demandes qui ont cet email dans soumisPar
      // On va chercher toutes les demandes et filtrer par email
      const demandes = await prisma.$transaction(
        async (tx) => {
          return tx.demandeSubvention.findMany({
            include: {
              organisation: true,
              soumisPar: {
                select: {
                  id: true,
                  email: true,
                  prenom: true,
                  nom: true
                }
              },
              appelProjets: {
                include: {
                  typeSubvention: true
                }
              },
              activites: {
                include: {
                  sousActivites: true,
                  lignesBudget: true
                }
              },
              risques: true,
              piecesJointes: true
            },
            orderBy: {
              creeLe: 'desc'
            }
          });
        },
        { timeout: 300000 }
      );

      // 3️⃣ DOUBLE VÉRIFICATION : EMAIL + ID pour garantir que c'est le bon utilisateur
      const emailRecherche = utilisateurConnecte.email.trim().toLowerCase();
      const idRecherche = utilisateurConnecte.id;

      console.log(`🎯 Utilisateur recherché:`);
      console.log(`   - ID: "${idRecherche}"`);
      console.log(`   - Email: "${emailRecherche}"`);
      console.log(`\n🔍 Vérification des demandes...`);

      const demandesUtilisateur = demandes.filter((d) => {
        const emailDemande = d.soumisPar?.email?.trim().toLowerCase();
        const idDemande = d.idSoumisPar;

        // Double condition : EMAIL ET ID doivent correspondre
        const emailMatch = emailDemande === emailRecherche;
        const idMatch = idDemande === idRecherche;
        const doubleMatch = emailMatch && idMatch;

        console.log(`   📄 Demande: "${d.titre}"`);
        console.log(`      - idSoumisPar: "${idDemande}" (match: ${idMatch})`);
        console.log(`      - emailSoumisPar: "${emailDemande}" (match: ${emailMatch})`);
        console.log(`      ➜ Résultat: ${doubleMatch ? '✅ ACCEPTÉ' : '❌ REJETÉ'}\n`);

        return doubleMatch;
      });

      console.log(`\n📊 Résumé:`);
      console.log(`   Total demandes en base: ${demandes.length}`);
      console.log(`   Demandes pour ${utilisateurConnecte.email}: ${demandesUtilisateur.length}`);

      // DEBUG: Afficher les correspondances
      if (demandesUtilisateur.length > 0) {
        console.log('📋 Demandes trouvées:');
        demandesUtilisateur.forEach((d) => {
          console.log(`   ✓ "${d.titre}" - soumis par: ${d.soumisPar?.email}`);
        });
      } else {
        console.log('⚠️  Aucune demande trouvée pour cet email');
        console.log('   DEBUG - Emails dans la base:');
        const emailsUniques = [...new Set(demandes.map((d) => d.soumisPar?.email).filter(Boolean))];
        emailsUniques.forEach((email) => {
          console.log(`     - ${email}`);
        });
      }

      // 4️⃣ Calculer le montantTotal pour chaque demande
      const demandesAvecMontantTotal = demandesUtilisateur.map((demande) => {
        let montantTotal = 0;

        console.log(`\n🔍 Calcul du budget pour: "${demande.titre}"`);
        console.log(`   Nombre d'activités: ${demande.activites?.length || 0}`);

        // Additionner tous les montants CFA des lignes de budget
        if (demande.activites && demande.activites.length > 0) {
          demande.activites.forEach((activite, index) => {
            const nbLignes = activite.lignesBudget?.length || 0;
            console.log(`   Activité ${index + 1}: "${activite.titre}" - ${nbLignes} ligne(s) de budget`);

            if (activite.lignesBudget && activite.lignesBudget.length > 0) {
              activite.lignesBudget.forEach((ligne) => {
                const montantLigne = Number(ligne.cfa) || 0;
                console.log(`      - ${ligne.libelle}: ${montantLigne} CFA`);
                montantTotal += montantLigne;
              });
            }
          });
        } else {
          console.log(`   ⚠️  Aucune activité trouvée pour cette demande`);
        }

        console.log(`   💰 Total calculé: ${montantTotal} CFA\n`);

        // Retourner la demande avec le montantTotal calculé
        return {
          ...demande,
          montantTotal
        };
      });

      return demandesAvecMontantTotal;
    } catch (error: any) {
      console.error('❌ Erreur récupération demandes utilisateur:', error);
      throw new AppError('Erreur lors de la récupération des demandes: ' + error.message, 500);
    }
  }

  /**
   * Récupérer une demande par ID
   */
  async obtenirParId(id: string, idUtilisateur?: string) {
    try {
      const demande = await prisma.demandeSubvention.findUnique({
        where: { id },
        include: {
          organisation: true,
          soumisPar: {
            select: {
              id: true,
              email: true,
              prenom: true,
              nom: true
            }
          },
          appelProjets: {
            include: {
              typeSubvention: true,
              thematiques: true
            }
          },
          activites: {
            include: {
              sousActivites: true,
              lignesBudget: true
            },
            orderBy: { ordre: 'asc' }
          },
          risques: {
            orderBy: { ordre: 'asc' }
          },
          piecesJointes: true,
          evaluations: {
            include: {
              evaluateur: {
                select: {
                  id: true,
                  email: true,
                  prenom: true,
                  nom: true
                }
              }
            }
          },
          contrat: true,
          rapports: {
            orderBy: { dateEcheance: 'asc' }
          }
          // cofinanceurs: true  // COMMENTÉ - Cofinanceur désactivé
        }
      });

      if (!demande) {
        throw new AppError('Demande non trouvée.', 404);
      }

      // Vérifier que l'utilisateur a accès à cette demande
      if (idUtilisateur && demande.idSoumisPar !== idUtilisateur) {
        // Vérifier si l'utilisateur est admin
        const utilisateur = await prisma.utilisateur.findUnique({
          where: { id: idUtilisateur }
        });

        if (!utilisateur || utilisateur.role !== 'ADMINISTRATEUR') {
          throw new AppError('Accès non autorisé à cette demande.', 403);
        }
      }

      // Calculer le montantTotal en additionnant tous les montants CFA
      let montantTotal = 0;
      if (demande.activites && demande.activites.length > 0) {
        demande.activites.forEach((activite) => {
          if (activite.lignesBudget && activite.lignesBudget.length > 0) {
            activite.lignesBudget.forEach((ligne) => {
              montantTotal += Number(ligne.cfa) || 0;
            });
          }
        });
      }

      console.log(`💰 Budget total calculé pour "${demande.titre}": ${montantTotal} CFA`);

      // Retourner la demande avec le montantTotal calculé
      return {
        ...demande,
        montantTotal
      };
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      console.error('Erreur récupération demande:', error);
      throw new AppError('Erreur lors de la récupération de la demande: ' + error.message, 500);
    }
  }

  /**
   * Mettre à jour une demande de subvention
   */
  async mettreAJour(id: string, data: DemandeSubventionDTO, idUtilisateur: string) {
    try {
      // Vérifier que la demande existe et appartient à l'utilisateur
      const demandeExistante = await prisma.demandeSubvention.findUnique({
        where: { id }
      });

      if (!demandeExistante) {
        throw new AppError('Demande non trouvée.', 404);
      }

      if (demandeExistante.idSoumisPar !== idUtilisateur) {
        throw new AppError("Vous n'êtes pas autorisé à modifier cette demande.", 403);
      }

      // Mettre à jour la demande
      const updateData: any = {};

      if (data.titre) updateData.titre = data.titre;
      if (data.localisation) updateData.localisation = data.localisation;
      if (data.groupeCible) updateData.groupeCible = data.groupeCible;
      if (data.justificationContexte) updateData.justificationContexte = data.justificationContexte;
      if (data.objectifs) updateData.objectifs = data.objectifs;
      if (data.resultatsAttendus) updateData.resultatsAttendus = data.resultatsAttendus;
      if (data.dureeMois) updateData.dureeMois = data.dureeMois;
      if (data.dateDebutActivites) updateData.dateDebutActivites = new Date(data.dateDebutActivites);
      if (data.dateFinActivites) updateData.dateFinActivites = new Date(data.dateFinActivites);
      if (data.resumeActivites) updateData.resumeActivites = data.resumeActivites;
      if (data.texteDurabilite) updateData.texteDurabilite = data.texteDurabilite;
      if (data.texteReplication) updateData.texteReplication = data.texteReplication;
      if (data.statut) updateData.statut = data.statut;
      if (data.stadeProjet) updateData.stadeProjet = data.stadeProjet;
      if (data.aFinancement !== undefined) updateData.aFinancement = data.aFinancement;
      if (data.detailsFinancement) updateData.detailsFinancement = data.detailsFinancement;
      if (data.honneurAccepte !== undefined) updateData.honneurAccepte = data.honneurAccepte;

      const demande = await prisma.demandeSubvention.update({
        where: { id },
        data: updateData,
        include: {
          organisation: true,
          soumisPar: {
            select: {
              id: true,
              email: true,
              prenom: true,
              nom: true
            }
          },
          appelProjets: {
            include: {
              typeSubvention: true
            }
          }
        }
      });

      return demande;
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      console.error('Erreur mise à jour demande:', error);
      throw new AppError('Erreur lors de la mise à jour de la demande: ' + error.message, 500);
    }
  }

  /**
   * Supprimer une demande de subvention
   */
  async supprimer(id: string, idUtilisateur: string) {
    try {
      // Vérifier que la demande existe et appartient à l'utilisateur
      const demande = await prisma.demandeSubvention.findUnique({
        where: { id }
      });

      if (!demande) {
        throw new AppError('Demande non trouvée.', 404);
      }

      if (demande.idSoumisPar !== idUtilisateur) {
        throw new AppError("Vous n'êtes pas autorisé à supprimer cette demande.", 403);
      }

      // Supprimer la demande (cascade delete sur les relations)
      await prisma.demandeSubvention.delete({
        where: { id }
      });

      return { message: 'Demande supprimée avec succès.' };
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      console.error('Erreur suppression demande:', error);
      throw new AppError('Erreur lors de la suppression de la demande: ' + error.message, 500);
    }
  }

  /**
   * Obtenir les statistiques pour le dashboard admin
   */
  async obtenirStatistiques() {
    try {
      const total = await prisma.demandeSubvention.count();

      const parStatut = await prisma.demandeSubvention.groupBy({
        by: ['statut'],
        _count: true
      });

      const parTypeSoumission = await prisma.demandeSubvention.groupBy({
        by: ['typeSoumission'],
        _count: true
      });

      const demandesRecentes = await prisma.demandeSubvention.findMany({
        take: 5,
        orderBy: {
          creeLe: 'desc'
        },
        include: {
          organisation: true,
          soumisPar: {
            select: {
              id: true,
              email: true,
              prenom: true,
              nom: true
            }
          }
        }
      });

      return {
        total,
        parStatut: parStatut.map((s) => ({
          statut: s.statut,
          nombre: s._count
        })),
        parTypeSoumission: parTypeSoumission.map((t) => ({
          type: t.typeSoumission,
          nombre: t._count
        })),
        demandesRecentes
      };
    } catch (error: any) {
      console.error('Erreur statistiques:', error);
      throw new AppError('Erreur lors de la récupération des statistiques: ' + error.message, 500);
    }
  }

  /**
   * Changer le statut d'une demande (admin uniquement)
   */
  async changerStatut(id: string, nouveauStatut: string, idAdmin: string) {
    try {
      // Vérifier que l'utilisateur est admin
      const admin = await prisma.utilisateur.findUnique({
        where: { id: idAdmin }
      });

      if (!admin || admin.role !== 'ADMINISTRATEUR') {
        throw new AppError('Accès non autorisé. Vous devez être administrateur.', 403);
      }

      // Mettre à jour le statut
      const demande = await prisma.demandeSubvention.update({
        where: { id },
        data: { statut: nouveauStatut as any },
        include: {
          organisation: true,
          soumisPar: {
            select: {
              id: true,
              email: true,
              prenom: true,
              nom: true
            }
          }
        }
      });

      // Logger l'action dans le journal d'audit
      await prisma.journalAudit.create({
        data: {
          entite: 'DemandeSubvention',
          idEntite: id,
          action: 'changement_statut',
          idUtilisateur: idAdmin,
          details: {
            nouveauStatut: nouveauStatut
          }
        }
      });

      return demande;
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      console.error('Erreur changement statut:', error);
      throw new AppError('Erreur lors du changement de statut: ' + error.message, 500);
    }
  }
}

export default new DemandeSubventionService();
