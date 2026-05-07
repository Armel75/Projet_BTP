import fs from 'fs';
import path from 'path';
import { prisma } from '../config/prisma.js';
import { TenantContext } from '../config/tenant-context.js';
import { UPLOADS_ROOT } from '../middlewares/upload.middleware.js';

let lastOrphanCleanupAt = 0;

function safeUnlink(fileUrl: string | null | undefined) {
  if (!fileUrl) return;

  const filename = path.basename(fileUrl);
  const filePath = path.join(UPLOADS_ROOT, filename);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

export class PhotoService {
  static async cleanupOrphanPhotos(options?: { olderThanHours?: number; maxRows?: number }) {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error('Tenant session required');

    const olderThanHours = options?.olderThanHours ?? 24;
    const maxRows = options?.maxRows ?? 50;
    const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);

    const orphanPhotos = await prisma.photo.findMany({
      where: {
        tenant_id: tenantId,
        daily_log_id: null,
        created_at: { lt: cutoff },
      },
      orderBy: { created_at: 'asc' },
      take: maxRows,
    });

    if (orphanPhotos.length === 0) return { deleted: 0 };

    for (const photo of orphanPhotos) {
      safeUnlink(photo.file_url);
    }

    await prisma.photo.deleteMany({
      where: {
        id: { in: orphanPhotos.map((photo: any) => photo.id) },
        tenant_id: tenantId,
        daily_log_id: null,
      },
    });

    return { deleted: orphanPhotos.length };
  }

  static async cleanupOrphansIfDue() {
    const now = Date.now();
    if (now - lastOrphanCleanupAt < 10 * 60 * 1000) {
      return;
    }

    lastOrphanCleanupAt = now;
    await this.cleanupOrphanPhotos().catch(() => undefined);
  }

  static async uploadTemporaryPhotos(params: {
    project_id: number;
    files: Express.Multer.File[];
    created_by: number;
  }) {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error('Tenant session required');
    if (!params.project_id) throw new Error('project_id requis pour l\'upload de photos.');
    if (!Array.isArray(params.files) || params.files.length === 0) {
      throw new Error('Aucune photo recue.');
    }

    await this.cleanupOrphansIfDue();

    const createdPhotos = await Promise.all(
      params.files.map((file) =>
        prisma.photo.create({
          data: {
            tenant_id: tenantId,
            project_id: params.project_id,
            file_url: `/api/v1/photos/files/${file.filename}`,
            caption: file.originalname,
            tagged_entities: JSON.stringify({
              source: 'daily-log',
              status: 'temporary',
              uploaded_by: params.created_by,
            }),
          },
        })
      )
    );

    return createdPhotos.map((photo, index) => ({
      id: photo.id,
      url: photo.file_url,
      filename: params.files[index].originalname,
      size: params.files[index].size,
      taken_at: photo.taken_at,
    }));
  }

  static async deleteTemporaryPhoto(id: number) {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error('Tenant session required');

    const photo = await prisma.photo.findFirst({
      where: {
        id,
        tenant_id: tenantId,
      },
    });

    if (!photo) {
      throw new Error('Photo introuvable.');
    }

    if (photo.daily_log_id) {
      throw new Error('Cette photo est deja rattachee a un journal et ne peut pas etre supprimee ici.');
    }

    safeUnlink(photo.file_url);
    await prisma.photo.delete({ where: { id: photo.id } });
  }

  static async resolvePhotoUrls(photoIds: number[]) {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error('Tenant session required');
    if (photoIds.length === 0) return [];

    const photos = await prisma.photo.findMany({
      where: {
        id: { in: photoIds },
        tenant_id: tenantId,
      },
      orderBy: { id: 'asc' },
    });

    if (photos.length !== new Set(photoIds).size) {
      throw new Error('Certaines photos selectionnees sont introuvables ou inaccessibles.');
    }

    const photoById = new Map<number, any>(photos.map((photo: any) => [photo.id, photo]));
    return photoIds.map((photoId) => {
      const photo = photoById.get(photoId) as { file_url: string } | undefined;
      if (!photo) {
        throw new Error('Une photo selectionnee est introuvable.');
      }
      return photo.file_url;
    });
  }

  static async attachPhotosToDailyLog(photoIds: number[], dailyLogId: number, tx: any = prisma) {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId || photoIds.length === 0) return;

    const uniquePhotoIds = Array.from(new Set(photoIds));
    await tx.photo.updateMany({
      where: {
        id: { in: uniquePhotoIds },
        tenant_id: tenantId,
      },
      data: {
        daily_log_id: dailyLogId,
      },
    });
  }

  static async syncDailyLogPhotos(photoIds: number[], dailyLogId: number, tx: any = prisma) {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error('Tenant session required');

    const uniquePhotoIds = Array.from(new Set(photoIds));

    await tx.photo.updateMany({
      where: {
        tenant_id: tenantId,
        daily_log_id: dailyLogId,
        id: { notIn: uniquePhotoIds.length > 0 ? uniquePhotoIds : [-1] },
      },
      data: {
        daily_log_id: null,
      },
    });

    if (uniquePhotoIds.length > 0) {
      await tx.photo.updateMany({
        where: {
          tenant_id: tenantId,
          id: { in: uniquePhotoIds },
        },
        data: {
          daily_log_id: dailyLogId,
        },
      });
    }
  }
}