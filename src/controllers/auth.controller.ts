import { NextFunction, Request, Response } from 'express';
import { AppError } from '../middlewares/error.middleware.js';
import { AuthService } from '../services/auth.service.js';
import { OrganisationDTO } from '../types/index.js';

const authService = new AuthService();

export class AuthController {
  /**
   * ====================================
   * POST /api/auth/register/agent
   * ====================================
   * ÉTAPE 1 DE L'INSCRIPTION : Inscription d'un agent FPBG
   *
   * Cette route génère un code OTP et l'envoie par email à l'utilisateur
   * Body: FpbgUsersDTO (email, username, password, firstName, lastName, etc.)
   * Response: { message: string, email: string }
   */
  static async registerAgentFpbg(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.registerAgentFpbg(req.body);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * ====================================
   * POST /api/auth/register/organisation
   * ====================================
   * ÉTAPE 1 DE L'INSCRIPTION : Inscription d'une organisation
   *
   * Cette route génère un code OTP et l'envoie par email à l'organisation
   * Body: OrganisationDTO (email, password, name, username, etc.)
   * Response: { message: string, email: string }
   */
  static async registerOrganisation(req: Request, res: Response, next: NextFunction) {
    try {
      const orgData = req.body as OrganisationDTO;

      console.log('📥 [CONTROLLER] Données reçues du frontend:', {
        prenom: orgData.prenom,
        nom: orgData.nom,
        personneContact: orgData.personneContact,
        email: orgData.email,
        telephone: orgData.telephone,
        telephoneContact: orgData.telephoneContact
      });

      if (!orgData.email || !orgData.motDePasse) {
        return res.status(400).json({ message: 'Email et mot de passe sont requis.' });
      }

      const result = await authService.registerOrganisation(orgData);

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * ====================================
   * POST /api/auth/verify-otp
   * ====================================
   * ÉTAPE 2 DE L'INSCRIPTION : Vérification de l'OTP et création du compte
   *
   * Cette route vérifie le code OTP, crée le compte dans la base de données,
   * génère un token JWT et retourne l'URL de redirection vers /soumission
   *
   * Body: { email: string, otp: string }
   * Response: {
   *   message: string,
   *   token: string,
   *   user: object,
   *   type: string,
   *   redirectTo: '/soumission' 🎯
   * }
   */
  static async verifyOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, otp } = req.body;

      // Vérifier que les champs requis sont présents
      if (!email || !otp) {
        throw new AppError('Email et code OTP requis.', 400);
      }

      // Vérifier l'OTP et créer le compte
      const result = await authService.verifyOtp(email, otp);

      // Définir le cookie avec le token JWT (valide 7 jours)
      res.cookie('token', result.token, {
        httpOnly: true, // Empêche l'accès depuis JavaScript (sécurité XSS)
        secure: process.env.NODE_ENV === 'production', // HTTPS uniquement en production
        sameSite: 'lax', // Protection CSRF
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 jours
      });

      // ✅ Retourner la réponse avec redirectTo: '/soumission'
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * ====================================
   * POST /api/auth/resend-otp
   * ====================================
   * RENVOYER UN CODE OTP : Génère et envoie un nouveau code OTP
   *
   * Cette route permet de renvoyer un code OTP si l'utilisateur
   * ne l'a pas reçu ou s'il a expiré (valide 5 minutes)
   *
   * Body: { email: string }
   * Response: { message: string, email: string }
   */
  static async resendOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;

      // Vérifier que l'email est fourni
      if (!email) {
        throw new AppError('Email requis.', 400);
      }

      // Générer et envoyer un nouveau code OTP
      const result = await authService.resendOtp(email);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/login
   * Connexion avec email/username + mot de passe uniquement
   * Body: { email: string, motDePasse: string }
   */
  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, motDePasse } = req.body;

      console.log('📝 [LOGIN] Tentative de connexion pour:', email);

      if (!email || !motDePasse) {
        throw new AppError('Email/Username et mot de passe requis.', 400);
      }

      const result = await authService.login({ email, motDePasse });

      console.log('✅ [LOGIN] Connexion réussie pour:', email);
      console.log('✅ [LOGIN] Type utilisateur:', result.type);
      console.log('✅ [LOGIN] Token généré:', result.token.substring(0, 20) + '...');
      console.log('📋 [LOGIN] JSON retourné complet:', JSON.stringify(result, null, 2));

      // Définir le cookie avec le token
      res.cookie('token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 jours
      });

      console.log('✅ [LOGIN] Cookie défini, envoi de la réponse');

      res.json(result);
    } catch (error) {
      console.error('❌ [LOGIN] Erreur:', error);
      next(error);
    }
  }

  /**
   * GET /api/auth/me
   * Vérifier l'authentification et récupérer les infos utilisateur
   */
  static async authenticate(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Non authentifié.', 401);
      }

      const result = await authService.isAuthenticated(req.user.userId);
      res.json({ authenticated: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/logout
   * Déconnexion
   */
  static async logout(req: Request, res: Response) {
    res.clearCookie('token');
    res.json({ message: 'Déconnexion réussie.' });
  }

  /**
   * POST /api/auth/refresh-token
   * Rafraîchir le token JWT
   */
  static async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Non authentifié.', 401);
      }

      const result = await authService.refreshToken(req.user.userId);

      res.cookie('token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      res.json({
        message: 'Token rafraîchi avec succès.',
        ...result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * ====================================
   * POST /api/auth/forgot-password
   * ====================================
   * DEMANDE DE RÉINITIALISATION : Génère un token et envoie un email
   *
   * Body: { email: string }
   * Response: { message: string }
   */
  static async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;

      if (!email) {
        throw new AppError('Email requis.', 400);
      }

      console.log('🔐 [FORGOT-PASSWORD] Demande pour:', email);

      // Extraire l'origine de la requête pour générer le bon lien
      const origin =
        req.get('origin') ||
        req.get('referer')?.split('/').slice(0, 3).join('/') ||
        process.env.FRONTEND_URL ||
        'https://guichetnumerique.fpbg.ga';
      console.log('🌐 [FORGOT-PASSWORD] Origin détecté:', origin);

      const result = await authService.forgotPassword(email, origin);

      console.log('✅ [FORGOT-PASSWORD] Email envoyé à:', email);

      res.status(200).json(result);
    } catch (error) {
      console.error('❌ [FORGOT-PASSWORD] Erreur:', error);
      next(error);
    }
  }

  /**
   * ====================================
   * POST /api/auth/reset-password
   * ====================================
   * RÉINITIALISATION DU MOT DE PASSE : Vérifie le token et change le MDP
   *
   * Body: { token: string, newPassword: string }
   * Response: { message: string }
   */
  static async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        throw new AppError('Token et nouveau mot de passe requis.', 400);
      }

      if (newPassword.length < 6) {
        throw new AppError('Le mot de passe doit contenir au moins 6 caractères.', 400);
      }

      console.log('🔐 [RESET-PASSWORD] Réinitialisation avec token:', token.substring(0, 20) + '...');

      const result = await authService.resetPassword(token, newPassword);

      console.log('✅ [RESET-PASSWORD] Mot de passe réinitialisé avec succès');

      res.status(200).json(result);
    } catch (error) {
      console.error('❌ [RESET-PASSWORD] Erreur:', error);
      next(error);
    }
  }
}
