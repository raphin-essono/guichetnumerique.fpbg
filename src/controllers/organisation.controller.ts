import { Request, Response, NextFunction } from 'express';
import { OrganisationService } from '../services/organisation.service.js';

const organisationService = new OrganisationService();

export class OrganisationController {
  /**
   * GET /api/organisations/organismeconnected
   * Récupérer l'organisation connectée
   */
  static async getOrganismeConnected(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentification requise.' });
      }

      const organisation = await organisationService.getOrganismeConnected(req.user.userId);

      res.json(organisation);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/organisations
   * Récupérer toutes les organisations (admin only)
   */
  static async getAllOrganisations(req: Request, res: Response, next: NextFunction) {
    try {
      const organisations = await organisationService.getAllOrganisations();

      res.json(organisations);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/organisations/:id
   * Récupérer une organisation par ID (admin only)
   */
  static async getOrganisationById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const organisation = await organisationService.getOrganisationById(id);

      res.json(organisation);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/organisations/:id
   * Mettre à jour une organisation
   */
  static async updateOrganisation(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentification requise.' });
      }

      const { id } = req.params;
      const isAdmin = req.user.userType === 'admin' || req.user.userType === 'agent';

      const organisation = await organisationService.updateOrganisation(
        id,
        req.body,
        req.user.userId!,  // Le '!' indique que nous savons qu'il est défini grâce à la vérification au-dessus
        isAdmin
      );

      res.json({
        message: 'Organisation mise à jour avec succès.',
        organisation
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/organisations/:id
   * Supprimer une organisation (admin only)
   */
  static async deleteOrganisation(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await organisationService.deleteOrganisation(id);

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}
