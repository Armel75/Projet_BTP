import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../middlewares/auth.middleware.js';
import { UPLOADS_ROOT } from '../middlewares/upload.middleware.js';
import { TenantContext } from '../config/tenant-context.js';
import { env } from '../config/env.js';
import { PhotoService } from '../services/photo.service.js';

function cleanupUploadedFiles(files: Express.Multer.File[]) {
  for (const file of files) {
    const filePath = path.join(UPLOADS_ROOT, path.basename(file.filename));
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}

export class PhotoController {
  private static resolveUser(req: Request): { id: number; tenant_id: number } {
    const requestUser = (req as AuthRequest).user;
    if (requestUser?.id && requestUser?.tenant_id) {
      return { id: Number(requestUser.id), tenant_id: Number(requestUser.tenant_id) };
    }

    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      throw new Error('Unauthorized');
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload;
    const userId = Number(decoded?.id);
    const tenantId = Number(decoded?.tenant_id);
    if (!userId || !tenantId) {
      throw new Error('Unauthorized');
    }

    return { id: userId, tenant_id: tenantId };
  }

  private static runWithTenant<T>(req: Request, fn: () => Promise<T>): Promise<T> {
    const user = PhotoController.resolveUser(req);
    return TenantContext.run(user.tenant_id, fn);
  }

  static async uploadMany(req: Request, res: Response) {
    const files = Array.isArray((req as any).files) ? ((req as any).files as Express.Multer.File[]) : [];

    try {
      const user = PhotoController.resolveUser(req);
      const projectId = Number(req.body.project_id);

      const uploadedPhotos = await PhotoController.runWithTenant(req, () =>
        PhotoService.uploadTemporaryPhotos({
          project_id: projectId,
          files,
          created_by: user.id,
        })
      );

      res.status(201).json({ files: uploadedPhotos });
    } catch (error: any) {
      cleanupUploadedFiles(files);
      res.status(400).json({ error: error.message });
    }
  }

  static async deleteTemporary(req: Request, res: Response) {
    try {
      await PhotoController.runWithTenant(req, () => PhotoService.deleteTemporaryPhoto(Number(req.params.id)));
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static serveFile(req: Request, res: Response) {
    try {
      const filename = path.basename(req.params.filename);
      const filePath = path.join(UPLOADS_ROOT, filename);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Fichier non trouve' });
      }

      res.sendFile(filePath);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}