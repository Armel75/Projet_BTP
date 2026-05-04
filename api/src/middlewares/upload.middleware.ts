import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Request } from 'express';

// ── Dossier uploads à la RACINE du projet (hors api/ et web/)
// Ce fichier est à api/src/middlewares/ → 3 niveaux up = racine du projet
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const UPLOADS_ROOT = path.resolve(
  __dirname,
  '../../..',    // middlewares -> src -> api -> Projet_BTP (racine)
  'uploads',
  'documents',
);

// Créer le dossier s'il n'existe pas
if (!fs.existsSync(UPLOADS_ROOT)) {
  fs.mkdirSync(UPLOADS_ROOT, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_ROOT);
  },
  filename: (_req, file, cb) => {
    const ext  = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_\-]/g, '_')
      .substring(0, 80);
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `${base}-${unique}${ext}`);
  },
});

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  const ALLOWED_MIME = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'text/plain',
    'text/csv',
    'application/zip',
    'application/x-zip-compressed',
    // DWG / DXF (AutoCAD)
    'application/acad',
    'application/octet-stream',
  ];

  if (ALLOWED_MIME.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Type de fichier non autorisé : ${file.mimetype}`));
  }
};

export const uploadDocument = multer({
  storage,
  fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 Mo max
}).single('file');

export { UPLOADS_ROOT };
