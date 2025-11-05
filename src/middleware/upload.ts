import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Dossier de destination pour les uploads
const UPLOAD_DIR = path.join(__dirname, '../../uploads/projets');

// Créer le dossier s'il n'existe pas
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  console.log('📁 Dossier uploads créé:', UPLOAD_DIR);
}

/**
 * Configuration du stockage multer
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    // Générer un nom de fichier unique avec timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext);

    // Format: fieldname_basename_timestamp.ext
    const filename = `${file.fieldname}_${basename}_${uniqueSuffix}${ext}`;
    cb(null, filename);
  }
});

/**
 * Filtre pour accepter seulement certains types de fichiers
 */
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/jpg'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Type de fichier non autorisé: ${file.mimetype}`));
  }
};

/**
 * Configuration multer
 */
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB max par fichier
  }
});

/**
 * Middleware pour gérer les erreurs multer
 */
export const handleMulterError = (err: any, req: any, res: any, next: any) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'Le fichier est trop volumineux (max 10 Mo)'
      });
    }
    return res.status(400).json({
      error: `Erreur d'upload: ${err.message}`
    });
  } else if (err) {
    return res.status(400).json({
      error: err.message || 'Erreur lors de l\'upload des fichiers'
    });
  }
  next();
};
