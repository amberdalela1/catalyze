import { Router, Response } from 'express';
import { body } from 'express-validator';
import { Op, col, fn, where as sequelizeWhere } from 'sequelize';
import { Organization, User, Media, OrgResource, FeedRecommendation, Post } from '../models';
import { authenticate, AuthRequest } from '../middleware/auth';
import { handleValidationErrors } from '../middleware/validate';

const router = Router();

/** Look up lat/lng from city + state using OpenStreetMap Nominatim (free, no key). */
async function geocode(city?: string, state?: string): Promise<{ latitude: number; longitude: number } | null> {
  if (!city && !state) return null;
  const q = [city, state, 'United States'].filter(Boolean).join(', ');
  try {
    const url = `https://nominatim.openstreetmap.org/search?` +
      `q=${encodeURIComponent(q)}&format=json&limit=1`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'CatalyzePro/1.0 (non-profit-connector)' },
    });
    const data = await resp.json() as Array<{ lat: string; lon: string }>;
    if (data.length > 0) {
      return { latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) };
    }
  } catch (err) {
    console.warn('Geocoding failed:', (err as Error).message);
  }
  return null;
}

// Get my organization
router.get('/mine', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const org = await Organization.findOne({
      where: { ownerId: req.userId },
      include: [
        { model: Media, as: 'media', where: { postId: null }, required: false, attributes: ['id', 'url', 'type', 'caption', 'displayOrder'] },
        { model: OrgResource, as: 'resources', required: false, attributes: ['id', 'resource', 'direction', 'isCustom'] },
      ],
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

      const orgData = { ...req.body, ownerId: req.userId };

      // Auto-geocode if city/state provided but no coordinates
      if ((orgData.city || orgData.state) && !orgData.latitude) {
        const coords = await geocode(orgData.city, orgData.state);
        if (coords) {
          orgData.latitude = coords.latitude;
          orgData.longitude = coords.longitude;
        }
      }

      const org = await Organization.create(orgData);

      // Auto-create a system 'joined' post for the feed
      await Post.create({
        orgId: org.id,
        authorId: req.userId!,
        title: `${org.name} joined Catalyze`,
        content: org.mission || '',
        type: 'joined',
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
      const loweredQuery = q.trim().toLowerCase();
      if (loweredQuery.length > 0) {
        where[Op.or as unknown as string] = [
          sequelizeWhere(fn('LOWER', col('name')), { [Op.like]: `%${loweredQuery}%` }),
          sequelizeWhere(fn('LOWER', col('mission')), { [Op.like]: `%${loweredQuery}%` }),
          sequelizeWhere(fn('LOWER', col('description')), { [Op.like]: `%${loweredQuery}%` }),
          sequelizeWhere(fn('LOWER', col('category')), { [Op.like]: `%${loweredQuery}%` }),
          sequelizeWhere(fn('LOWER', col('city')), { [Op.like]: `%${loweredQuery}%` }),
          sequelizeWhere(fn('LOWER', col('state')), { [Op.like]: `%${loweredQuery}%` }),
        ];
      }
    }

    if (category && typeof category === 'string') {
      if (category === 'Other') {
        const standardCategories = [
          'Education', 'Health', 'Environment', 'Community', 'Arts & Culture',
          'Youth', 'Housing', 'Food Security', 'Animal Welfare',
        ];
        where[Op.and as unknown as string] = [
          sequelizeWhere(fn('LOWER', col('category')), {
            [Op.notIn]: standardCategories.map((value) => value.toLowerCase()),
          }),
        ];
      } else {
        where[Op.and as unknown as string] = [
          sequelizeWhere(fn('LOWER', col('category')), category.toLowerCase()),
        ];
      }
    }

    const orgs = await Organization.findAll({
      where,
      attributes: ['id', 'name', 'category', 'city', 'state', 'logoUrl', 'mission', 'latitude', 'longitude'],
      limit: 50,
      order: [['name', 'ASC']],
    });

    const viewerOrg = await Organization.findOne({
      where: { ownerId: req.userId },
      attributes: ['id'],
    });

    const results = orgs.map((org) => ({ ...org.toJSON(), matchReason: null as string | null }));

    if (viewerOrg && orgs.length > 0) {
      const orgIdsToLoad = [viewerOrg.id, ...orgs.map((o) => o.id)];
      const resources = await OrgResource.findAll({
        where: { orgId: { [Op.in]: orgIdsToLoad } },
        attributes: ['orgId', 'resource', 'direction'],
      });

      const offeredByOrg = new Map<number, string[]>();
      const neededByOrg = new Map<number, string[]>();

      for (const row of resources) {
        const key = row.orgId;
        if (row.direction === 'offer') {
          const list = offeredByOrg.get(key) ?? [];
          list.push(row.resource);
          offeredByOrg.set(key, list);
        } else if (row.direction === 'need') {
          const list = neededByOrg.get(key) ?? [];
          list.push(row.resource);
          neededByOrg.set(key, list);
        }
      }

      const myOffer = offeredByOrg.get(viewerOrg.id) ?? [];
      const myNeed = neededByOrg.get(viewerOrg.id) ?? [];
      const myNeedSet = new Set(myNeed.map((r) => r.toLowerCase()));

      for (const org of results) {
        const theirOffer = offeredByOrg.get(org.id) ?? [];
        const theirNeed = neededByOrg.get(org.id) ?? [];
        const theirNeedSet = new Set(theirNeed.map((r) => r.toLowerCase()));

        const theyOfferINeed = theirOffer.filter((r) => myNeedSet.has(r.toLowerCase()));
        const iOfferTheyNeed = myOffer.filter((r) => theirNeedSet.has(r.toLowerCase()));

        const reasonParts: string[] = [];
        if (theyOfferINeed.length > 0) {
          reasonParts.push(`They offer ${theyOfferINeed.slice(0, 3).join(', ')} that you need`);
        }
        if (iOfferTheyNeed.length > 0) {
          reasonParts.push(`You can offer them ${iOfferTheyNeed.slice(0, 3).join(', ')}`);
        }

        org.matchReason = reasonParts.length > 0 ? reasonParts.join(' · ') : null;
      }
    }

    if (lat && lng) {
      const userLat = parseFloat(lat as string);
      const userLng = parseFloat(lng as string);
      if (!isNaN(userLat) && !isNaN(userLng)) {
        const sorted = results.sort((a, b) => {
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

    res.json(results);
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
      include: [
        { model: User, as: 'owner', attributes: ['id', 'name', 'avatarUrl'] },
        { model: Media, as: 'media', where: { postId: null }, required: false, attributes: ['id', 'url', 'type', 'caption', 'displayOrder'] },
        { model: OrgResource, as: 'resources', required: false, attributes: ['id', 'resource', 'direction', 'isCustom'] },
      ],
    });

    if (!org) {
      res.status(404).json({ message: 'Organization not found' });
      return;
    }

    // Check partnership status
    const { Partnership, Favorite } = await import('../models');
    const viewerOrg = await Organization.findOne({ where: { ownerId: req.userId } });

    const isOwner = viewerOrg ? viewerOrg.id === org.id : false;
    let partnershipStatus: 'none' | 'pending' | 'accepted' = 'none';
    let partnershipId: number | null = null;
    if (viewerOrg && !isOwner) {
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

    // Check favorite status
    const favorite = await Favorite.findOne({ where: { userId: req.userId, orgId } });
    const isFavorited = !!favorite;

    res.json({ ...org.toJSON(), isOwner, isFavorited, partnershipStatus, partnershipId });
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

    if (org.ownerId !== req.userId && req.userRole !== 'admin') {
      res.status(403).json({ message: 'Not authorized' });
      return;
    }

    // Auto-geocode if city/state changed OR coordinates are missing
    const cityChanged = req.body.city && req.body.city !== org.city;
    const stateChanged = req.body.state && req.body.state !== org.state;
    const missingCoords = !org.latitude || !org.longitude;
    const effectiveCity = req.body.city || org.city;
    const effectiveState = req.body.state || org.state;
    if ((cityChanged || stateChanged || missingCoords) && (effectiveCity || effectiveState)) {
      const coords = await geocode(effectiveCity, effectiveState);
      if (coords) {
        req.body.latitude = coords.latitude;
        req.body.longitude = coords.longitude;
      }
    }

    await org.update(req.body);

    // Invalidate recommendation cache for this org AND for any org that had this org
    // as a candidate — size/location/category changes affect both directions.
    await FeedRecommendation.destroy({
      where: {
        [Op.or]: [
          { orgId: org.id },
          { recommendedOrgId: org.id },
        ],
      },
    });

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

    if (org.ownerId !== req.userId && req.userRole !== 'admin') {
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
