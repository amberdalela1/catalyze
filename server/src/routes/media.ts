import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { Media, Organization } from '../models';
import { authenticate, AuthRequest } from '../middleware/auth';
import { isS3Configured, uploadToS3, deleteFromS3 } from '../services/storage';

const useS3 = isS3Configured();
const UPLOADS_DIR = path.join(__dirname, '../../uploads');

// Ensure uploads directory exists (for local fallback)
if (!useS3 && !fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Use memory storage when S3 is configured, disk storage otherwise
const storage = useS3
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
      filename: (_req, file, cb) => {
        const uniqueId = crypto.randomBytes(12).toString('hex');
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `${uniqueId}${ext}`);
      },
    });

const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'video/mp4', 'video/quicktime', 'video/webm',
];

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and videos are allowed.'));
    }
  },
});

const router = Router();

// Upload media files (up to 10)
router.post(
  '/upload',
  authenticate,
  upload.array('files', 10),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const files = req.files as Express.Multer.File[];
      const { orgId, postId } = req.body;

      // Parse URLs from body (sent as JSON string or repeated field)
      let urls: string[] = [];
      if (req.body.urls) {
        try { urls = JSON.parse(req.body.urls); } catch { urls = []; }
        // Validate each URL
        urls = urls.filter((u: string) => {
          try {
            const parsed = new URL(u);
            return parsed.protocol === 'http:' || parsed.protocol === 'https:';
          } catch { return false; }
        });
      }

      if ((!files || files.length === 0) && urls.length === 0) {
        res.status(400).json({ message: 'No files or URLs provided' });
        return;
      }

      // Verify ownership
      if (orgId) {
        const org = await Organization.findByPk(Number(orgId));
        if (!org || (org.ownerId !== req.userId && req.userRole !== 'admin')) {
          res.status(403).json({ message: 'Not authorized' });
          return;
        }
      }

      const mediaRecords: any[] = [];
      let orderIndex = 0;

      // Process uploaded files
      if (files && files.length > 0) {
        const fileRecords = await Promise.all(
          files.map(async (file) => {
            let url: string;
            if (useS3) {
              url = await uploadToS3(file.buffer, file.originalname, file.mimetype);
            } else {
              url = `/uploads/${file.filename}`;
            }
            return Media.create({
              orgId: orgId ? Number(orgId) : null,
              postId: postId ? Number(postId) : null,
              url,
              type: file.mimetype.startsWith('video/') ? 'video' : 'image',
              displayOrder: orderIndex++,
            });
          })
        );
        mediaRecords.push(...fileRecords);
      }

      // Process URLs
      if (urls.length > 0) {
        const urlRecords = await Promise.all(
          urls.map(async (externalUrl: string) => {
            const isVid = /\.(mp4|mov|webm)(\?|$)/i.test(externalUrl);
            return Media.create({
              orgId: orgId ? Number(orgId) : null,
              postId: postId ? Number(postId) : null,
              url: externalUrl,
              type: isVid ? 'video' : 'image',
              displayOrder: orderIndex++,
            });
          })
        );
        mediaRecords.push(...urlRecords);
      }

      res.status(201).json(mediaRecords);
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ message: 'Upload failed' });
    }
  }
);

// Get media for an org (brand media only, not post media)
router.get('/org/:orgId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const media = await Media.findAll({
      where: { orgId: Number(req.params.orgId), postId: null },
      order: [['displayOrder', 'ASC']],
    });
    res.json(media);
  } catch (error) {
    console.error('Get org media error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete a media item
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const media = await Media.findByPk(Number(req.params.id));
    if (!media) {
      res.status(404).json({ message: 'Media not found' });
      return;
    }

    // Verify ownership via org
    if (media.orgId) {
      const org = await Organization.findByPk(media.orgId);
      if (!org || org.ownerId !== req.userId) {
        res.status(403).json({ message: 'Not authorized' });
        return;
      }
    }

    // Delete file from storage
    if (useS3 && media.url.startsWith('http')) {
      try {
        await deleteFromS3(media.url);
      } catch (err) {
        console.warn('S3 delete failed (continuing):', err);
      }
    } else {
      const filePath = path.join(UPLOADS_DIR, path.basename(media.url));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await media.destroy();
    res.json({ message: 'Media deleted' });
  } catch (error) {
    console.error('Delete media error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
