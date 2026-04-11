import { Router, Response } from 'express';
import { body } from 'express-validator';
import { Post, Organization, User, Reaction, Media } from '../models';
import { authenticate, AuthRequest } from '../middleware/auth';
import { handleValidationErrors } from '../middleware/validate';

const router = Router();

// Create post
router.post(
  '/',
  authenticate,
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('content').trim().notEmpty().withMessage('Content is required'),
    body('type').isIn(['tip', 'experience', 'announcement']).withMessage('Invalid post type'),
    handleValidationErrors,
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const org = await Organization.findOne({ where: { ownerId: req.userId } });
      if (!org) {
        res.status(400).json({ message: 'You must create an organization first' });
        return;
      }

      if (!org.canPost) {
        res.status(403).json({ message: 'Your organization\'s posting privileges have been suspended by an admin' });
        return;
      }

      const post = await Post.create({
        ...req.body,
        orgId: org.id,
        authorId: req.userId,
      });

      res.status(201).json(post);
    } catch (error) {
      console.error('Create post error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
);

// Get posts by organization
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { orgId } = req.query;
    const where = orgId ? { orgId: Number(orgId) } : {};

    const posts = await Post.findAll({
      where,
      include: [
        { model: User, as: 'author', attributes: ['id', 'name', 'avatarUrl'] },
        { model: Organization, as: 'organization', attributes: ['id', 'name', 'logoUrl'] },
        { model: Media, as: 'media', attributes: ['id', 'url', 'type', 'caption', 'displayOrder'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: 50,
    });

    // Get reaction counts
    const postsWithCounts = await Promise.all(
      posts.map(async (post) => {
        const reactionCount = await Reaction.count({ where: { postId: post.id } });
        return { ...post.toJSON(), _count: { reactions: reactionCount } };
      })
    );

    res.json(postsWithCounts);
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get feed posts (from connected organizations)
router.get('/feed', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const org = await Organization.findOne({ where: { ownerId: req.userId } });
    if (!org) {
      res.json([]);
      return;
    }

    const { Partnership } = await import('../models');
    const { Op } = await import('sequelize');

    // Get connected org IDs
    const partnerships = await Partnership.findAll({
      where: {
        status: 'accepted',
        [Op.or]: [{ requesterId: org.id }, { targetId: org.id }],
      },
    });

    const connectedOrgIds = partnerships.map((p) =>
      p.requesterId === org.id ? p.targetId : p.requesterId
    );

    // Include own org posts too
    connectedOrgIds.push(org.id);

    const posts = await Post.findAll({
      where: { orgId: { [Op.in]: connectedOrgIds } },
      include: [
        { model: User, as: 'author', attributes: ['id', 'name', 'avatarUrl'] },
        { model: Organization, as: 'organization', attributes: ['id', 'name', 'logoUrl'] },
        { model: Media, as: 'media', attributes: ['id', 'url', 'type', 'caption', 'displayOrder'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: 50,
    });

    const postsWithCounts = await Promise.all(
      posts.map(async (post) => {
        const reactionCount = await Reaction.count({ where: { postId: post.id } });
        return { ...post.toJSON(), _count: { reactions: reactionCount } };
      })
    );

    res.json(postsWithCounts);
  } catch (error) {
    console.error('Get feed posts error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// React to a post
router.post('/:id/react', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const postId = Number(req.params.id);
    const userId = req.userId!;

    const existing = await Reaction.findOne({ where: { postId, userId } });
    if (existing) {
      await existing.destroy();
      res.json({ reacted: false });
    } else {
      await Reaction.create({ postId, userId });
      res.json({ reacted: true });
    }
  } catch (error) {
    console.error('React error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
