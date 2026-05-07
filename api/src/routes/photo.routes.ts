import { Router } from 'express';
import { PhotoController } from '../controllers/photo.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { uploadPhotos } from '../middlewares/upload.middleware.js';

const photoRouter = Router();

photoRouter.use(authenticateToken);

photoRouter.get('/files/:filename', PhotoController.serveFile);
photoRouter.post('/uploads', uploadPhotos, PhotoController.uploadMany);
photoRouter.delete('/:id', PhotoController.deleteTemporary);

export default photoRouter;