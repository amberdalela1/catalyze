import { Router, Response } from 'express';
import { body } from 'express-validator';
import { OrgResource, Organization } from '../models';
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
    body('resources.*.resource').trim().notEmpty().withMessage('Resource name is required'),
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
        resources: { resource: string }[];
      };

      // Remove existing resources for this direction
      await OrgResource.destroy({ where: { orgId: org.id, direction } });

      // Create new ones
      if (resources.length > 0) {
        await OrgResource.bulkCreate(
          resources.map((r) => ({
            orgId: org.id,
            resource: r.resource.trim(),
            direction,
            isCustom: !STANDARD_RESOURCES.includes(r.resource.trim()),
          }))
        );
      }

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
