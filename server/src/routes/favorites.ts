import { Router, Response } from 'express';
import { Favorite, Organization } from '../models';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Get user's favorites
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const favorites = await Favorite.findAll({
      where: { userId: req.userId },
      include: [{
        model: Organization,
        as: 'organization',
        attributes: ['id', 'name', 'category', 'city', 'state', 'logoUrl', 'mission'],
      }],
      order: [['createdAt', 'DESC']],
    });

    res.json(favorites);
  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Add a favorite
router.post('/:orgId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orgId = Number(req.params.orgId);

    const org = await Organization.findByPk(orgId);
    if (!org) {
      res.status(404).json({ message: 'Organization not found' });
      return;
    }

    const existing = await Favorite.findOne({
      where: { userId: req.userId, orgId },
    });
    if (existing) {
      res.status(409).json({ message: 'Already favorited' });
      return;
    }

    const favorite = await Favorite.create({ userId: req.userId, orgId });
    res.status(201).json(favorite);
  } catch (error) {
    console.error('Add favorite error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Remove a favorite
router.delete('/:orgId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orgId = Number(req.params.orgId);

    const deleted = await Favorite.destroy({
      where: { userId: req.userId, orgId },
    });

    if (!deleted) {
      res.status(404).json({ message: 'Favorite not found' });
      return;
    }

    res.json({ message: 'Removed from favorites' });
  } catch (error) {
    console.error('Remove favorite error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
