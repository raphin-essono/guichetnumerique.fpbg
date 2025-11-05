import { NextFunction, Request, Response } from 'express';
import { AAPService } from '../services/aap.service.js';

const aapService = new AAPService();

export class AAPController {
  /**
   * POST /api/aap
   * Créer un nouvel appel à projets (admin only)
   */
  static async createAAP(req: Request, res: Response, next: NextFunction) {
    try {
      const aap = await aapService.createAAP(req.body);

      res.status(201).json({
        message: 'Appel à projets créé avec succès.',
        aap
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/aap
   * Récupérer tous les appels à projets
   */
  static async getAllAAPs(req: Request, res: Response, next: NextFunction) {
    try {
      const includeInactive = req.query.includeInactive === 'true';
      const aaps = await aapService.getAllAAPs(includeInactive);

      res.json(aaps);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/aap/:id
   * Récupérer un appel à projets par ID
   */
  static async getAAPById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const aap = await aapService.getAAPById(id!);

      res.json(aap);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/aap/code/:code
   * Récupérer un appel à projets par code
   */
  static async getAAPByCode(req: Request, res: Response, next: NextFunction) {
    try {
      const { code } = req.params;
      const aap = await aapService.getAAPByCode(code!);

      res.json(aap);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/aap/:id
   * Mettre à jour un appel à projets (admin only)
   */
  static async updateAAP(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const aap = await aapService.updateAAP(id!, req.body);

      res.json({
        message: 'Appel à projets mis à jour avec succès.',
        aap
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/aap/:id/toggle
   * Activer/Désactiver un appel à projets (admin only)
   */
  static async toggleAAPStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const aap = await aapService.toggleAAPStatus(id!);

      res.json({
        message: `Appel à projets ${aap.isActive ? 'activé' : 'désactivé'} avec succès.`,
        aap
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/aap/:id
   * Supprimer un appel à projets (admin only)
   */
  static async deleteAAP(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await aapService.deleteAAP(id!);

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/aap/types/organisations
   * Récupérer les types d'organisations
   */
  static async getAllTypeOrganisations(req: Request, res: Response, next: NextFunction) {
    try {
      const types = await aapService.getAllTypeOrganisations();

      res.json(types);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/aap/types/organisations
   * Créer un type d'organisation (admin only)
   */
  static async createTypeOrganisation(req: Request, res: Response, next: NextFunction) {
    try {
      const { nom } = req.body;

      if (!nom) {
        return res.status(400).json({ error: "Le nom du type d'organisation est requis." });
      }

      const type = await aapService.createTypeOrganisation(nom);

      res.status(201).json({
        message: "Type d'organisation créé avec succès.",
        type
      });
    } catch (error) {
      next(error);
    }
  }
}
