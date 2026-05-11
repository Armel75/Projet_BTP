import { Router } from 'express';
import { DocumentController } from '../controllers/document.controller.js';
import { authenticateToken, requirePermission } from '../middlewares/auth.middleware.js';
import { uploadDocument, uploadDocuments } from '../middlewares/upload.middleware.js';

const documentRouter = Router();

documentRouter.use(authenticateToken);

// Servir les fichiers uploadés (auth requise)
documentRouter.get('/files/:filename', requirePermission('document:read'), DocumentController.serveFile);
documentRouter.post('/uploads', requirePermission('document:create'), uploadDocuments, DocumentController.uploadMany);

// CRUD documents
documentRouter.get('/',             requirePermission('document:read'), DocumentController.list);
documentRouter.post('/',            requirePermission('document:create'), uploadDocument, DocumentController.create);
documentRouter.get('/:id',          requirePermission('document:read'), DocumentController.getById);
documentRouter.put('/:id',          requirePermission('document:update'), DocumentController.update);
documentRouter.delete('/:id',       requirePermission('document:delete'), DocumentController.delete);
documentRouter.patch('/:id/archive', requirePermission('document:update'), DocumentController.archive);

// Gestion des versions
documentRouter.get('/:id/versions',  requirePermission('document:read'), DocumentController.getVersions);
documentRouter.post('/:id/versions', requirePermission('document:update'), uploadDocument, DocumentController.addVersion);

export default documentRouter;
