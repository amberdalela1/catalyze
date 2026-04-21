import { Router, Response, NextFunction } from 'express';
import { body } from 'express-validator';
import { Op } from 'sequelize';
import { sequelize } from '../config/database';
import { Organization, Partnership, Message } from '../models';
import { authenticate, AuthRequest } from '../middleware/auth';
import { handleValidationErrors } from '../middleware/validate';

const router = Router();

// Messaging data should always be fresh in clients (web + mobile webviews).
router.use((_req, res: Response, next: NextFunction) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

const MAX_UNCONNECTED_MESSAGES = 3;

// Helper: check if two orgs are connected (accepted partnership)
async function areConnected(orgA: number, orgB: number): Promise<boolean> {
  const partnership = await Partnership.findOne({
    where: {
      status: 'accepted',
      [Op.or]: [
        { requesterId: orgA, targetId: orgB },
        { requesterId: orgB, targetId: orgA },
      ],
    },
  });
  return !!partnership;
}

// Get inbox — list of conversations grouped by the other org
router.get('/inbox', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const org = await Organization.findOne({ where: { ownerId: req.userId } });
    if (!org) {
      res.status(404).json({ message: 'Create an organization first' });
      return;
    }

    // Get all messages for this org
    const allMessages = await Message.findAll({
      where: {
        [Op.or]: [
          { senderOrgId: org.id },
          { receiverOrgId: org.id },
        ],
      },
      order: [['createdAt', 'DESC']],
      raw: true,
    }) as any[];

    // Group by conversation partner and get latest message per partner
    const conversationMap = new Map<number, any>();
    allMessages.forEach((msg: any) => {
      const otherOrgId = msg.senderOrgId === org.id ? msg.receiverOrgId : msg.senderOrgId;
      
      // Keep only the latest message per partner (already sorted DESC by createdAt)
      if (!conversationMap.has(otherOrgId)) {
        conversationMap.set(otherOrgId, { ...msg, otherOrgId });
      }
    });

    const conversations = Array.from(conversationMap.values());

    // Enrich with org details and connected status
    const otherOrgIds = conversations.map((c: any) => c.otherOrgId);
    const [orgs, partnerships] = await Promise.all([
      Organization.findAll({
        where: { id: otherOrgIds },
        attributes: ['id', 'name', 'category', 'logoUrl', 'city', 'state'],
      }),
      Partnership.findAll({
        where: {
          status: 'accepted',
          [Op.or]: otherOrgIds.map((otherId: number) => ({
            [Op.or]: [
              { requesterId: org.id, targetId: otherId },
              { requesterId: otherId, targetId: org.id },
            ],
          })),
        },
      }),
    ]);

    const orgMap = new Map(orgs.map(o => [o.id, o]));
    const connectedIds = new Set<number>();
    partnerships.forEach(p => {
      connectedIds.add(p.requesterId === org.id ? p.targetId : p.requesterId);
    });

    // Count unread messages per conversation
    const unreadCounts = await Message.findAll({
      where: {
        receiverOrgId: org.id,
        readAt: null,
      },
      attributes: [
        'senderOrgId',
        [sequelize.fn('COUNT', sequelize.col('id')), 'unreadCount'],
      ],
      group: ['senderOrgId'],
      raw: true,
    }) as any[];
    const unreadMap = new Map(unreadCounts.map((u: any) => [u.senderOrgId, Number(u.unreadCount)]));

    const result = conversations.map((c: any) => ({
      otherOrgId: c.otherOrgId,
      otherOrg: orgMap.get(c.otherOrgId),
      isConnected: connectedIds.has(c.otherOrgId),
      lastMessage: {
        id: c.id,
        content: c.content,
        senderOrgId: c.senderOrgId,
        createdAt: c.createdAt,
      },
      unreadCount: unreadMap.get(c.otherOrgId) || 0,
    }));

    res.json(result);
  } catch (error) {
    console.error('Get inbox error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Lightweight unread summary for badge/polling in app shell
router.get('/unread-summary', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const org = await Organization.findOne({ where: { ownerId: req.userId } });
    if (!org) {
      res.json({ unreadThreads: 0, unreadMessages: 0 });
      return;
    }

    const unreadCounts = await Message.findAll({
      where: {
        receiverOrgId: org.id,
        readAt: null,
      },
      attributes: [
        'senderOrgId',
        [sequelize.fn('COUNT', sequelize.col('id')), 'unreadCount'],
      ],
      group: ['senderOrgId'],
      raw: true,
    }) as any[];

    const unreadThreads = unreadCounts.length;
    const unreadMessages = unreadCounts.reduce((total: number, row: any) => total + Number(row.unreadCount), 0);

    res.json({ unreadThreads, unreadMessages });
  } catch (error) {
    console.error('Get unread summary error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get conversation with a specific org
router.get('/conversation/:orgId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const myOrg = await Organization.findOne({ where: { ownerId: req.userId } });
    if (!myOrg) {
      res.status(404).json({ message: 'Create an organization first' });
      return;
    }

    const otherOrgId = Number(req.params.orgId);
    const otherOrg = await Organization.findByPk(otherOrgId, {
      attributes: ['id', 'name', 'logoUrl', 'category'],
    });
    if (!otherOrg) {
      res.status(404).json({ message: 'Organization not found' });
      return;
    }

    const isConnected = await areConnected(myOrg.id, otherOrgId);

    const messages = await Message.findAll({
      where: {
        [Op.or]: [
          { senderOrgId: myOrg.id, receiverOrgId: otherOrgId },
          { senderOrgId: otherOrgId, receiverOrgId: myOrg.id },
        ],
      },
      order: [['createdAt', 'ASC']],
      limit: 200,
    });

    // Mark received messages as read
    await Message.update(
      { readAt: new Date() },
      {
        where: {
          senderOrgId: otherOrgId,
          receiverOrgId: myOrg.id,
          readAt: null,
        },
      }
    );

    // Count messages sent by my org to this non-connected org
    let sentCount = 0;
    if (!isConnected) {
      sentCount = await Message.count({
        where: { senderOrgId: myOrg.id, receiverOrgId: otherOrgId },
      });
    }

    res.json({
      otherOrg,
      isConnected,
      messages,
      sentCount,
      maxMessages: isConnected ? null : MAX_UNCONNECTED_MESSAGES,
    });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Send a message
router.post(
  '/',
  authenticate,
  [
    body('receiverOrgId').isInt({ min: 1 }).withMessage('Receiver org ID is required'),
    body('content').trim().notEmpty().withMessage('Message content is required')
      .isLength({ max: 2000 }).withMessage('Message too long'),
    handleValidationErrors,
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const myOrg = await Organization.findOne({ where: { ownerId: req.userId } });
      if (!myOrg) {
        res.status(404).json({ message: 'Create an organization first' });
        return;
      }

      if (!myOrg.canMessage) {
        res.status(403).json({ message: 'Your organization\'s messaging privileges have been suspended by an admin' });
        return;
      }

      const { receiverOrgId, content } = req.body;

      if (myOrg.id === receiverOrgId) {
        res.status(400).json({ message: 'Cannot message yourself' });
        return;
      }

      const receiverOrg = await Organization.findByPk(receiverOrgId);
      if (!receiverOrg) {
        res.status(404).json({ message: 'Receiver organization not found' });
        return;
      }

      // Check connection status and enforce limit
      const connected = await areConnected(myOrg.id, receiverOrgId);
      if (!connected) {
        const sentCount = await Message.count({
          where: { senderOrgId: myOrg.id, receiverOrgId },
        });
        if (sentCount >= MAX_UNCONNECTED_MESSAGES) {
          res.status(403).json({
            message: `Non-connected orgs can send at most ${MAX_UNCONNECTED_MESSAGES} messages. Connect first to continue messaging.`,
          });
          return;
        }
      }

      const message = await Message.create({
        senderOrgId: myOrg.id,
        receiverOrgId,
        content,
      });

      res.status(201).json(message);
    } catch (error) {
      console.error('Send message error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
);

// Batch check messaging status for multiple orgs
// Returns { [orgId]: { isConnected, sentCount, maxMessages, canMessage } }
router.post(
  '/status',
  authenticate,
  [
    body('orgIds').isArray({ min: 1, max: 100 }).withMessage('orgIds must be an array'),
    handleValidationErrors,
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const myOrg = await Organization.findOne({ where: { ownerId: req.userId } });
      if (!myOrg) {
        res.json({});
        return;
      }

      const orgIds: number[] = req.body.orgIds
        .map((id: unknown) => Number(id))
        .filter((id: number) => !isNaN(id) && id !== myOrg.id);

      if (orgIds.length === 0) {
        res.json({});
        return;
      }

      // Find all accepted partnerships with these orgs
      const partnerships = await Partnership.findAll({
        where: {
          status: 'accepted',
          [Op.or]: orgIds.map((otherId: number) => ({
            [Op.or]: [
              { requesterId: myOrg.id, targetId: otherId },
              { requesterId: otherId, targetId: myOrg.id },
            ],
          })),
        },
      });

      const connectedIds = new Set<number>();
      partnerships.forEach(p => {
        connectedIds.add(p.requesterId === myOrg.id ? p.targetId : p.requesterId);
      });

      // For non-connected orgs, count sent messages
      const nonConnectedIds = orgIds.filter(id => !connectedIds.has(id));
      const sentCounts = new Map<number, number>();

      if (nonConnectedIds.length > 0) {
        const counts = await Message.findAll({
          where: {
            senderOrgId: myOrg.id,
            receiverOrgId: nonConnectedIds,
          },
          attributes: [
            'receiverOrgId',
            [sequelize.fn('COUNT', sequelize.col('id')), 'cnt'],
          ],
          group: ['receiverOrgId'],
          raw: true,
        }) as any[];

        counts.forEach((row: any) => {
          sentCounts.set(row.receiverOrgId, Number(row.cnt));
        });
      }

      const result: Record<number, { isConnected: boolean; sentCount: number; maxMessages: number | null; canMessage: boolean }> = {};
      for (const orgId of orgIds) {
        const isConnected = connectedIds.has(orgId);
        const sentCount = isConnected ? 0 : (sentCounts.get(orgId) || 0);
        result[orgId] = {
          isConnected,
          sentCount,
          maxMessages: isConnected ? null : MAX_UNCONNECTED_MESSAGES,
          canMessage: isConnected || sentCount < MAX_UNCONNECTED_MESSAGES,
        };
      }

      res.json(result);
    } catch (error) {
      console.error('Message status error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
);

export default router;
