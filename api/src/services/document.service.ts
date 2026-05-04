import { prisma } from '../config/prisma.js';
import { TenantContext } from '../config/tenant-context.js';

const DOCUMENT_INCLUDE = {
  createdBy: { select: { id: true, firstname: true, lastname: true } },
  project:   { select: { id: true, code: true, title: true } },
  lot:       { select: { id: true, lot_number: true, name: true } },
  supersedes: { select: { id: true, name: true, reference: true } },
  supersededBy: { select: { id: true, name: true, reference: true } },
  documentVersions: {
    orderBy: { version: 'desc' as const },
    take: 5,
    select: {
      id: true, version: true, file_url: true, file_name: true,
      file_size: true, file_type: true, revision: true,
      is_current: true, status: true, comment: true, created_at: true,
      createdBy: { select: { id: true, firstname: true, lastname: true } },
    },
  },
} as const;

export class DocumentService {

  // ─── LIST ────────────────────────────────────────────────────────────────
  static async listDocuments(filters: {
    project_id?: number;
    lot_id?: number;
    category?: string;
    discipline?: string;
    phase?: string;
    status?: string;
    approval_status?: string;
    security_clearance_level?: string;
    is_archived?: boolean;
  }) {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error('Tenant session required');

    return prisma.document.findMany({
      where: { ...filters, tenant_id: tenantId },
      include: DOCUMENT_INCLUDE,
      orderBy: { updated_at: 'desc' },
    });
  }

  // ─── GET BY ID ───────────────────────────────────────────────────────────
  static async getDocumentById(id: number) {
    return prisma.document.findUnique({
      where: { id },
      include: {
        ...DOCUMENT_INCLUDE,
        documentVersions: {
          orderBy: { version: 'desc' as const },
          include: {
            createdBy: { select: { id: true, firstname: true, lastname: true } },
          },
        },
      },
    });
  }

  // ─── CREATE ──────────────────────────────────────────────────────────────
  static async createDocument(data: {
    project_id: number;
    lot_id?: number;
    category: string;
    name: string;
    description?: string;
    reference?: string;
    discipline?: string;
    phase?: string;
    status?: string;
    revision?: string;
    file_url?: string;
    file_name?: string;
    file_size?: number;
    file_type?: string;
    confidentiality?: string;
    approval_status?: string;
    security_clearance_level?: string;
    supersedes_document_id?: number;
    document_change_log?: string;
    expiry_date?: Date;
    tags?: string;
    created_by: number;
  }) {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error('Tenant session required');

    const doc = await prisma.document.create({
      data: { ...data, tenant_id: tenantId },
      include: DOCUMENT_INCLUDE,
    });

    // Créer la version initiale v1 si un fichier est fourni
    if (data.file_url) {
      await prisma.documentVersion.create({
        data: {
          document_id: doc.id,
          tenant_id:   tenantId,
          version:     1,
          file_url:    data.file_url,
          file_name:   data.file_name,
          file_size:   data.file_size,
          file_type:   data.file_type,
          revision:    data.revision ?? 'A',
          is_current:  true,
          status:      data.status ?? 'DRAFT',
          created_by:  data.created_by,
        },
      });
    }

    return prisma.document.findUnique({ where: { id: doc.id }, include: DOCUMENT_INCLUDE });
  }

  // ─── UPDATE ──────────────────────────────────────────────────────────────
  static async updateDocument(id: number, data: Record<string, any>) {
    if (data.expiry_date) data.expiry_date = new Date(data.expiry_date);
    return prisma.document.update({
      where: { id },
      data,
      include: DOCUMENT_INCLUDE,
    });
  }

  // ─── DELETE ──────────────────────────────────────────────────────────────
  static async deleteDocument(id: number) {
    return prisma.document.delete({ where: { id } });
  }

  // ─── ARCHIVE / UNARCHIVE ─────────────────────────────────────────────────
  static async toggleArchive(id: number, archived: boolean) {
    return prisma.document.update({
      where: { id },
      data:  { is_archived: archived },
      include: DOCUMENT_INCLUDE,
    });
  }

  // ─── ADD VERSION ─────────────────────────────────────────────────────────
  static async addVersion(data: {
    document_id: number;
    file_url: string;
    file_name?: string;
    file_size?: number;
    file_type?: string;
    revision?: string;
    status?: string;
    comment?: string;
    created_by: number;
  }) {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error('Tenant session required');

    // Récupérer le dernier numéro de version
    const lastVersion = await prisma.documentVersion.findFirst({
      where:   { document_id: data.document_id },
      orderBy: { version: 'desc' },
      select:  { version: true },
    });
    const nextVersion = (lastVersion?.version ?? 0) + 1;

    // Désactiver les anciennes versions courantes
    await prisma.documentVersion.updateMany({
      where: { document_id: data.document_id, is_current: true },
      data:  { is_current: false },
    });

    // Créer la nouvelle version
    const version = await prisma.documentVersion.create({
      data: {
        ...data,
        tenant_id:  tenantId,
        version:    nextVersion,
        is_current: true,
        status:     data.status ?? 'DRAFT',
      },
    });

    // Mettre à jour le document parent (file_url courant + revision)
    await prisma.document.update({
      where: { id: data.document_id },
      data:  {
        file_url:  data.file_url,
        file_name: data.file_name,
        file_size: data.file_size,
        file_type: data.file_type,
        revision:  data.revision ?? undefined,
      },
    });

    return version;
  }

  // ─── LIST VERSIONS ───────────────────────────────────────────────────────
  static async getVersions(document_id: number) {
    return prisma.documentVersion.findMany({
      where:   { document_id },
      orderBy: { version: 'desc' },
      include: {
        createdBy: { select: { id: true, firstname: true, lastname: true } },
      },
    });
  }
}
