import { Router } from 'express';
import { DocumentController } from '../controllers/document.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { uploadDocument, uploadDocuments } from '../middlewares/upload.middleware.js';

const documentRouter = Router();

documentRouter.use(authenticateToken);

// Servir les fichiers uploadés (auth requise)
documentRouter.get('/files/:filename', DocumentController.serveFile);
documentRouter.post('/uploads', uploadDocuments, DocumentController.uploadMany);

// CRUD documents
documentRouter.get('/',             DocumentController.list);
documentRouter.post('/',            uploadDocument, DocumentController.create);
documentRouter.get('/:id',          DocumentController.getById);
documentRouter.put('/:id',          DocumentController.update);
documentRouter.delete('/:id',       DocumentController.delete);
documentRouter.patch('/:id/archive', DocumentController.archive);

// Gestion des versions
documentRouter.get('/:id/versions',  DocumentController.getVersions);
documentRouter.post('/:id/versions', uploadDocument, DocumentController.addVersion);

export default documentRouter;
