import { NextFunction, Request, Response } from 'express';

// Validation des emails
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validation des mots de passe (min 6 caractères)
export const isValidPassword = (password: string): boolean => {
  return password && password.length >= 6 ? true : false;
};

// Middleware de validation pour l'inscription
export const validateRegister = (req: Request, res: Response, next: NextFunction) => {
  const { email, motDePasse, nomUtilisateur } = req.body;

  if (!email || !motDePasse || !nomUtilisateur) {
    return res.status(400).json({
      error: "Email, mot de passe et nom d'utilisateur sont requis."
    });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "Format d'email invalide." });
  }

  if (!isValidPassword(motDePasse)) {
    return res.status(400).json({
      error: 'Le mot de passe doit contenir au moins 6 caractères.'
    });
  }

  if (nomUtilisateur.length < 3) {
    return res.status(400).json({
      error: "Le nom d'utilisateur doit contenir au moins 3 caractères."
    });
  }

  next();
};

// Middleware de validation pour le login
export const validateLogin = (req: Request, res: Response, next: NextFunction) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      error: "Nom d'utilisateur et mot de passe sont requis."
    });
  }

  next();
};

// Middleware de validation pour OTP
export const validateOtp = (req: Request, res: Response, next: NextFunction) => {
  const { otp } = req.params;

  if (!otp || otp.length !== 6 || !/^\d+$/.test(otp)) {
    return res.status(400).json({
      error: 'Code OTP invalide. Le code doit contenir 6 chiffres.'
    });
  }

  next();
};

// Middleware de validation pour l'organisation
export const validateOrganisation = (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: 'Email et mot de passe sont requis.'
    });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "Format d'email invalide." });
  }

  if (!isValidPassword(password)) {
    return res.status(400).json({
      error: 'Le mot de passe doit contenir au moins 6 caractères.'
    });
  }

  next();
};
