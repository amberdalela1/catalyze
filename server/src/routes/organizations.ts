import { Router, Response } from 'express';
import { body } from 'express-validator';
import { Op } from 'sequelize';
import { Organization, User } from '../models';
import { authenticate, AuthRequest } from '../middleware/auth';
import { handleValidationErrors } from '../middleware/validate';

const router = Router();

// Get my organization
router.get('/mine', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const org = await Organization.findOne({
      where: { ownerId: req.userId },
    });

    if (!org) {
      res.status(404).json({ message: 'No organization found' });
      return;
    }

    res.json(org);
  } catch (error) {
    console.error('Get org error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create organization
router.post(
  '/',
  authenticate,
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('mission').trim().notEmpty().withMessage('Mission is required'),
    body('category').trim().notEmpty().withMessage('Category is required'),
    handleValidationErrors,
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const existing = await Organization.findOne({ where: { ownerId: req.userId } });
      if (existing) {
        res.status(409).json({ message: 'You already have an organization' });
        return;
      }

      const org = await Organization.create({
        ...req.body,
        ownerId: req.userId,
      });

      res.status(201).json(org);
    } catch (error) {
      console.error('Create org error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
);

// Search organizations
router.get('/search', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { q, category, lat, lng } = req.query;
    const where: Record<string, unknown> = {};

    if (q && typeof q === 'string') {
      where[Op.or as unknown as string] = [
        { name: { [Op.like]: `%${q}%` } },
        { mission: { [Op.like]: `%${q}%` } },
        { description: { [Op.like]: `%${q}%` } },
      ];
    }

    if (category && typeof category === 'string') {
      where.category = category;
    }

    const orgs = await Organization.findAll({
      where,
      attributes: ['id', 'name', 'category', 'city', 'state', 'logoUrl', 'mission', 'latitude', 'longitude'],
      limit: 50,
      order: [['name', 'ASC']],
    });

    if (lat && lng) {
      const userLat = parseFloat(lat as string);
      const userLng = parseFloat(lng as string);
      if (!isNaN(userLat) && !isNaN(userLng)) {
        const sorted = orgs.sort((a, b) => {
          if (!a.latitude || !a.longitude) return 1;
          if (!b.latitude || !b.longitude) return -1;
          const distA = Math.hypot(a.latitude - userLat, a.longitude - userLng);
          const distB = Math.hypot(b.latitude - userLat, b.longitude - userLng);
          return distA - distB;
        });
        res.json(sorted);
        return;
      }
    }

    res.json(orgs);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get organization by ID (with partnership status for the viewer)
router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orgId = Number(req.params.id);
    const org = await Organization.findByPk(orgId, {
      include: [{ model: User, as: 'owner', attributes: ['id', 'name', 'avatarUrl'] }],
    });

    if (!org) {
      res.status(404).json({ message: 'Organization not found' });
      return;
    }

    // Check partnership status
    const { Partnership } = await import('../models');
    const viewerOrg = await Organization.findOne({ where: { ownerId: req.userId } });

    let partnershipStatus: 'none' | 'pending' | 'accepted' = 'none';
    let partnershipId: number | null = null;
    if (viewerOrg && viewerOrg.id !== org.id) {
      const partnership = await Partnership.findOne({
        where: {
          [Op.or]: [
            { requesterId: viewerOrg.id, targetId: org.id },
            { requesterId: org.id, targetId: viewerOrg.id },
          ],
        },
      });
      if (partnership) {
        partnershipStatus = partnership.status === 'accepted' ? 'accepted' : 'pending';
        partnershipId = partnership.id;
      }
    }

    res.json({ ...org.toJSON(), partnershipStatus, partnershipId });
  } catch (error) {
    console.error('Get org error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update organization
router.put('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const org = await Organization.findByPk(Number(req.params.id));

    if (!org) {
      res.status(404).json({ message: 'Organization not found' });
      return;
    }

    if (org.ownerId !== req.userId) {
      res.status(403).json({ message: 'Not authorized' });
      return;
    }

    await org.update(req.body);
    res.json(org);
  } catch (error) {
    console.error('Update org error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete organization
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const org = await Organization.findByPk(Number(req.params.id));

    if (!org) {
      res.status(404).json({ message: 'Organization not found' });
      return;
    }

    if (org.ownerId !== req.userId) {
      res.status(403).json({ message: 'Not authorized' });
      return;
    }

    await org.destroy();
    res.json({ message: 'Organization deleted' });
  } catch (error) {
    console.error('Delete org error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
