import prisma from '../config/db.js';
import { AppError } from '../middlewares/error.middleware.js';

export class OrganisationService {
  /**
   * Récupérer l'organisation connectée
   */
  async getOrganismeConnected(userId: string) {
    const organisation = await prisma.organisation.findUnique({
      where: { id: userId },
      include: {
        projets: {
          orderBy: {
            creeLe: 'desc'
          },
          take: 10
        }
      }
    });

    if (!organisation) {
      throw new AppError('Organisation non trouvée.', 404);
    }

    // Retourner l'organisation directement (pas de champs sensibles dans ce modèle)
    return organisation;
  }

  /**
   * Récupérer toutes les organisations (admin only)
   */
  async getAllOrganisations() {
    const organisations = await prisma.organisation.findMany({
      include: {
        _count: {
          select: { projets: true }
        }
      },
      orderBy: {
        creeLe: 'desc'
      }
    });

    // Retourner directement les organisations
    return organisations;
  }

  /**
   * Récupérer une organisation par ID (admin only)
   */
  async getOrganisationById(id: string) {
    const organisation = await prisma.organisation.findUnique({
      where: { id },
      include: {
        projets: {
          orderBy: {
            creeLe: 'desc'
          }
        }
      }
    });

    if (!organisation) {
      throw new AppError('Organisation non trouvée.', 404);
    }

    return organisation;
  }

  /**
   * Mettre à jour une organisation
   */
  async updateOrganisation(id: string, data: any, userId: string, isAdmin: boolean = false) {
    // Vérifier les permissions
    if (!isAdmin && id !== userId) {
      throw new AppError('Vous n\'avez pas l\'autorisation de modifier cette organisation.', 403);
    }

    // Vérifier que l'organisation existe
    const existingOrg = await prisma.organisation.findUnique({
      where: { id }
    });

    if (!existingOrg) {
      throw new AppError('Organisation non trouvée.', 404);
    }

    // Mettre à jour l'organisation
    const updatedOrg = await prisma.organisation.update({
      where: { id },
      data: data
    });

    return updatedOrg;
  }

  /**
   * Supprimer une organisation (admin only)
   */
  async deleteOrganisation(id: string) {
    const organisation = await prisma.organisation.findUnique({
      where: { id },
      include: {
        _count: {
          select: { projets: true }
        }
      }
    });

    if (!organisation) {
      throw new AppError('Organisation non trouvée.', 404);
    }

    if (organisation._count.projets > 0) {
      throw new AppError('Impossible de supprimer une organisation avec des demandes de subvention existantes.', 400);
    }

    await prisma.organisation.delete({
      where: { id }
    });

    return { message: 'Organisation supprimée avec succès.' };
  }
}
