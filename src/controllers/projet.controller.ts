// import { NextFunction, Request, Response } from 'express';
// import { ProjetService } from '../services/projet.service.js';
// import { ProjetFormDTO } from '../types/index.js';

// const projetService = new ProjetService();

// export class ProjetController {
//   /**
//    * POST /api/projets/submit
//    * Soumettre un projet complet depuis le wizard (avec fichiers)
//    */
//   static async submitProject(req: Request, res: Response, next: NextFunction) {
//     try {
//       if (!req.user) {
//         return res.status(401).json({ error: 'Authentification requise.' });
//       }

//       // Extraire les données du projet (envoyées en JSON dans le champ 'projectData')
//       const projectDataStr = req.body.projectData;
//       if (!projectDataStr) {
//         return res.status(400).json({ error: 'Données du projet manquantes.' });
//       }

//       const projectData = typeof projectDataStr === 'string' ? JSON.parse(projectDataStr) : projectDataStr;

//       // Extraire les fichiers uploadés
//       const files = (req as any).files as { [fieldname: string]: Express.Multer.File[] };

//       // Construire le mapping des attachements
//       const attachments: any = {};

//       if (files) {
//         Object.keys(files).forEach((key) => {
//           const fileArray = files[key];
//           if (fileArray && fileArray.length > 0) {
//             // Pour le CV, on stocke un tableau de chemins
//             if (key.includes('CV')) {
//               attachments.CV = fileArray.map((f) => `/uploads/projets/${f.filename}`);
//             } else {
//               // Pour les autres, on stocke le chemin du premier fichier
//               attachments[key.replace('attachment_', '')] = `/uploads/projets/${fileArray[0]?.filename!}`;
//             }
//           }
//         });
//       }

//       // Fusionner les attachments dans projectData
//       const completeProjectData = {
//         ...projectData,
//         attachments
//       };

//       const userId = req.user.userId;
//       const result = await projetService.submitProject(userId, completeProjectData);

//       // Log pour debug
//       console.log('✅ Projet soumis avec succès:', {
//         projetId: result.projet?.id!,
//         title: result.projet?.title!,
//         documentsCount: Object.keys(attachments).length
//       });

//       res.status(201).json(result);
//     } catch (error) {
//       console.error('❌ Erreur soumission projet:', error);
//       next(error);
//     }
//   }

//   /**
//    * GET /api/projets/my-project
//    * Récupérer le projet de l'utilisateur connecté
//    */
//   static async getMyProject(req: Request, res: Response, next: NextFunction) {
//     try {
//       if (!req.user) {
//         return res.status(401).json({ error: 'Authentification requise.' });
//       }

//       const organisationId = req.user.userId;
//       const projet = await projetService.getProjetByUser(organisationId);

//       res.json(projet);
//     } catch (error) {
//       next(error);
//     }
//   }

//   /**
//    * GET /api/projets/my-collaborateurs
//    * Récupérer tous les collaborateurs de l'utilisateur
//    */
//   static async getMyCollaborateurs(req: Request, res: Response, next: NextFunction) {
//     try {
//       if (!req.user) {
//         return res.status(401).json({ error: 'Authentification requise.' });
//       }

//       const userId = req.user.userId;
//       const result = await projetService.getCollaborateursByUser(userId);

//       res.json(result);
//     } catch (error) {
//       next(error);
//     }
//   }

//   /**
//    * POST /api/projets/:projetId/collaborateurs
//    * Ajouter un collaborateur à un projet
//    */
//   static async addCollaborateur(req: Request, res: Response, next: NextFunction) {
//     try {
//       if (!req.user) {
//         return res.status(401).json({ error: 'Authentification requise.' });
//       }

//       const userId = req.user.userId;
//       const projetId = req.params.projetId;
//       const collaborateurData = req.body;

//       const result = await projetService.addCollaborateur(userId, projetId!, collaborateurData);

//       res.status(201).json(result);
//     } catch (error) {
//       next(error);
//     }
//   }

//   /**
//    * DELETE /api/projets/collaborateurs/:collaborateurId
//    * Supprimer un collaborateur
//    */
//   static async deleteCollaborateur(req: Request, res: Response, next: NextFunction) {
//     try {
//       if (!req.user) {
//         return res.status(401).json({ error: 'Authentification requise.' });
//       }

//       const userId = req.user.userId;
//       const collaborateurId = req.params.collaborateurId;

//       const result = await projetService.deleteCollaborateur(userId, collaborateurId!);

//       res.json(result);
//     } catch (error) {
//       next(error);
//     }
//   }

//   /**
//    * POST /api/aprojet-v1/createProjet
//    * Créer un nouveau projet (ancienne méthode - conservée pour compatibilité)
//    */
//   static async createProjet(req: Request, res: Response, next: NextFunction) {
//     try {
//       if (!req.user) {
//         return res.status(401).json({ error: 'Authentification requise.' });
//       }

//       const projetData: Partial<ProjetFormDTO> = req.body;
//       const files = (req as any).files; // multer files

//       const projet = await projetService.createProjet(projetData, files, req.user.userId);

//       res.status(201).json({
//         message: 'Projet créé avec succès.',
//         projet
//       });
//     } catch (error) {
//       next(error);
//     }
//   }

//   /**
//    * GET /api/aprojet-v1
//    * Récupérer tous les projets avec pagination
//    */
//   static async getAllProjets(req: Request, res: Response, next: NextFunction) {
//     try {
//       const page = parseInt(req.query.page as string) || 0;
//       const size = parseInt(req.query.size as string) || 10;
//       const eagerload = req.query.eagerload === 'true';

//       const result = await projetService.getAllProjets(page, size, eagerload);

//       res.json(result);
//     } catch (error) {
//       next(error);
//     }
//   }

//   /**
//    * GET /api/aprojet-v1/all
//    * Récupérer tous les projets sans pagination
//    */
//   static async getAllProjetsNoPage(req: Request, res: Response, next: NextFunction) {
//     try {
//       const projets = await projetService.getAllProjetsNoPage();

//       res.json(projets);
//     } catch (error) {
//       next(error);
//     }
//   }

//   /**
//    * GET /api/aprojet-v1/:id
//    * Récupérer un projet par ID
//    */
//   static async getProjetById(req: Request, res: Response, next: NextFunction) {
//     try {
//       const { id } = req.params;
//       const projet = await projetService.getProjetById(id!);

//       res.json(projet);
//     } catch (error) {
//       next(error);
//     }
//   }

//   /**
//    * GET /api/aprojet-v1/user
//    * Récupérer le projet de l'utilisateur connecté
//    */
//   static async getProjetByUser(req: Request, res: Response, next: NextFunction) {
//     try {
//       if (!req.user) {
//         return res.status(401).json({ error: 'Authentification requise.' });
//       }

//       const projet = await projetService.getProjetByUser(req.user.userId);

//       res.json(projet);
//     } catch (error) {
//       next(error);
//     }
//   }

//   /**
//    * PUT /api/aprojet-v1/:id
//    * Mettre à jour un projet
//    */
//   static async updateProjet(req: Request, res: Response, next: NextFunction) {
//     try {
//       if (!req.user) {
//         return res.status(401).json({ error: 'Authentification requise.' });
//       }

//       const { id } = req.params;
//       const projetData: Partial<ProjetFormDTO> = req.body;

//       const projet = await projetService.updateProjet(id!, projetData, req.user.userId);

//       res.json({
//         message: 'Projet mis à jour avec succès.',
//         projet
//       });
//     } catch (error) {
//       next(error);
//     }
//   }

//   /**
//    * PATCH /api/aprojet-v1/:id
//    * Mise à jour partielle d'un projet
//    */
//   static async partialUpdateProjet(req: Request, res: Response, next: NextFunction) {
//     try {
//       if (!req.user) {
//         return res.status(401).json({ error: 'Authentification requise.' });
//       }

//       const { id } = req.params;
//       const projetData: Partial<ProjetFormDTO> = req.body;

//       const projet = await projetService.partialUpdateProjet(id!, projetData, req.user.userId);

//       res.json({
//         message: 'Projet mis à jour avec succès.',
//         projet
//       });
//     } catch (error) {
//       next(error);
//     }
//   }

//   /**
//    * DELETE /api/aprojet-v1/:id
//    * Supprimer un projet
//    */
//   static async deleteProjet(req: Request, res: Response, next: NextFunction) {
//     try {
//       if (!req.user) {
//         return res.status(401).json({ error: 'Authentification requise.' });
//       }

//       const { id } = req.params;
//       const isAdmin = req.user.userType === 'admin' || req.user.userType === 'agent';

//       const result = await projetService.deleteProjet(id!, req.user.userId, isAdmin);

//       res.json(result);
//     } catch (error) {
//       next(error);
//     }
//   }
// }
