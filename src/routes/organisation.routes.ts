import express from 'express';
import { OrganisationController } from '../controllers/organisation.controller.js';
import { authMiddleware, adminMiddleware } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Routes protégées pour l'organisation connectée
router.get('/organismeconnected', authMiddleware, OrganisationController.getOrganismeConnected);
router.put('/:id', authMiddleware, OrganisationController.updateOrganisation);

// Routes admin
router.get('/', authMiddleware, adminMiddleware, OrganisationController.getAllOrganisations);
router.get('/:id', authMiddleware, adminMiddleware, OrganisationController.getOrganisationById);
router.delete('/:id', authMiddleware, adminMiddleware, OrganisationController.deleteOrganisation);

export default router;
