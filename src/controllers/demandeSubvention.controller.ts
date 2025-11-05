import { NextFunction, Response } from 'express';
import { DemandeSubventionService } from '../services/demandeSubvention.service.js';
import { AuthRequest } from '../types/index.js';

const demandeSubService = new DemandeSubventionService();

export class DemandesController {
  /**
   * @route   POST /api/projets/submit
   * @desc    Soumettre un projet complet depuis le wizard (avec fichiers)
   * @access  Privé (utilisateur authentifié)
   */
  static async submitProject(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'Authentification requise.' });
        return;
      }

      // Extraire les données du projet (envoyées en JSON dans le champ 'projectData')
      const projectDataStr = req.body.projectData;
      if (!projectDataStr) {
        res.status(400).json({ message: 'Données du projet manquantes.' });
        return;
      }

      const projectData = typeof projectDataStr === 'string' ? JSON.parse(projectDataStr) : projectDataStr;

      // Extraire les fichiers uploadés
      const files = (req as any).files as { [fieldname: string]: Express.Multer.File[] };

      // Construire le mapping des attachements
      const attachments: any = {};

      if (files) {
        Object.keys(files).forEach((key) => {
          const fileArray = files[key];
          if (fileArray && fileArray.length > 0) {
            // Pour le CV, on stocke un tableau de chemins
            if (key.includes('CV')) {
              attachments.CV = fileArray.map((f) => `/uploads/projets/${f.filename}`);
            } else {
              // Pour les autres, on stocke le chemin du premier fichier
              attachments[key.replace('attachment_', '')] = `/uploads/projets/${fileArray[0]?.filename}`;
            }
          }
        });
      }

      // Fusionner les attachments dans projectData
      const completeProjectData = {
        ...projectData,
        attachments
      };

      const userId = req.user.userId;
      const result = await demandeSubService.creer(completeProjectData, userId);

      res.status(201).json({
        message: 'Projet soumis avec succès.',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   GET /api/projets/my-project
   * @desc    Récupérer le projet de l'utilisateur connecté
   * @access  Privé (utilisateur authentifié)
   */
  static async getMyProject(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'Authentification requise.' });
        return;
      }

      const userId = req.user.userId;
      const projet = await demandeSubService.obtenirParUtilisateur(userId);

      res.status(200).json({
        message: 'Projet récupéré avec succès.',
        data: projet
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   GET /api/projets
   * @desc    Récupérer tous les projets avec pagination
   * @access  Privé (authentifié)
   */
  static async obtenirTousLesProjets(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'Authentification requise.' });
        return;
      }

      const result = await demandeSubService.obtenirTout();

      res.status(200).json({
        message: 'Projets récupérés avec succès.',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   GET /api/projets/all
   * @desc    Récupérer tous les projets sans pagination
   * @access  Privé (authentifié)
  //  */
  // static async getAllProjetsNoPage(req: AuthRequest, res: Response, next: NextFunction) {
  //   try {
  //     if (!req.user) {
  //       res.status(401).json({ message: 'Authentification requise.' });
  //       return;
  //     }

  //     const projets = await projetService.getAllProjetsNoPage();

  //     res.status(200).json({
  //       message: 'Projets récupérés avec succès.',
  //       data: projets
  //     });
  //   } catch (error) {
  //     next(error);
  //   }
  // }

  /**
   * @route   GET /api/projets/:id
   * @desc    Récupérer un projet par ID
   * @access  Privé (authentifié)
   */
  static async obtenirDemandesParId(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'Authentification requise.' });
        return;
      }

      const { id } = req.params;
      const projet = await demandeSubService.obtenirParId(id!);

      res.status(200).json({
        message: 'Projet récupéré avec succès.',
        data: projet
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   PUT /api/projets/:id
   * @desc    Mettre à jour un projet
   * @access  Privé (propriétaire du projet)
   */
  static async mettreDemandeAJour(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'Authentification requise.' });
        return;
      }

      const { id } = req.params;
      const projetData = req.body;
      const userId = req.user.userId;

      const projet = await demandeSubService.mettreAJour(id!, projetData, userId);

      res.status(200).json({
        message: 'Projet mis à jour avec succès.',
        data: projet
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   PATCH /api/projets/:id
   * @desc    Mise à jour partielle d'un projet
   * @access  Privé (propriétaire du projet)
   */
  static async changerStatutDemande(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'Authentification requise.' });
        return;
      }

      const { id } = req.params;
      const projetData = req.body;
      const userId = req.user.userId;

      const projet = await demandeSubService.changerStatut(id!, projetData, userId);

      res.status(200).json({
        message: 'Projet mis à jour avec succès.',
        data: projet
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   DELETE /api/projets/:id
   * @desc    Supprimer un projet
   * @access  Privé (propriétaire du projet ou admin)
   */
  static async supprimerDemande(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'Authentification requise.' });
        return;
      }

      const { id } = req.params;
      const userId = req.user.userId;
      const isAdmin = req.user.role === 'ADMINISTRATEUR';

      const result = await demandeSubService.supprimer(id!, userId);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   GET /api/projets/my-collaborateurs
   * @desc    Récupérer tous les collaborateurs de l'utilisateur
   * @access  Privé (utilisateur authentifié)
   */
  // static async getMyCollaborateurs(req: AuthRequest, res: Response, next: NextFunction) {
  //   try {
  //     if (!req.user) {
  //       res.status(401).json({ message: 'Authentification requise.' });
  //       return;
  //     }

  //     const userId = req.user.userId;
  //     const result = await projetService.getCollaborateursByUser(userId);

  //     res.status(200).json({
  //       message: 'Collaborateurs récupérés avec succès.',
  //       data: result
  //     });
  //   } catch (error) {
  //     next(error);
  //   }
  // }

  /**
   * @route   POST /api/projets/:projetId/collaborateurs
   * @desc    Ajouter un collaborateur à un projet
   * @access  Privé (propriétaire du projet)
   */
  // static async addCollaborateur(req: AuthRequest, res: Response, next: NextFunction) {
  //   try {
  //     if (!req.user) {
  //       res.status(401).json({ message: 'Authentification requise.' });
  //       return;
  //     }

  //     const userId = req.user.userId;
  //     const { projetId } = req.params;
  //     const collaborateurData = req.body;

  //     const result = await projetService.addCollaborateur(userId, projetId!, collaborateurData);

  //     res.status(201).json(result);
  //   } catch (error) {
  //     next(error);
  //   }
  // }

  /**
   * @route   DELETE /api/projets/collaborateurs/:collaborateurId
   * @desc    Supprimer un collaborateur
   * @access  Privé (propriétaire du collaborateur)
   */
  //   static async deleteCollaborateur(req: AuthRequest, res: Response, next: NextFunction) {
  //     try {
  //       if (!req.user) {
  //         res.status(401).json({ message: 'Authentification requise.' });
  //         return;
  //       }

  //       const userId = req.user.userId;
  //       const { collaborateurId } = req.params;

  //       const result = await projetService.deleteCollaborateur(userId, collaborateurId!);

  //       res.status(200).json(result);
  //     } catch (error) {
  //       next(error);
  //     }
  //   }
}
