import { Router, Response } from 'express';
import { Op } from 'sequelize';
import { Organization, FeedRecommendation, Post, User, Reaction, Partnership } from '../models';
import { authenticate, AuthRequest } from '../middleware/auth';
import { getRecommendations } from '../services/openai';

const router = Router();

// AI-powered recommendations
router.get('/recommendations', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const org = await Organization.findOne({ where: { ownerId: req.userId } });
    if (!org) {
      res.json([]);
      return;
    }

    // Check for cached recommendations (less than 24 hours old)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const cached = await FeedRecommendation.findAll({
      where: {
        orgId: org.id,
        generatedAt: { [Op.gt]: oneDayAgo },
      },
      include: [
        {
          model: Organization,
          as: 'recommendedOrg',
          attributes: ['id', 'name', 'mission', 'category', 'city', 'state', 'logoUrl'],
        },
      ],
      order: [['score', 'DESC']],
      limit: 5,
    });

    if (cached.length > 0) {
      const results = cached.map((rec) => ({
        id: (rec as FeedRecommendation & { recommendedOrg: Organization }).recommendedOrg.id,
        name: (rec as FeedRecommendation & { recommendedOrg: Organization }).recommendedOrg.name,
        mission: (rec as FeedRecommendation & { recommendedOrg: Organization }).recommendedOrg.mission,
        category: (rec as FeedRecommendation & { recommendedOrg: Organization }).recommendedOrg.category,
        logoUrl: (rec as FeedRecommendation & { recommendedOrg: Organization }).recommendedOrg.logoUrl,
        reason: rec.reason,
      }));
      res.json(results);
      return;
    }

    // Get all orgs except user's own and already-connected ones
    const partnerships = await Partnership.findAll({
      where: {
        status: 'accepted',
        [Op.or]: [{ requesterId: org.id }, { targetId: org.id }],
      },
    });

    const excludeIds = [
      org.id,
      ...partnerships.map((p) => (p.requesterId === org.id ? p.targetId : p.requesterId)),
    ];

    const candidates = await Organization.findAll({
      where: { id: { [Op.notIn]: excludeIds } },
      attributes: ['id', 'name', 'mission', 'category', 'city', 'state', 'logoUrl'],
      limit: 20,
    });

    if (candidates.length === 0) {
      res.json([]);
      return;
    }

    // Get AI recommendations
    const aiResults = await getRecommendations(
      { id: org.id, name: org.name, mission: org.mission, category: org.category, city: org.city, state: org.state },
      candidates.map((c) => ({ id: c.id, name: c.name, mission: c.mission, category: c.category, city: c.city, state: c.state }))
    );

    // Cache the recommendations
    if (aiResults.length > 0) {
      await FeedRecommendation.destroy({ where: { orgId: org.id } });
      await FeedRecommendation.bulkCreate(
        aiResults.map((r) => ({
          orgId: org.id,
          recommendedOrgId: r.orgId,
          score: r.score,
          reason: r.reason,
          generatedAt: new Date(),
        }))
      );
    }

    // Return with org details
    const orgMap = new Map(candidates.map((c) => [c.id, c]));
    const results = aiResults
      .filter((r) => orgMap.has(r.orgId))
      .map((r) => {
        const recOrg = orgMap.get(r.orgId)!;
        return {
          id: recOrg.id,
          name: recOrg.name,
          mission: recOrg.mission,
          category: recOrg.category,
          logoUrl: recOrg.logoUrl,
          reason: r.reason,
        };
      });

    res.json(results);
  } catch (error) {
    console.error('Recommendations error:', error);
    res.json([]);
  }
});

// Feed posts (from connected organizations)
router.get('/posts', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const org = await Organization.findOne({ where: { ownerId: req.userId } });
    if (!org) {
      res.json([]);
      return;
    }

    const partnerships = await Partnership.findAll({
      where: {
        status: 'accepted',
        [Op.or]: [{ requesterId: org.id }, { targetId: org.id }],
      },
    });

    const connectedOrgIds = [
      org.id,
      ...partnerships.map((p) => (p.requesterId === org.id ? p.targetId : p.requesterId)),
    ];

    const posts = await Post.findAll({
      where: { orgId: { [Op.in]: connectedOrgIds } },
      include: [
        { model: User, as: 'author', attributes: ['id', 'name', 'avatarUrl'] },
        { model: Organization, as: 'organization', attributes: ['id', 'name'] },
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
    console.error('Feed posts error:', error);
    res.json([]);
  }
});

export default router;
