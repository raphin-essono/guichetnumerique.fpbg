// backend/src/services/sondage.service.ts
import { Prisma } from '@prisma/client';
import prisma from '../config/db';
import { CorpsCreationSondage } from '../types/sondage';

export class ServiceSondage {
  async obtenirMaReponse(idUtilisateur: string, cleQuestionnaire: string) {
    return prisma.surveyResponse.findFirst({
      where: { idUtilisateur, questionnaireKey: cleQuestionnaire }
    });
  }

  async creerReponse(idUtilisateur: string, donnees: CorpsCreationSondage) {
    try {
      const cree = await prisma.surveyResponse.create({
        data: {
          idUtilisateur,
          questionnaireKey: donnees.cleQuestionnaire,
          selectedKey: donnees.choixSelectionne as any, // enum Prisma
          otherText: donnees.texteAutre || null,
          comment: donnees.commentaire || null,
          meta: donnees?.meta!
        },
        select: { id: true, creeLe: true }
      });
      return cree;
    } catch (e: any) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        const err: any = new Error('Conflit : réponse déjà enregistrée pour cet utilisateur.');
        err.status = 409;
        throw err;
      }
      throw e;
    }
  }
}

export const serviceSondage = new ServiceSondage();
