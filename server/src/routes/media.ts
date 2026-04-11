import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { Media, Organization } from '../models';
import { authenticate, AuthRequest } from '../middleware/auth';

const UPLOADS_DIR = path.join(__dirname, '../../uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
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
      if (!files || files.length === 0) {
        res.status(400).json({ message: 'No files uploaded' });
        return;
      }

      const { orgId, postId } = req.body;

      // Verify ownership
      if (orgId) {
        const org = await Organization.findByPk(Number(orgId));
        if (!org || (org.ownerId !== req.userId && req.userRole !== 'admin')) {
          res.status(403).json({ message: 'Not authorized' });
          return;
        }
      }

      const mediaRecords = await Promise.all(
        files.map((file, index) =>
          Media.create({
            orgId: orgId ? Number(orgId) : null,
            postId: postId ? Number(postId) : null,
            url: `/uploads/${file.filename}`,
            type: file.mimetype.startsWith('video/') ? 'video' : 'image',
            displayOrder: index,
          })
        )
      );

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

    // Delete file from disk
    const filePath = path.join(UPLOADS_DIR, path.basename(media.url));
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await media.destroy();
    res.json({ message: 'Media deleted' });
  } catch (error) {
    console.error('Delete media error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
