import { Router, Response } from 'express';
import { body } from 'express-validator';
import { Op } from 'sequelize';
import { OrgResource, Organization, FeedRecommendation } from '../models';
import { authenticate, AuthRequest } from '../middleware/auth';
import { handleValidationErrors } from '../middleware/validate';
import { RESOURCE_CATEGORIES, STANDARD_RESOURCES } from '../config/resources';

const router = Router();

// Get the standard resources catalog
router.get('/catalog', (_req, res: Response) => {
  res.json({ categories: RESOURCE_CATEGORIES, all: STANDARD_RESOURCES });
});

// Get resources for an org
router.get('/org/:orgId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const resources = await OrgResource.findAll({
      where: { orgId: Number(req.params.orgId) },
      order: [['direction', 'ASC'], ['resource', 'ASC']],
    });
    res.json(resources);
  } catch (error) {
    console.error('Get resources error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Set resources for my org (replaces all for given direction)
router.put(
  '/',
  authenticate,
  [
    body('direction').isIn(['offer', 'need']).withMessage('Direction must be offer or need'),
    body('resources').isArray().withMessage('Resources must be an array'),
    body('resources.*').custom((value) => {
      if (typeof value === 'string' && value.trim().length > 0) return true;
      if (value && typeof value === 'object' && typeof value.resource === 'string' && value.resource.trim().length > 0) {
        return true;
      }
      throw new Error('Resource name is required');
    }),
    handleValidationErrors,
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const org = await Organization.findOne({ where: { ownerId: req.userId } });
      if (!org) {
        res.status(400).json({ message: 'You must create an organization first' });
        return;
      }

      const { direction, resources } = req.body as {
        direction: 'offer' | 'need';
        resources: Array<{ resource: string } | string>;
      };

      const normalizedResources = resources
        .map((r) => typeof r === 'string' ? r.trim() : r.resource.trim())
        .filter((r) => r.length > 0)
        .map((r) => {
          // Normalize to canonical casing from STANDARD_RESOURCES if possible
          const canonical = STANDARD_RESOURCES.find(s => s.toLowerCase() === r.toLowerCase());
          return canonical ?? r;
        });

      // Remove existing resources for this direction
      await OrgResource.destroy({ where: { orgId: org.id, direction } });

      // Create new ones
      if (normalizedResources.length > 0) {
        await OrgResource.bulkCreate(
          normalizedResources.map((resource) => ({
            orgId: org.id,
            resource,
            direction,
            isCustom: !STANDARD_RESOURCES.some(s => s.toLowerCase() === resource.toLowerCase()),
          }))
        );
      }

      // Invalidate recommendation cache for this org (as requester) AND for all orgs
      // that have this org as a candidate — resource changes affect both directions.
      await FeedRecommendation.destroy({
        where: {
          [Op.or]: [
            { orgId: org.id },
            { recommendedOrgId: org.id },
          ],
        },
      });

      const updated = await OrgResource.findAll({
        where: { orgId: org.id, direction },
        order: [['resource', 'ASC']],
      });

      res.json(updated);
    } catch (error) {
      console.error('Set resources error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
);

export default router;
