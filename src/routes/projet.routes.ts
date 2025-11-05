// import express, { Response, NextFunction } from 'express';
// import multer from 'multer';
// import path from 'path';
// import { v4 as uuidv4 } from 'uuid';
// import { ProjetController } from '../controllers/projet.controller.js';
// import { handleMulterError, upload } from '../middleware/upload.js';
// import { authMiddleware, optionalAuthMiddleware } from '../middlewares/auth.middleware.js';
// import demandeSubventionService from '../services/demandeSubvention.service.js';
// import { AuthRequest } from '../types/index.js';

// const router = express.Router();

// // ========================================
// // Configuration Multer pour les uploads de projets
// // ========================================
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, 'uploads/projets/');
//   },
//   filename: (req, file, cb) => {
//     const uniqueName = `${file.fieldname}_${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}_${Date.now()}-${Math.floor(Math.random() * 1000000000)}${path.extname(file.originalname)}`;
//     cb(null, uniqueName);
//   }
// });

// const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
//   const allowedMimes = [
//     'application/pdf',
//     'application/msword',
//     'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
//     'application/vnd.ms-excel',
//     'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
//     'image/jpeg',
//     'image/png'
//   ];

//   if (allowedMimes.includes(file.mimetype)) {
//     cb(null, true);
//   } else {
//     cb(new Error(`Type de fichier non autorisé: ${file.mimetype}`));
//   }
// };

// const projetUpload = multer({
//   storage,
//   fileFilter,
//   limits: {
//     fileSize: 10 * 1024 * 1024 // 10 Mo max
//   }
// });

// // Routes publiques (lecture seule)
// router.get('/', optionalAuthMiddleware, ProjetController.getAllProjets);
// router.get('/all', optionalAuthMiddleware, ProjetController.getAllProjetsNoPage);
// router.get('/:id', optionalAuthMiddleware, ProjetController.getProjetById);

// // Routes protégées
// // ✅ Route de soumission CORRIGÉE - Utilise maintenant demandeSubventionService
// router.post(
//   '/submit',
//   authMiddleware,
//   projetUpload.fields([
//     { name: 'attachment_LETTRE_MOTIVATION', maxCount: 1 },
//     { name: 'attachment_CV', maxCount: 1 },
//     { name: 'attachment_CERTIFICAT_ENREGISTREMENT', maxCount: 1 },
//     { name: 'attachment_STATUTS_REGLEMENT', maxCount: 1 },
//     { name: 'attachment_PV_ASSEMBLEE', maxCount: 1 },
//     { name: 'attachment_RAPPORTS_FINANCIERS', maxCount: 1 },
//     { name: 'attachment_RCCM', maxCount: 1 },
//     { name: 'attachment_AGREMENT', maxCount: 1 },
//     { name: 'attachment_ETATS_FINANCIERS', maxCount: 1 },
//     { name: 'attachment_DOCUMENTS_STATUTAIRES', maxCount: 1 },
//     { name: 'attachment_RIB', maxCount: 1 },
//     { name: 'attachment_LETTRES_SOUTIEN', maxCount: 1 },
//     { name: 'attachment_PREUVE_NON_FAILLITE', maxCount: 1 },
//     { name: 'attachment_CARTOGRAPHIE', maxCount: 1 },
//     { name: 'attachment_FICHE_CIRCUIT', maxCount: 1 },
//     { name: 'attachment_BUDGET_DETAILLE', maxCount: 1 },
//     { name: 'attachment_CHRONOGRAMME', maxCount: 1 }
//   ]),
//   async (req, res: Response, next: NextFunction) => {
//     try {
//       const authReq = req as AuthRequest;
//       if (!authReq.user) {
//         return res.status(401).json({ error: 'Authentification requise.' });
//       }

//       const idUtilisateur = authReq.user.userId;
//       const files = authReq.files as { [fieldname: string]: Express.Multer.File[] };

//       // Parser les données JSON du formulaire
//       let projectData;
//       try {
//         projectData = JSON.parse(authReq.body.projectData);
//       } catch (error) {
//         return res.status(400).json({
//           message: 'Données du projet invalides (JSON malformé).'
//         });
//       }

//       // Parser l'index des documents (métadonnées)
//       let attachmentsIndex;
//       try {
//         attachmentsIndex = JSON.parse(authReq.body.attachmentsIndex || '[]');
//       } catch (error) {
//         attachmentsIndex = [];
//       }

//       console.log('📥 [/api/aprojet-v1/submit] Réception soumission projet :');
//       console.log('  - Utilisateur:', idUtilisateur);
//       console.log('  - Titre:', projectData.title);
//       console.log('  - Fichiers uploadés:', Object.keys(files).length);

//       // ✅ Appeler le BON service : demandeSubventionService
//       const demande = await demandeSubventionService.soumettre(
//         projectData,
//         files,
//         attachmentsIndex,
//         idUtilisateur
//       );

//       res.status(201).json({
//         message: 'Projet soumis avec succès.',
//         data: demande
//       });
//     } catch (error: any) {
//       console.error('❌ Erreur soumission projet:', error);
//       next(error);
//     }
//   }
// );
// // ❌ ROUTE DÉSACTIVÉE - Version obsolète qui cause des erreurs 500
// // router.get('/my-project', authMiddleware, ProjetController.getMyProject); // Récupérer le projet de l'utilisateur
// router.get('/my-collaborateurs', authMiddleware, ProjetController.getMyCollaborateurs); // Liste des collaborateurs de l'utilisateur
// router.post('/:projetId/collaborateurs', authMiddleware, ProjetController.addCollaborateur); // Ajouter un collaborateur
// router.delete('/collaborateurs/:collaborateurId', authMiddleware, ProjetController.deleteCollaborateur); // Supprimer un collaborateur
// router.post('/createProjet', authMiddleware, ProjetController.createProjet);
// router.get('/user', authMiddleware, ProjetController.getProjetByUser);
// router.put('/:id', authMiddleware, ProjetController.updateProjet);
// router.patch('/:id', authMiddleware, ProjetController.partialUpdateProjet);
// router.delete('/:id', authMiddleware, ProjetController.deleteProjet);

// export default router;
