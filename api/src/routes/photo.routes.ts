import { Router } from 'express';
import { PhotoController } from '../controllers/photo.controller.js';
import { authenticateToken, requirePermission } from '../middlewares/auth.middleware.js';
import { uploadPhotos } from '../middlewares/upload.middleware.js';

const photoRouter = Router();

photoRouter.use(authenticateToken);

photoRouter.get('/files/:filename', requirePermission('document:read'), PhotoController.serveFile);
photoRouter.post('/uploads', requirePermission('document:create'), uploadPhotos, PhotoController.uploadMany);
photoRouter.delete('/:id', requirePermission('document:delete'), PhotoController.deleteTemporary);

export default photoRouter;