import { NextFunction, Request, RequestHandler, Response } from 'express';
import jwt from 'jsonwebtoken';
import { JwtPayload } from '../types/index.js';

import { PrismaClient } from '@prisma/client';

// Étendre l'interface Request pour inclure user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

// Récupérer le JWT_SECRET avec une vérification
const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET n'est pas défini dans les variables d'environnement");
  }
  return secret;
};

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Récupérer le token depuis les cookies ou le header Authorization
    const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Token manquant. Authentification requise.' });
    }

    // Vérifier le token
    const decoded = jwt.verify(token, getJwtSecret()) as JwtPayload;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token invalide ou expiré.' });
  }
};

export const optionalAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');

    if (token) {
      const decoded = jwt.verify(token, getJwtSecret()) as JwtPayload;
      req.user = decoded;
    }
    next();
  } catch (error) {
    // Continue sans user si le token est invalide
    next();
  }
};

// Middleware pour vérifier que l'utilisateur est admin
export const adminMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentification requise.' });
  }

  if (req.user.userType !== 'admin' && req.user.userType !== 'agent') {
    return res.status(403).json({ error: 'Accès refusé. Droits administrateur requis.' });
  }

  next();
};

// Interface pour inclure user dans la requête authentifiée
// Interface pour inclure user dans la requête authentifiée
interface AuthRequest extends Request {
  user: {
    userId: string;
    role: 'UTILISATEUR' | 'ADMINISTRATEUR';
    email: string;
  }; // Explicitement optionnel avec undefined
}

const prisma = new PrismaClient();

// Clé secrète JWT (à stocker dans .env pour sécurité)
const JWT_SECRET = process.env.JWT_SECRET!;

export const authenticate: RequestHandler = async (req, res, next) => {
  try {
    console.log('[authenticate] === DÉBUT ===');
    console.log('[authenticate] Path:', req.path);

    // 1. Récupérer le token depuis les headers
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('[authenticate] ❌ ERREUR: Aucun token fourni ou format invalide');
      return res.status(401).json({ message: 'Aucun token fourni ou format invalide.' });
    }

    const token = authHeader.split(' ')[1];
    console.log('[authenticate] Token extrait:', token.substring(0, 20) + '...');

    // 2. Vérifier et décoder le token JWT
    const decoded = jwt.verify(token!, JWT_SECRET) as unknown as { userId: string; role?: string };
    console.log('[authenticate] Token décodé:', decoded);

    // Validation runtime pour userId
    if (!decoded.userId) {
      console.error('[authenticate] ❌ ERREUR: userId manquant dans le token');
      return res.status(401).json({ message: 'Token invalide : userId manquant.' });
    }

    // 3. Récupérer les infos utilisateur depuis la DB
    const utilisateur = await prisma.utilisateur.findUnique({
      where: { id: decoded.userId }
    });
    console.log('[authenticate] Utilisateur trouvé:', utilisateur ? `${utilisateur.email} (${utilisateur.id})` : 'NULL');

    if (!utilisateur || !utilisateur.actif) {
      console.error('[authenticate] ❌ ERREUR: Utilisateur non trouvé ou inactif');
      return res.status(401).json({ message: 'Utilisateur non trouvé ou inactif.' });
    }

    // 4. Valider et déduire le rôle
    let role: 'UTILISATEUR' | 'ADMINISTRATEUR';
    if (utilisateur.role === 'UTILISATEUR' || utilisateur.role === 'ADMINISTRATEUR') {
      role = utilisateur.role;
    } else {
      throw new Error('Rôle utilisateur invalide.');
    }

    const chemin = req.path.toLowerCase();
    if (chemin.startsWith('/admin')) {
      role = 'ADMINISTRATEUR';
    }

    // 5. Ajouter les infos utilisateur à la requête
    (req as AuthRequest).user = {
      userId: utilisateur.id,
      role: role,
      email: utilisateur.email
    };
    console.log('[authenticate] ✅ Authentification réussie - user ajouté à req:', (req as AuthRequest).user);

    // 6. Passer au prochain middleware/route
    next();
  } catch (error) {
    console.error('[authenticate] ❌ ERREUR exception:', error);
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ message: 'Token invalide ou expiré.' });
    }
    next(error);
  }
};
