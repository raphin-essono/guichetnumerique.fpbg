import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();

// ========================================
// ROUTES D'INSCRIPTION (2 étapes)
// ========================================

/**
 * POST /api/auth/register/agent
 * Inscription d'un agent FPBG - Étape 1 : Envoi de l'OTP
 * Body: FpbgUsersDTO (email, username, password, firstName, lastName, etc.)
 * Response: { message: string, email: string }
 */
router.post('/register/agent', AuthController.registerAgentFpbg);

/**
 * POST /api/auth/register/organisation
 * Inscription d'une organisation - Étape 1 : Envoi de l'OTP
 * Body: OrganisationDTO (email, password, name, username, etc.)
 * Response: { message: string, email: string }
 */
router.post('/register/organisation', AuthController.registerOrganisation);

/**
 * POST /api/auth/verify-otp
 * Vérification de l'OTP - Étape 2 : Création définitive du compte
 * Body: { email: string, otp: string }
 * Response: { message: string, token: string, user: object, type: string }
 */
router.post('/verify-otp', AuthController.verifyOtp);

/**
 * POST /api/auth/resend-otp
 * Renvoyer un nouveau code OTP
 * Body: { email: string }
 * Response: { message: string, email: string }
 */
router.post('/resend-otp', AuthController.resendOtp);

// ========================================
// ROUTES D'AUTHENTIFICATION
// ========================================

/**
 * POST /api/auth/login
 * Connexion avec email/username + mot de passe UNIQUEMENT
 * Body: { username: string (email ou username), password: string }
 * Response: { message: string, token: string, user: object, type: string }
 */
router.post('/login', AuthController.login);

/**
 * POST /api/auth/logout
 * Déconnexion (supprime le cookie)
 * Response: { message: string }
 */
router.post('/logout', AuthController.logout);

/**
 * GET /api/auth/me
 * Récupérer les informations de l'utilisateur connecté
 * Requires: JWT token (cookie ou header Authorization)
 * Response: { authenticated: true, user: object, type: string }
 */
router.get('/me', authMiddleware, AuthController.authenticate);

/**
 * POST /api/auth/refresh-token
 * Rafraîchir le token JWT
 * Requires: JWT token (cookie ou header Authorization)
 * Response: { message: string, token: string, user: object, type: string }
 */
router.post('/refresh-token', authMiddleware, AuthController.refreshToken);

// ========================================
// ROUTES DE RÉINITIALISATION DE MOT DE PASSE
// ========================================

/**
 * POST /api/auth/forgot-password
 * Demande de réinitialisation de mot de passe
 * Génère un token de réinitialisation et envoie un email
 * Body: { email: string }
 * Response: { message: string }
 */
router.post('/forgot-password', AuthController.forgotPassword);

/**
 * POST /api/auth/reset-password
 * Réinitialisation du mot de passe avec le token
 * Body: { token: string, newPassword: string }
 * Response: { message: string }
 */
router.post('/reset-password', AuthController.resetPassword);

export default router;
