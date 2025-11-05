// import prisma from '../config/db.js';
// import { AppError } from '../middlewares/error.middleware.js';
// import { ProjetFormDTO } from '../types/index.js';

// /**
//  * Interface pour la soumission complète d'un projet depuis le wizard
//  */
// interface ProjectSubmissionData {
//   // Étape 1 : Proposition
//   title: string;
//   domains: string[];
//   location: string;
//   targetGroup: string;
//   contextJustification: string;

//   // Étape 2 : Objectifs
//   objectives: string;
//   expectedResults: string;
//   durationMonths: number;

//   // Étape 3 : Activités
//   activitiesStartDate?: string;
//   activitiesEndDate?: string;
//   activitiesSummary?: string;
//   activities?: any[];

//   // Étape 4 : Risques
//   risks?: any[];

//   // Étape 5 : Budget
//   usdRate?: number;
//   budgetActivities?: any[];
//   indirectOverheads?: number;

//   // Étape 6 : État & financement
//   projectStage?: string;
//   hasFunding?: boolean;
//   fundingDetails?: string;
//   honorAccepted?: boolean;

//   // Étape 7 : Durabilité
//   sustainability?: string;
//   replicability?: string;

//   // Étape 8 : Annexes (fichiers)
//   attachments?: {
//     LETTRE_MOTIVATION?: string;
//     STATUTS_REGLEMENT?: string;
//     FICHE_CIRCUIT?: string;
//     COTE?: string;
//     AGREMENT?: string;
//     CV?: string[];
//     BUDGET_DETAILLE?: string;
//     CHRONOGRAMME?: string;
//     CARTOGRAPHIE?: string;
//     LETTRE_SOUTIEN?: string;
//   };

//   // Collaborateurs
//   collaborateurs?: Array<{
//     nom: string;
//     prenom: string;
//     email: string;
//     telephone?: string;
//     role?: string;
//   }>;
// }

// export class ProjetService {
//   /**
//    * Soumettre un projet complet (depuis le wizard)
//    * Un utilisateur ne peut soumettre qu'un seul projet
//    */
//   async submitProject(userId: string, data: ProjectSubmissionData) {
//     try {
//       // Trouver l'organisation liée à cet utilisateur
//       const organisation = await prisma.organisation.findUnique({
//         where: { userId: userId }
//       });

//       if (!organisation) {
//         throw new AppError('Organisation non trouvée', 404);
//       }

//       // Vérifier si un projet existe déjà pour cette organisation
//       const existingProject = await prisma.projet.findFirst({
//         where: { organisationId: organisation.id }
//       });

//       // Préparer les données du projet
//       const projectData: any = {
//         // Étape 1
//         title: data.title,
//         domains: data.domains || [],
//         location: data.location,
//         targetGroup: data.targetGroup,
//         contextJustification: data.contextJustification,

//         // Étape 2
//         objectives: data.objectives,
//         expectedResults: data.expectedResults,
//         durationMonths: data.durationMonths,

//         // Étape 3
//         activitiesStartDate: data.activitiesStartDate ? new Date(data.activitiesStartDate) : null,
//         activitiesEndDate: data.activitiesEndDate ? new Date(data.activitiesEndDate) : null,
//         activitiesSummary: data.activitiesSummary || '',
//         activities: data.activities || [],

//         // Étape 4
//         risks: data.risks || [],

//         // Étape 5
//         usdRate: data.usdRate || 655,
//         budgetActivities: data.budgetActivities || [],
//         indirectOverheads: data.indirectOverheads || 0,

//         // Étape 6
//         projectStage: data.projectStage || 'CONCEPTION',
//         hasFunding: data.hasFunding || false,
//         fundingDetails: data.fundingDetails || '',
//         honorAccepted: data.honorAccepted || false,

//         // Étape 7
//         sustainability: data.sustainability || '',
//         replicability: data.replicability || '',

//         // Étape 8 - Annexes
//         lettreMotivation: data.attachments?.LETTRE_MOTIVATION,
//         statutsReglement: data.attachments?.STATUTS_REGLEMENT,
//         ficheCircuit: data.attachments?.FICHE_CIRCUIT,
//         cote: data.attachments?.COTE,
//         agrement: data.attachments?.AGREMENT,
//         cv: data.attachments?.CV || [],
//         budgetDetaille: data.attachments?.BUDGET_DETAILLE,
//         chronogramme: data.attachments?.CHRONOGRAMME,
//         cartographie: data.attachments?.CARTOGRAPHIE,
//         lettreSoutien: data.attachments?.LETTRE_SOUTIEN,

//         // État
//         status: 'SOUMIS',
//         submittedAt: new Date()
//       };

//       let projet;

//       if (existingProject) {
//         // Mise à jour du projet existant
//         projet = await prisma.projet.update({
//           where: { id: existingProject.id },
//           data: projectData,
//           include: {
//             organisation: {
//               include: {
//                 typeOrganisation: true
//               }
//             },
//             collaborateurs: true
//           }
//         });
//       } else {
//         // Création d'un nouveau projet
//         projet = await prisma.projet.create({
//           data: {
//             ...projectData,
//             organisationId: organisation.id
//           },
//           include: {
//             organisation: {
//               include: {
//                 typeOrganisation: true
//               }
//             },
//             collaborateurs: true
//           }
//         });
//       }

//       // Gérer les collaborateurs si fournis
//       if (data.collaborateurs && data.collaborateurs.length > 0 && organisation.userId) {
//         // Supprimer les anciens collaborateurs de ce projet
//         await prisma.collaborateur.deleteMany({
//           where: { projetId: projet.id }
//         });

//         // Créer les nouveaux collaborateurs (liés à l'utilisateur ET au projet)
//         for (const collab of data.collaborateurs) {
//           await prisma.collaborateur.create({
//             data: {
//               userId: organisation.userId, // L'utilisateur qui a créé ce collaborateur
//               projetId: projet.id, // Le projet sur lequel il travaille
//               nom: collab.nom,
//               prenom: collab.prenom,
//               email: collab.email,
//               telephone: collab.telephone ?? null,
//               role: collab.role ?? null
//             }
//           });
//         }
//       }

//       // Recharger le projet avec les collaborateurs
//       const finalProjet = await prisma.projet.findUnique({
//         where: { id: projet.id },
//         include: {
//           organisation: {
//             include: {
//               typeOrganisation: true
//             }
//           },
//           collaborateurs: true
//         }
//       });

//       return {
//         message: 'Projet soumis avec succès',
//         projet: finalProjet
//       };
//     } catch (error: any) {
//       console.error('❌ Erreur lors de la soumission du projet:', error);
//       throw new AppError(error.message || 'Erreur lors de la soumission du projet', 500);
//     }
//   }

//   /**
//    * Créer un nouveau projet (ancienne méthode - conservée pour compatibilité)
//    */
//   async createProjet(projetData: Partial<ProjetFormDTO>, files: any, userId: string) {
//     // Récupérer l'organisation liée à l'utilisateur
//     const organisation = await prisma.organisation.findUnique({
//       where: { id: userId }
//     });

//     if (!organisation) {
//       throw new AppError('Organisation non trouvée.', 404);
//     }

//     // Préparer les chemins de fichiers
//     const filesData: any = {};
//     if (files) {
//       if (files.cv) filesData.cv = Array.isArray(files.cv) ? files.cv.map((f: any) => f.path) : [files.cv.path];
//       if (files.ficheC) filesData.ficheC = files.ficheC[0]?.path;
//       if (files.lM) filesData.lM = files.lM[0]?.path;
//       if (files.stR) filesData.stR = files.stR[0]?.path;
//       if (files.rib) filesData.rib = files.rib[0]?.path;
//       if (files.cA) filesData.cA = files.cA[0]?.path;
//       if (files.budgetD) filesData.budgetD = files.budgetD[0]?.path;
//       if (files.che) filesData.che = files.che[0]?.path;
//       if (files.cartography) filesData.cartography = files.cartography[0]?.path;
//       if (files.lP) filesData.lP = files.lP[0]?.path;
//     }

//     // Créer le projet
//     const projet = await prisma.projet.create({
//       data: {
//         organisationId: organisation.id,
//         title: projetData.title,
//         actPrin: projetData.actPrin,
//         dateLimPro: projetData.dateLimPro ? new Date(projetData.dateLimPro) : null,
//         rAtt: projetData.rAtt,
//         objP: projetData.objP,
//         conjP: projetData.conjP,
//         lexGcp: projetData.lexGcp,
//         poRistEnvSoPo: projetData.poRistEnvSoPo,
//         dPRep: projetData.dPRep,
//         conseilPr: projetData.conseilPr,
//         stade: projetData.stade || 'BROUILLON',
//         funding: projetData.funding,
//         ...filesData
//       },
//       include: {
//         organisation: {
//           include: {
//             typeOrganisation: true
//           }
//         }
//       }
//     });

//     return projet;
//   }

//   /**
//    * Récupérer tous les projets avec pagination
//    */
//   async getAllProjets(page: number = 0, size: number = 10, eagerload: boolean = true) {
//     const skip = page * size;

//     const [projets, total] = await Promise.all([
//       prisma.projet.findMany({
//         skip,
//         take: size,
//         ...(eagerload && {
//           include: {
//             organisation: {
//               include: {
//                 typeOrganisation: true
//               }
//             }
//           }
//         }),
//         orderBy: {
//           createdAt: 'desc'
//         }
//       }),
//       prisma.projet.count()
//     ]);

//     return {
//       projets,
//       total,
//       page,
//       size,
//       totalPages: Math.ceil(total / size)
//     };
//   }

//   /**
//    * Récupérer tous les projets sans pagination
//    */
//   async getAllProjetsNoPage() {
//     const projets = await prisma.projet.findMany({
//       include: {
//         organisation: {
//           include: {
//             typeOrganisation: true
//           }
//         }
//       },
//       orderBy: {
//         createdAt: 'desc'
//       }
//     });

//     return projets;
//   }

//   /**
//    * Récupérer un projet par ID
//    */
//   async getProjetById(id: string) {
//     const projet = await prisma.projet.findUnique({
//       where: { id },
//       include: {
//         organisation: {
//           include: {
//             typeOrganisation: true
//           }
//         }
//       }
//     });

//     if (!projet) {
//       throw new AppError('Projet non trouvé.', 404);
//     }

//     return projet;
//   }

//   /**
//    * Récupérer le projet de l'utilisateur connecté
//    */
//   async getProjetByUser(userId: string) {
//     // Vérifier si l'utilisateur est une organisation
//     const organisation = await prisma.organisation.findUnique({
//       where: { id: userId }
//     });

//     if (!organisation) {
//       throw new AppError('Organisation non trouvée.', 404);
//     }

//     // Récupérer le dernier projet de cette organisation
//     const projet = await prisma.projet.findFirst({
//       where: { organisationId: organisation.id },
//       include: {
//         organisation: {
//           include: {
//             typeOrganisation: true
//           }
//         }
//       },
//       orderBy: {
//         createdAt: 'desc'
//       }
//     });

//     if (!projet) {
//       throw new AppError('Aucun projet trouvé pour cette organisation.', 404);
//     }

//     return projet;
//   }

//   /**
//    * Mettre à jour un projet (PUT)
//    */
//   async updateProjet(id: string, projetData: Partial<ProjetFormDTO>, userId: string) {
//     // Vérifier que le projet existe
//     const existingProjet = await prisma.projet.findUnique({
//       where: { id }
//     });

//     if (!existingProjet) {
//       throw new AppError('Projet non trouvé.', 404);
//     }

//     // Vérifier que l'utilisateur est propriétaire du projet
//     if (existingProjet.organisationId !== userId) {
//       throw new AppError("Vous n'avez pas l'autorisation de modifier ce projet.", 403);
//     }

//     // Mettre à jour le projet
//     const updatedProjet = await prisma.projet.update({
//       where: { id },
//       data: {
//         title: projetData.title!,
//         actPrin: projetData.actPrin!,
//         dateLimPro: projetData.dateLimPro ? new Date(projetData.dateLimPro) : null,
//         rAtt: projetData.rAtt!,
//         objP: projetData.objP!,
//         conjP: projetData.conjP!,
//         lexGcp: projetData.lexGcp!,
//         poRistEnvSoPo: projetData.poRistEnvSoPo!,
//         dPRep: projetData.dPRep!,
//         conseilPr: projetData.conseilPr!,
//         stade: projetData.stade!,
//         funding: projetData.funding!
//       },
//       include: {
//         organisation: {
//           include: {
//             typeOrganisation: true
//           }
//         }
//       }
//     });

//     return updatedProjet;
//   }

//   /**
//    * Mise à jour partielle (PATCH)
//    */
//   async partialUpdateProjet(id: string, projetData: Partial<ProjetFormDTO>, userId: string) {
//     // Vérifier que le projet existe
//     const existingProjet = await prisma.projet.findUnique({
//       where: { id }
//     });

//     if (!existingProjet) {
//       throw new AppError('Projet non trouvé.', 404);
//     }

//     // Vérifier que l'utilisateur est propriétaire du projet
//     if (existingProjet.organisationId !== userId) {
//       throw new AppError("Vous n'avez pas l'autorisation de modifier ce projet.", 403);
//     }

//     // Préparer les données à mettre à jour
//     const updateData: any = {};
//     Object.keys(projetData).forEach((key) => {
//       if (projetData[key as keyof ProjetFormDTO] !== undefined) {
//         updateData[key] = projetData[key as keyof ProjetFormDTO];
//       }
//     });

//     if (updateData.dateLimPro) {
//       updateData.dateLimPro = new Date(updateData.dateLimPro);
//     }

//     // Mettre à jour le projet
//     const updatedProjet = await prisma.projet.update({
//       where: { id },
//       data: updateData,
//       include: {
//         organisation: {
//           include: {
//             typeOrganisation: true
//           }
//         }
//       }
//     });

//     return updatedProjet;
//   }

//   /**
//    * Supprimer un projet
//    */
//   async deleteProjet(id: string, userId: string, isAdmin: boolean = false) {
//     // Vérifier que le projet existe
//     const existingProjet = await prisma.projet.findUnique({
//       where: { id }
//     });

//     if (!existingProjet) {
//       throw new AppError('Projet non trouvé.', 404);
//     }

//     // Vérifier les permissions
//     if (!isAdmin && existingProjet.organisationId !== userId) {
//       throw new AppError("Vous n'avez pas l'autorisation de supprimer ce projet.", 403);
//     }

//     // Supprimer le projet
//     await prisma.projet.delete({
//       where: { id }
//     });

//     return { message: 'Projet supprimé avec succès.' };
//   }

//   /**
//    * Récupérer tous les collaborateurs d'un utilisateur
//    * Permet de savoir combien de collaborateurs l'utilisateur a créés
//    */
//   async getCollaborateursByUser(userId: string) {
//     try {
//       // Récupérer l'organisation liée à l'utilisateur
//       const organisation = await prisma.organisation.findFirst({
//         where: { userId }
//       });

//       if (!organisation) {
//         throw new AppError('Organisation non trouvée.', 404);
//       }

//       // Récupérer tous les collaborateurs créés par cet utilisateur
//       const collaborateurs = await prisma.collaborateur.findMany({
//         where: { userId },
//         include: {
//           projet: {
//             select: {
//               id: true,
//               title: true,
//               status: true
//             }
//           }
//         },
//         orderBy: {
//           createdAt: 'desc'
//         }
//       });

//       return {
//         total: collaborateurs.length,
//         collaborateurs
//       };
//     } catch (error: any) {
//       console.error('❌ Erreur lors de la récupération des collaborateurs:', error);
//       throw new AppError(error.message || 'Erreur lors de la récupération des collaborateurs', 500);
//     }
//   }

//   /**
//    * Ajouter un collaborateur à un projet existant
//    */
//   async addCollaborateur(
//     userId: string,
//     projetId: string,
//     collaborateurData: {
//       nom: string;
//       prenom: string;
//       email: string;
//       telephone?: string;
//       role?: string;
//     }
//   ) {
//     try {
//       // Vérifier que le projet existe et appartient à l'utilisateur
//       const projet = await prisma.projet.findFirst({
//         where: {
//           id: projetId,
//           organisation: {
//             userId
//           }
//         }
//       });

//       if (!projet) {
//         throw new AppError('Projet non trouvé ou non autorisé', 404);
//       }

//       // Créer le collaborateur
//       const collaborateur = await prisma.collaborateur.create({
//         data: {
//           userId,
//           projetId,
//           nom: collaborateurData.nom,
//           prenom: collaborateurData.prenom,
//           email: collaborateurData.email,
//           telephone: collaborateurData.telephone ?? null,
//           role: collaborateurData.role ?? null
//         },
//         include: {
//           projet: {
//             select: {
//               id: true,
//               title: true
//             }
//           }
//         }
//       });

//       return {
//         message: 'Collaborateur ajouté avec succès',
//         collaborateur
//       };
//     } catch (error: any) {
//       console.error("❌ Erreur lors de l'ajout du collaborateur:", error);
//       throw new AppError(error.message || "Erreur lors de l'ajout du collaborateur", 500);
//     }
//   }

//   /**
//    * Supprimer un collaborateur
//    */
//   async deleteCollaborateur(userId: string, collaborateurId: string) {
//     try {
//       // Vérifier que le collaborateur existe et appartient à l'utilisateur
//       const collaborateur = await prisma.collaborateur.findFirst({
//         where: {
//           id: collaborateurId,
//           userId
//         }
//       });

//       if (!collaborateur) {
//         throw new AppError('Collaborateur non trouvé ou non autorisé', 404);
//       }

//       // Supprimer le collaborateur
//       await prisma.collaborateur.delete({
//         where: { id: collaborateurId }
//       });

//       return { message: 'Collaborateur supprimé avec succès' };
//     } catch (error: any) {
//       console.error('❌ Erreur lors de la suppression du collaborateur:', error);
//       throw new AppError(error.message || 'Erreur lors de la suppression du collaborateur', 500);
//     }
//   }
// }
