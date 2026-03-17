import { Router, Response } from 'express';
import { Op } from 'sequelize';
import { Organization } from '../models';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Search organizations
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
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

    // If lat/lng provided, sort by approximate distance
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

export default router;
