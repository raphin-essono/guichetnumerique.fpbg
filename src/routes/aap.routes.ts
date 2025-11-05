import express from 'express';
import { AAPController } from '../controllers/aap.controller.js';
import { authMiddleware, adminMiddleware, optionalAuthMiddleware } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Routes publiques
router.get('/', optionalAuthMiddleware, AAPController.getAllAAPs);
router.get('/code/:code', optionalAuthMiddleware, AAPController.getAAPByCode);
router.get('/types/organisations', AAPController.getAllTypeOrganisations);
router.get('/:id', optionalAuthMiddleware, AAPController.getAAPById);

// Routes admin
router.post('/', authMiddleware, adminMiddleware, AAPController.createAAP);
router.put('/:id', authMiddleware, adminMiddleware, AAPController.updateAAP);
router.patch('/:id/toggle', authMiddleware, adminMiddleware, AAPController.toggleAAPStatus);
router.delete('/:id', authMiddleware, adminMiddleware, AAPController.deleteAAP);
router.post('/types/organisations', authMiddleware, adminMiddleware, AAPController.createTypeOrganisation);

export default router;
