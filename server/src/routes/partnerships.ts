import { Router, Response } from 'express';
import { Op } from 'sequelize';
import { body } from 'express-validator';
import { Partnership, Organization } from '../models';
import { authenticate, AuthRequest } from '../middleware/auth';
import { handleValidationErrors } from '../middleware/validate';

const router = Router();

// Get partnerships for the authenticated user's organization
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const org = await Organization.findOne({ where: { ownerId: req.userId } });
    if (!org) {
      res.json([]);
      return;
    }

    const partnerships = await Partnership.findAll({
      where: {
        [Op.or]: [{ requesterId: org.id }, { targetId: org.id }],
      },
      include: [
        { model: Organization, as: 'requester', attributes: ['id', 'name', 'category', 'logoUrl'] },
        { model: Organization, as: 'target', attributes: ['id', 'name', 'category', 'logoUrl'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    // Transform to show the "other" organization and direction
    const result = partnerships.map((p) => {
      const isRequester = p.requesterId === org.id;
      const otherOrg = isRequester
        ? (p as Partnership & { target: Organization }).target
        : (p as Partnership & { requester: Organization }).requester;

      return {
        id: p.id,
        status: p.status,
        message: p.message,
        createdAt: p.createdAt,
        direction: isRequester ? 'outgoing' : 'incoming',
        organization: otherOrg,
      };
    });

    res.json(result);
  } catch (error) {
    console.error('Get partnerships error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Send partnership request
router.post(
  '/',
  authenticate,
  [
    body('targetId').isInt({ min: 1 }).withMessage('Target organization ID required'),
    handleValidationErrors,
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const org = await Organization.findOne({ where: { ownerId: req.userId } });
      if (!org) {
        res.status(400).json({ message: 'You must create an organization first' });
        return;
      }

      const targetId = Number(req.body.targetId);

      if (org.id === targetId) {
        res.status(400).json({ message: 'Cannot partner with yourself' });
        return;
      }

      const targetOrg = await Organization.findByPk(targetId);
      if (!targetOrg) {
        res.status(404).json({ message: 'Target organization not found' });
        return;
      }

      // Check for existing partnership
      const existing = await Partnership.findOne({
        where: {
          [Op.or]: [
            { requesterId: org.id, targetId },
            { requesterId: targetId, targetId: org.id },
          ],
        },
      });

      if (existing) {
        res.status(409).json({ message: 'Partnership already exists', status: existing.status });
        return;
      }

      const partnership = await Partnership.create({
        requesterId: org.id,
        targetId,
        message: req.body.message || null,
      });

      // DEV: Auto-accept partnership requests after 30 seconds
      const AUTO_ACCEPT_DELAY_MS = 30_000;
      const DEV_AUTO_ACCEPT = process.env.NODE_ENV !== 'production';
      if (DEV_AUTO_ACCEPT) {
        setTimeout(async () => {
          try {
            const p = await Partnership.findByPk(partnership.id);
            if (p && p.status === 'pending') {
              await p.update({ status: 'accepted' });
              console.log(`[DEV] Auto-accepted partnership #${p.id}`);
            }
          } catch (err) {
            console.error('[DEV] Auto-accept failed:', err);
          }
        }, AUTO_ACCEPT_DELAY_MS);
      }

      res.status(201).json(partnership);
    } catch (error) {
      console.error('Create partnership error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
);

// Accept or decline partnership
router.put(
  '/:id',
  authenticate,
  [
    body('status').isIn(['accepted', 'declined']).withMessage('Status must be accepted or declined'),
    handleValidationErrors,
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const partnership = await Partnership.findByPk(Number(req.params.id));
      if (!partnership) {
        res.status(404).json({ message: 'Partnership not found' });
        return;
      }

      // Only the target org can accept/decline
      const org = await Organization.findOne({ where: { ownerId: req.userId } });
      if (!org || org.id !== partnership.targetId) {
        res.status(403).json({ message: 'Not authorized' });
        return;
      }

      if (partnership.status !== 'pending') {
        res.status(400).json({ message: 'Partnership already processed' });
        return;
      }

      await partnership.update({ status: req.body.status });
      res.json(partnership);
    } catch (error) {
      console.error('Update partnership error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
);

// Withdraw (delete) a partnership request
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const partnership = await Partnership.findByPk(Number(req.params.id));
    if (!partnership) {
      res.status(404).json({ message: 'Partnership not found' });
      return;
    }

    // Only the requester can withdraw, and only while pending
    const org = await Organization.findOne({ where: { ownerId: req.userId } });
    if (!org || org.id !== partnership.requesterId) {
      res.status(403).json({ message: 'Not authorized' });
      return;
    }

    if (partnership.status !== 'pending') {
      res.status(400).json({ message: 'Can only withdraw pending requests' });
      return;
    }

    await partnership.destroy();
    res.json({ message: 'Partnership request withdrawn' });
  } catch (error) {
    console.error('Withdraw partnership error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
