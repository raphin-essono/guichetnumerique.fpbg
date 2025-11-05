import { Request, Response, NextFunction } from 'express';

// Interface pour les erreurs personnalisées
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Middleware de gestion globale des erreurs
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('❌ Erreur:', err);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  }

  // Erreurs Prisma
  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as any;

    if (prismaError.code === 'P2002') {
      return res.status(409).json({
        error: 'Cette valeur existe déjà dans la base de données.'
      });
    }

    if (prismaError.code === 'P2025') {
      return res.status(404).json({
        error: 'Enregistrement non trouvé.'
      });
    }
  }

  // Erreur par défaut
  return res.status(500).json({
    error: 'Une erreur interne du serveur s\'est produite.',
    ...(process.env.NODE_ENV === 'development' && {
      message: err.message,
      stack: err.stack
    })
  });
};

// Middleware pour gérer les routes non trouvées
export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    error: `Route ${req.method} ${req.path} non trouvée.`
  });
};
