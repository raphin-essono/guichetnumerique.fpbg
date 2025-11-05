import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import prisma from '../config/db.js';
import { AppError } from '../middlewares/error.middleware.js';
import { JwtPayload, LoginVM, OrganisationDTO, UtilisateurDTO } from '../types/index.js';
import { generateOtp } from '../utils/generateOtp.js';
import { sendPasswordChangedEmail, sendPasswordResetEmail } from '../utils/mail_password_reset.js';
import { sendOTPEmail } from '../utils/mailer.js';

// Stockage temporaire des inscriptions en attente (en production, utilisez Redis)
const pendingRegistrations: {
  [email: string]: {
    registrationData: any;
    otp: string;
    otpExpiry: Date;
    type: 'user' | 'organisation';
  };
} = {};

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET n'est pas défini dans les variables d'environnement");
  }
  return secret;
};

/**
 * Convertir les BigInt en string pour la sérialisation JSON
 */
function serializeBigInt(obj: any): any {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'bigint') {
    return obj.toString();
  }

  if (Array.isArray(obj)) {
    return obj.map(serializeBigInt);
  }

  if (typeof obj === 'object') {
    const serialized: any = {};
    for (const key in obj) {
      serialized[key] = serializeBigInt(obj[key]);
    }
    return serialized;
  }

  return obj;
}

export class AuthService {
  /**
   * INSCRIPTION - Étape 1 : Enregistrer un agent FPBG et envoyer l'OTP
   * Cette méthode génère un code OTP et l'envoie par email à l'utilisateur
   */
  async registerAgentFpbg(userData: UtilisateurDTO) {
    const { email, nomUtilisateur, motDePasse } = userData;

    // ====================================
    // 1. Vérifier si l'utilisateur existe déjà
    // ====================================
    const existingUser = await prisma.utilisateur.findFirst({
      where: {
        OR: [{ email }]
      }
    });

    if (existingUser) {
      throw new AppError("Email ou nom d'utilisateur déjà utilisé.", 409);
    }

    // ====================================
    // 2. Hasher le mot de passe pour la sécurité
    // ====================================
    const hashedPassword = await bcrypt.hash(motDePasse, 12);

    // ====================================
    // 3. Générer le code OTP (6 chiffres, valide 5 minutes)
    // ====================================
    const otp = generateOtp();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // ====================================
    // 4. Stocker temporairement les données d'inscription
    // ====================================
    pendingRegistrations[email] = {
      registrationData: { ...userData, motDePasse: hashedPassword },
      otp,
      otpExpiry,
      type: 'user'
    };

    // ====================================
    // 5. Envoyer l'OTP par email via Nodemailer
    // ====================================
    console.log(`📧 OTP généré pour ${email}: ${otp}`);

    try {
      await sendOTPEmail(email, otp, userData.prenom || userData.nomUtilisateur || 'Utilisateur');
      console.log(`✅ Email OTP envoyé à ${email}`);
    } catch (error: any) {
      console.error(`❌ Erreur envoi email à ${email}:`, error.message);
      throw new AppError("Impossible d'envoyer l'email de vérification", 500);
    }

    return {
      message: 'Un code de vérification a été envoyé à votre adresse email.',
      email
    };
  }

  /**
   * INSCRIPTION - Étape 1 : Enregistrer une organisation et envoyer l'OTP
   * Cette méthode génère un code OTP et l'envoie par email à l'organisation
   */
  async registerOrganisation(orgData: OrganisationDTO) {
    const { email, motDePasse, ...otherData } = orgData;

    // ====================================
    // 1. Vérifier si l'email existe déjà (Utilisateur ou Organisation)
    // ====================================
    const existingUser = await prisma.utilisateur.findUnique({ where: { email } });
    const existingOrg = await prisma.organisation.findFirst({ where: { email } });

    if (existingUser || existingOrg) {
      throw new AppError('Cet email est déjà utilisé.', 409);
    }

    // ====================================
    // 2. Valider et hasher le mot de passe
    // ====================================
    if (!motDePasse || typeof motDePasse !== 'string' || motDePasse.trim() === '') {
      throw new AppError('Un mot de passe valide est requis.', 400);
    }

    const hashedPassword = await bcrypt.hash(motDePasse, 6); // Supprimez l'opérateur !

    // ====================================
    // 3. Générer le code OTP (6 chiffres, valide 5 minutes)
    // ====================================
    const otp = generateOtp();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // ====================================
    // 4. Stocker temporairement les données d'inscription
    // ====================================
    pendingRegistrations[email] = {
      registrationData: { ...orgData, password: hashedPassword },
      otp,
      otpExpiry,
      type: 'organisation'
    };

    // ====================================
    // 5. Envoyer l'OTP par email via Nodemailer
    // ====================================
    console.log(`📧 OTP généré pour ${email}: ${otp}`);

    try {
      await sendOTPEmail(email, otp, orgData.nom_organisation || orgData.personneContact || 'Organisation');
      console.log(`✅ Email OTP envoyé à ${email}`);
    } catch (error: any) {
      console.error(`❌ Erreur envoi email à ${email}:`, error.message);
      throw new AppError("Impossible d'envoyer l'email de vérification", 500);
    }

    return {
      message: 'Un code de vérification a été envoyé à votre adresse email.',
      email
    };
  }

  /**
   * INSCRIPTION - Étape 2 : Vérifier l'OTP et créer le compte
   * Cette méthode vérifie le code OTP entré par l'utilisateur,
   * crée le compte dans la base de données, et génère un token JWT
   */
  async verifyOtp(email: string, otp: string) {
    // ====================================
    // 1. Récupérer les données d'inscription en attente
    // ====================================
    const pending = pendingRegistrations[email];

    if (!pending) {
      throw new AppError('Aucune inscription en attente pour cet email.', 400);
    }

    // ====================================
    // 2. Vérifier que le code OTP est correct
    // ====================================
    if (pending.otp !== otp) {
      throw new AppError('Code OTP invalide.', 400);
    }

    // ====================================
    // 3. Vérifier que le code OTP n'est pas expiré (5 minutes)
    // ====================================
    if (pending.otpExpiry < new Date()) {
      delete pendingRegistrations[email];
      throw new AppError("Code OTP expiré. Veuillez recommencer l'inscription.", 400);
    }

    const { registrationData, type } = pending;

    try {
      if (type === 'user') {
        // ====================================
        // 4a. UTILISATEUR : Créer le compte utilisateur
        // ====================================

        // 🔥 ÉTAPE PRÉALABLE : Vérifier si l'utilisateur existe déjà
        let existingUser = await prisma.utilisateur.findUnique({
          where: { email: registrationData.email }
        });

        if (existingUser) {
          console.log('⚠️ [INSCRIPTION USER] Utilisateur existe déjà - Connexion au lieu de création:', {
            id: existingUser.id,
            email: existingUser.email
          });

          // Supprimer les données temporaires
          delete pendingRegistrations[email];

          // Générer un nouveau token avec le bon userId
          const token = this.generateToken({
            userId: existingUser.id,
            email: existingUser.email,
            userType: 'user'
          });

          const { hashMotPasse: _, ...userWithoutPassword } = existingUser;

          return {
            message: 'Connexion réussie !',
            token,
            user: userWithoutPassword,
            type: 'user',
            redirectTo: '/soumission',
            exigerSondage: true
          };
        }

        // Si l'utilisateur n'existe pas, le créer normalement
        const user = await prisma.utilisateur.create({
          data: {
            email: registrationData.email,
            hashMotPasse: registrationData.motDePasse,
            prenom: registrationData.prenom ?? null,
            nom: registrationData.nom ?? null,
            telephone: registrationData.telephone ?? null,
            role: 'UTILISATEUR'
          }
        });

        // Supprimer les données temporaires
        delete pendingRegistrations[email];

        // ====================================
        // 5a. Générer le token JWT pour la session
        // ====================================
        const token = this.generateToken({
          userId: user.id,
          email: user.email,
          userType: 'user'
        });

        const { hashMotPasse: _, ...userWithoutPassword } = user;

        // ====================================
        // 6. Retourner les données avec le chemin de redirection
        // ====================================
        return {
          message: 'Compte vérifié avec succès !',
          token,
          user: userWithoutPassword,
          type: 'user',
          redirectTo: '/soumission', // 🎯 Redirection vers soumission
          exigerSondage: true // 🎯 Activer le sondage pour les nouveaux utilisateurs
        };
      } else {
        // ====================================
        // 4b. ORGANISATION : Créer User → Organisation → TypeOrganisation
        // ====================================

        // 🔥 ÉTAPE PRÉALABLE : Vérifier si l'utilisateur existe déjà
        let existingUser = await prisma.utilisateur.findUnique({
          where: { email: registrationData.email },
          include: {
            organisation: {
              include: { typeSubvention: true }
            }
          }
        });

        if (existingUser) {
          console.log('⚠️ [INSCRIPTION ORG] Utilisateur existe déjà - Connexion au lieu de création:', {
            id: existingUser.id,
            email: existingUser.email
          });

          // Supprimer les données temporaires
          delete pendingRegistrations[email];

          // Générer un nouveau token avec le bon userId
          const token = this.generateToken({
            userId: existingUser.id,
            email: existingUser.email,
            userType: 'organisation'
          });

          const { hashMotPasse: _, ...userWithoutPassword } = existingUser;

          return {
            message: 'Connexion réussie !',
            token,
            user: {
              ...userWithoutPassword,
              organisation: existingUser.organisation ? serializeBigInt(existingUser.organisation) : null
            },
            type: 'organisation',
            redirectTo: '/soumission',
            exigerSondage: true
          };
        }

        // Si l'utilisateur n'existe pas, le créer normalement
        const result = await prisma.$transaction(async (tx) => {
          // ÉTAPE 1: Créer l'Utilisateur en premier
          console.log('📝 [INSCRIPTION ORG] Données reçues:', {
            email: registrationData.email,
            prenom: registrationData.prenom,
            nom: registrationData.nom,
            personneContact: registrationData.personneContact,
            telephone: registrationData.telephone,
            telephoneContact: registrationData.telephoneContact
          });

          // 🎯 Utiliser directement prenom et nom du formulaire
          // personneContact est généré automatiquement (prenom + nom) côté frontend
          const user = await tx.utilisateur.create({
            data: {
              email: registrationData.email,
              hashMotPasse: registrationData.password,
              prenom: registrationData.prenom ?? null,
              nom: registrationData.nom ?? null,
              telephone: registrationData.telephoneContact ?? registrationData.telephone ?? null,
              role: 'UTILISATEUR'
            }
          });

          console.log('✅ [INSCRIPTION ORG] Utilisateur créé:', {
            id: user.id,
            email: user.email,
            prenom: user.prenom,
            nom: user.nom,
            telephone: user.telephone,
            nomComplet: `${user.prenom} ${user.nom}`
          });

          // ÉTAPE 2: Mapper le type d'organisation vers l'enum TypeOrganisation
          const mapTypeOrganisation = (type: string): any => {
            const mapping: Record<string, string> = {
              'Secteur privé (PME, PMI, Startups)': 'PRIVE',
              'ONG et Associations': 'ONG',
              'Coopératives communautaires': 'COOPERATIVE',
              'Communautés organisées': 'COMMUNAUTE',
              'Entités gouvernementales': 'SECTEUR_PUBLIC',
              'Organismes de recherche': 'RECHERCHE'
            };
            return mapping[type] || 'AUTRE';
          };

          // ÉTAPE 2.5: Trouver le TypeSubvention correspondant
          let idTypeSubvention: number | undefined;
          if (registrationData.typeSubvention) {
            const typeSubventionStr = registrationData.typeSubvention.toLowerCase();
            const code = typeSubventionStr.includes('petite')
              ? 'PETITE'
              : typeSubventionStr.includes('moyenne')
              ? 'MOYENNE'
              : null;

            if (code) {
              const typeSubvention = await tx.typeSubvention.findUnique({
                where: { code }
              });
              idTypeSubvention = typeSubvention?.id;
            }
          }

          // ÉTAPE 3: Créer l'Organisation liée
          const type = registrationData.type;
          const organisation = await tx.organisation.create({
            data: {
              nom: registrationData.nom_organisation ?? registrationData.type ?? 'Organisation',
              type: mapTypeOrganisation(type),
              email: registrationData.email,
              telephone: registrationData.telephone ?? registrationData.telephoneContact ?? null,
              idTypeSubvention, // 🎯 Sauvegarder le type de subvention choisi
              utilisateurs: {
                connect: { id: user.id } // 🔗 Lier l'utilisateur à l'organisation
              }
            },
            include: {
              typeSubvention: true // 🎯 Inclure le typeSubvention dans la réponse
            }
          });

          // ÉTAPE 4: Récupérer l'utilisateur mis à jour avec idOrganisation
          const updatedUser = await tx.utilisateur.findUnique({
            where: { id: user.id },
            include: {
              organisation: {
                include: {
                  typeSubvention: true
                }
              }
            }
          });

          return { user: updatedUser!, organisation };
        });

        // Supprimer les données temporaires
        delete pendingRegistrations[email];

        // ====================================
        // 5b. Générer le token JWT avec l'ID du User (pas de l'organisation)
        // ====================================
        const token = this.generateToken({
          userId: result.user.id,
          email: result.user.email,
          userType: 'organisation'
        });

        const { hashMotPasse: _, ...userWithoutPassword } = result.user;

        // ====================================
        // 6. Retourner les données avec le chemin de redirection
        // ====================================
        return {
          message: 'Compte vérifié avec succès !',
          token,
          user: {
            ...userWithoutPassword,
            organisation: serializeBigInt(result.organisation) // 🎯 Sérialiser les BigInt
          },
          type: 'organisation',
          redirectTo: '/soumission', // 🎯 Redirection vers soumission
          exigerSondage: true // 🎯 Activer le sondage pour les nouvelles organisations
        };
      }
    } catch (error: any) {
      delete pendingRegistrations[email];
      throw new AppError('Erreur lors de la création du compte: ' + error.message, 500);
    }
  }

  /**
   * CONNEXION - Authentification avec email + mot de passe uniquement
   */
  async login(loginData: LoginVM) {
    const { email, motDePasse } = loginData;

    // Le username est maintenant toujours un EMAIL
    // On cherche d'abord parmi les utilisateurs (par email uniquement)
    const user = await prisma.utilisateur.findUnique({
      where: { email: email },
      include: {
        organisation: {
          include: {
            typeSubvention: true // 🎯 Inclure le type de subvention
          }
        }
      }
    });

    if (user) {
      // Vérifier le mot de passe
      const isPasswordValid = await bcrypt.compare(motDePasse, user.hashMotPasse);

      if (!isPasswordValid) {
        throw new AppError('Email ou mot de passe incorrect.', 401);
      }

      // Générer le token JWT avec l'ID de l'utilisateur
      const token = this.generateToken({
        userId: user.id,
        email: user.email,
        userType: user.organisation ? 'organisation' : 'user'
      });

      const { hashMotPasse: _, ...userWithoutSensitiveData } = user;

      // ✅ Déterminer la redirection en fonction du rôle
      let redirectTo = '/dashboard'; // Par défaut
      if (user.role === 'ADMINISTRATEUR') {
        redirectTo = '/admin/dashboard';
      }

      console.log('✅ [AUTH SERVICE] Login réussi:', {
        email: user.email,
        role: user.role,
        type: user.organisation ? 'organisation' : 'user',
        redirectTo,
        prenom: user.prenom,
        nom: user.nom,
        organisation: user.organisation
          ? {
              nom: user.organisation.nom,
              typeSubvention: user.organisation.typeSubvention
            }
          : null
      });

      const responseData = {
        message: 'Connexion réussie.',
        token,
        user: serializeBigInt(userWithoutSensitiveData), // 🎯 Sérialiser les BigInt
        type: user.organisation ? 'organisation' : 'user',
        role: user.role, // ✅ Ajouter le rôle dans la réponse
        redirectTo // ✅ Ajouter la redirection basée sur le rôle
      };

      console.log('📋 [AUTH SERVICE] Données de réponse complètes:', JSON.stringify(responseData, null, 2));

      return responseData;
    }

    throw new AppError('Email ou mot de passe incorrect.', 401);
  }

  /**
   * Vérifier si l'utilisateur est authentifié
   */
  async isAuthenticated(userId: string) {
    // Chercher l'utilisateur avec son organisation
    const user = await prisma.utilisateur.findUnique({
      where: { id: userId },
      include: {
        organisation: {
          include: {
            typeSubvention: true // 🎯 Inclure le type de subvention
          }
        }
      }
    });

    if (user) {
      const { hashMotPasse: _, ...userWithoutPassword } = user;
      return {
        user: serializeBigInt(userWithoutPassword), // 🎯 Sérialiser les BigInt
        type: user.organisation ? 'organisation' : 'user'
      };
    }

    throw new AppError('Utilisateur non trouvé.', 404);
  }

  /**
   * Rafraîchir le token
   */
  async refreshToken(userId: string) {
    const { user, type } = await this.isAuthenticated(userId);

    const token = this.generateToken({
      userId: user.id,
      email: user.email,
      userType: type === 'user' ? (user as any).userType : 'organisation'
    });

    return { token, user, type };
  }

  /**
   * Générer un token JWT
   */
  private generateToken(payload: JwtPayload): string {
    return jwt.sign(payload, getJwtSecret(), { expiresIn: '7d' });
  }

  /**
   * RENVOYER OTP : Générer et envoyer un nouveau code OTP
   * Cette méthode permet de renvoyer un nouveau code OTP si le précédent a expiré
   * ou n'a pas été reçu par l'utilisateur
   */
  async resendOtp(email: string) {
    // ====================================
    // 1. Vérifier qu'il existe une inscription en attente
    // ====================================
    const pending = pendingRegistrations[email];

    if (!pending) {
      throw new AppError('Aucune inscription en attente pour cet email.', 400);
    }

    // ====================================
    // 2. Générer un nouveau code OTP (6 chiffres, valide 5 minutes)
    // ====================================
    const otp = generateOtp();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Mettre à jour le code OTP dans les données temporaires
    pending.otp = otp;
    pending.otpExpiry = otpExpiry;

    // ====================================
    // 3. Envoyer le nouveau OTP par email via Nodemailer
    // ====================================
    console.log(`📧 Nouveau OTP généré pour ${email}: ${otp}`);

    try {
      const userName =
        pending.type === 'user'
          ? pending.registrationData.prenom || pending.registrationData.nomUtilisateur || 'Utilisateur'
          : pending.registrationData.nom || pending.registrationData.personneContact || 'Organisation';

      await sendOTPEmail(email, otp, userName);
      console.log(`✅ Nouvel email OTP envoyé à ${email}`);
    } catch (error: any) {
      console.error(`❌ Erreur envoi email à ${email}:`, error.message);
      throw new AppError("Impossible d'envoyer l'email de vérification", 500);
    }

    return {
      message: 'Un nouveau code de vérification a été envoyé à votre adresse email.',
      email
    };
  }

  /**
   * ✅ MOT DE PASSE OUBLIÉ : Génère un token et envoie l'email
   * @param email - Email de l'utilisateur
   * @param frontendOrigin - URL d'origine du frontend (détectée automatiquement depuis les headers)
   */
  async forgotPassword(email: string, frontendOrigin?: string) {
    // ====================================
    // 1. Vérifier si l'utilisateur existe
    // ====================================
    const user = await prisma.utilisateur.findUnique({
      where: { email }
    });

    if (!user) {
      // ⚠️ Pour la sécurité, on ne révèle pas si l'email existe ou non
      throw new AppError('Aucun compte trouvé avec cet email.', 404);
    }

    // ====================================
    // 2. Générer un token de réinitialisation sécurisé
    // ====================================
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 heure

    // ====================================
    // 3. Sauvegarder le token dans la base de données
    // ====================================
    await prisma.utilisateur.update({
      where: { id: user.id },
      data: {
        resetToken: resetTokenHash,
        resetTokenExpiry
      }
    });

    // ====================================
    // 4. Construire le lien de réinitialisation
    // ====================================
    // Utiliser l'origine détectée, sinon variable d'environnement, sinon URL par défaut
    const frontendUrl =
      frontendOrigin || process.env.FRONTEND_URL || 'https://guichetnumerique.fpbg.ga';
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

    console.log(`🔗 [FORGOT-PASSWORD] URL générée: ${resetLink}`);
    console.log(`📧 [FORGOT-PASSWORD] Frontend URL utilisée: ${frontendUrl}`);
    console.log(`🌐 [FORGOT-PASSWORD] Origin passé: ${frontendOrigin || 'non fourni'}`);

    // ====================================
    // 5. Envoyer l'email de réinitialisation
    // ====================================
    const userName = `${user.prenom || ''} ${user.nom || ''}`.trim() || 'Utilisateur';

    try {
      await sendPasswordResetEmail(email, userName, resetLink);
      console.log(`✅ [FORGOT-PASSWORD] Email envoyé à ${email} avec le lien de réinitialisation`);
    } catch (error: any) {
      console.error(`❌ [FORGOT-PASSWORD] Erreur envoi email:`, error.message);
      throw new AppError("Impossible d'envoyer l'email de réinitialisation", 500);
    }

    return {
      message: 'Un email de réinitialisation a été envoyé à votre adresse.'
    };
  }

  /**
   * ✅ RÉINITIALISATION DU MOT DE PASSE : Vérifie le token et change le MDP
   */
  async resetPassword(token: string, newPassword: string) {
    // ====================================
    // 1. Hasher le token pour comparer avec la BDD
    // ====================================
    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // ====================================
    // 2. Rechercher l'utilisateur avec ce token valide
    // ====================================
    const user = await prisma.utilisateur.findFirst({
      where: {
        resetToken: resetTokenHash,
        resetTokenExpiry: {
          gt: new Date() // Token non expiré
        }
      }
    });

    if (!user) {
      throw new AppError('Lien de réinitialisation invalide ou expiré.', 400);
    }

    // ====================================
    // 3. Hasher le nouveau mot de passe
    // ====================================
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // ====================================
    // 4. Mettre à jour le mot de passe et supprimer le token
    // ====================================
    await prisma.utilisateur.update({
      where: { id: user.id },
      data: {
        hashMotPasse: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null
      }
    });

    // ====================================
    // 5. Envoyer un email de confirmation
    // ====================================
    const userName = `${user.prenom || ''} ${user.nom || ''}`.trim() || 'Utilisateur';

    try {
      await sendPasswordChangedEmail(user.email, userName);
      console.log(`✅ [RESET-PASSWORD] Email de confirmation envoyé à ${user.email}`);
    } catch (error: any) {
      console.error(`❌ [RESET-PASSWORD] Erreur envoi email de confirmation:`, error.message);
      // On ne fait pas échouer la réinitialisation si l'email ne part pas
    }

    return {
      message: 'Votre mot de passe a été réinitialisé avec succès.'
    };
  }
}
