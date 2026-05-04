import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { DocumentService } from '../services/document.service.js';
import { AuthRequest } from '../middlewares/auth.middleware.js';
import { UPLOADS_ROOT } from '../middlewares/upload.middleware.js';

// Déduire le type de fichier depuis le mimetype
function detectFileType(mimetype: string): string {
  if (mimetype === 'application/pdf')                        return 'pdf';
  if (mimetype.includes('word'))                            return 'docx';
  if (mimetype.includes('excel') || mimetype.includes('spreadsheet')) return 'xlsx';
  if (mimetype.includes('powerpoint') || mimetype.includes('presentation')) return 'pptx';
  if (mimetype.startsWith('image/'))                        return 'image';
  if (mimetype === 'text/plain')                            return 'txt';
  if (mimetype === 'text/csv')                              return 'csv';
  if (mimetype.includes('zip'))                             return 'zip';
  if (mimetype === 'application/acad' || mimetype === 'application/octet-stream') return 'dwg';
  return 'other';
}

export class DocumentController {

  // GET /documents
  static async list(req: Request, res: Response) {
    try {
      const filters: any = {};
      if (req.query.project_id)  filters.project_id  = Number(req.query.project_id);
      if (req.query.lot_id)      filters.lot_id      = Number(req.query.lot_id);
      if (req.query.category)    filters.category    = req.query.category as string;
      if (req.query.discipline)  filters.discipline  = req.query.discipline as string;
      if (req.query.phase)       filters.phase       = req.query.phase as string;
      if (req.query.status)      filters.status      = req.query.status as string;
      if (req.query.approval_status) filters.approval_status = req.query.approval_status as string;
      if (req.query.security_clearance_level) filters.security_clearance_level = req.query.security_clearance_level as string;
      if (req.query.is_archived !== undefined) {
        filters.is_archived = req.query.is_archived === 'true';
      } else {
        filters.is_archived = false; // Par défaut : non archivés
      }

      const docs = await DocumentService.listDocuments(filters);
      res.json(docs);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  // GET /documents/:id
  static async getById(req: Request, res: Response) {
    try {
      const doc = await DocumentService.getDocumentById(Number(req.params.id));
      if (!doc) return res.status(404).json({ error: 'Document not found' });
      res.json(doc);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  // POST /documents  (multipart/form-data avec fichier optionnel)
  static async create(req: Request, res: Response) {
    try {
      const user = (req as AuthRequest).user;
      const body = req.body;
      const file = (req as any).file as Express.Multer.File | undefined;

      let file_url:  string | undefined;
      let file_name: string | undefined;
      let file_size: number | undefined;
      let file_type: string | undefined;

      if (file) {
        // Fichier uploadé localement
        file_url  = `/api/v1/documents/files/${file.filename}`;
        file_name = file.originalname;
        file_size = file.size;
        file_type = detectFileType(file.mimetype);
      } else if (body.file_url) {
        // URL externe fournie
        file_url  = body.file_url;
        file_name = body.file_name;
        file_size = body.file_size ? Number(body.file_size) : undefined;
        file_type = body.file_type;
      }

      const doc = await DocumentService.createDocument({
        project_id:      Number(body.project_id),
        lot_id:          body.lot_id           ? Number(body.lot_id)  : undefined,
        category:        body.category         ?? 'PLAN',
        name:            body.name,
        description:     body.description,
        reference:       body.reference,
        discipline:      body.discipline       ?? 'GENERAL',
        phase:           body.phase            ?? 'EXE',
        status:          body.status           ?? 'DRAFT',
        approval_status: body.approval_status,
        revision:        body.revision         ?? 'A',
        confidentiality: body.confidentiality  ?? 'INTERNAL',
        security_clearance_level: body.security_clearance_level,
        supersedes_document_id: body.supersedes_document_id ? Number(body.supersedes_document_id) : undefined,
        document_change_log: body.document_change_log,
        expiry_date:     body.expiry_date      ? new Date(body.expiry_date) : undefined,
        tags:            body.tags,
        file_url,
        file_name,
        file_size,
        file_type,
        created_by:      user!.id,
      });

      res.status(201).json(doc);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  // PUT /documents/:id
  static async update(req: Request, res: Response) {
    try {
      const body = req.body;
      const data: Record<string, any> = { ...body };
      if (body.lot_id       !== undefined) data.lot_id      = body.lot_id      ? Number(body.lot_id)  : null;
      if (body.project_id   !== undefined) data.project_id  = body.project_id  ? Number(body.project_id) : null;
      if (body.supersedes_document_id !== undefined) data.supersedes_document_id = body.supersedes_document_id ? Number(body.supersedes_document_id) : null;
      if (body.expiry_date)                data.expiry_date = new Date(body.expiry_date);

      const doc = await DocumentService.updateDocument(Number(req.params.id), data);
      res.json(doc);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  // DELETE /documents/:id
  static async delete(req: Request, res: Response) {
    try {
      await DocumentService.deleteDocument(Number(req.params.id));
      res.status(204).send();
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  // PATCH /documents/:id/archive
  static async archive(req: Request, res: Response) {
    try {
      const { archived } = req.body;
      const doc = await DocumentService.toggleArchive(Number(req.params.id), Boolean(archived));
      res.json(doc);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  // GET /documents/:id/versions
  static async getVersions(req: Request, res: Response) {
    try {
      const versions = await DocumentService.getVersions(Number(req.params.id));
      res.json(versions);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  // POST /documents/:id/versions  (upload nouvelle version)
  static async addVersion(req: Request, res: Response) {
    try {
      const user = (req as AuthRequest).user;
      const body = req.body;
      const file = (req as any).file as Express.Multer.File | undefined;

      let file_url:  string;
      let file_name: string | undefined;
      let file_size: number | undefined;
      let file_type: string | undefined;

      if (file) {
        file_url  = `/api/v1/documents/files/${file.filename}`;
        file_name = file.originalname;
        file_size = file.size;
        file_type = detectFileType(file.mimetype);
      } else if (body.file_url) {
        file_url  = body.file_url;
        file_name = body.file_name;
        file_size = body.file_size ? Number(body.file_size) : undefined;
        file_type = body.file_type;
      } else {
        return res.status(400).json({ error: 'Un fichier ou une URL est requis' });
      }

      const version = await DocumentService.addVersion({
        document_id: Number(req.params.id),
        file_url,
        file_name,
        file_size,
        file_type,
        revision:    body.revision,
        status:      body.status,
        comment:     body.comment,
        created_by:  user!.id,
      });

      res.status(201).json(version);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  // GET /documents/files/:filename  (servir les fichiers locaux avec auth)
  static serveFile(req: Request, res: Response) {
    try {
      const filename = path.basename(req.params.filename); // Sécurité : pas de path traversal
      const filePath = path.join(UPLOADS_ROOT, filename);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Fichier non trouvé' });
      }

      res.sendFile(filePath);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
}
