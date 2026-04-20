import { Router, Response } from 'express';
import { Op } from 'sequelize';
import { Organization, FeedRecommendation, Post, User, Reaction, Partnership, Media, Favorite, OrgResource } from '../models';
import { authenticate, AuthRequest } from '../middleware/auth';
import { getRecommendations, OrgWithResources } from '../services/openai';

const router = Router();

// Helper: build OrgWithResources from an org + its OrgResource rows
async function buildOrgWithResources(org: Organization): Promise<OrgWithResources> {
  const resources = await OrgResource.findAll({ where: { orgId: org.id } });
  return {
    id: org.id, name: org.name, mission: org.mission, category: org.category,
    city: org.city, state: org.state, latitude: org.latitude, longitude: org.longitude,
    size: org.size,
    offeredResources: resources.filter(r => r.direction === 'offer').map(r => r.resource),
    neededResources: resources.filter(r => r.direction === 'need').map(r => r.resource),
  };
}

// AI-powered recommendations
router.get('/recommendations', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const org = await Organization.findOne({ where: { ownerId: req.userId } });
    if (!org) {
      res.json([]);
      return;
    }

    // Check for cached recommendations (less than 24 hours old and newer than last org update)
    const forceRefresh = req.query.refresh === '1';
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const cacheMinTime = org.updatedAt > oneDayAgo ? org.updatedAt : oneDayAgo;

    if (forceRefresh) {
      await FeedRecommendation.destroy({ where: { orgId: org.id } });
    }

    const cached = !forceRefresh ? await FeedRecommendation.findAll({
      where: {
        orgId: org.id,
        generatedAt: { [Op.gt]: cacheMinTime },
      },
      include: [
        {
          model: Organization,
          as: 'recommendedOrg',
          attributes: ['id', 'name', 'mission', 'category', 'city', 'state', 'logoUrl'],
        },
      ],
      order: [['score', 'DESC']],
      limit: 200,
    }) : [];

    if (cached.length > 0) {
      const results = cached.map((rec) => ({
        id: (rec as FeedRecommendation & { recommendedOrg: Organization }).recommendedOrg.id,
        name: (rec as FeedRecommendation & { recommendedOrg: Organization }).recommendedOrg.name,
        mission: (rec as FeedRecommendation & { recommendedOrg: Organization }).recommendedOrg.mission,
        category: (rec as FeedRecommendation & { recommendedOrg: Organization }).recommendedOrg.category,
        city: (rec as FeedRecommendation & { recommendedOrg: Organization }).recommendedOrg.city,
        state: (rec as FeedRecommendation & { recommendedOrg: Organization }).recommendedOrg.state,
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
      attributes: ['id', 'name', 'mission', 'category', 'city', 'state', 'logoUrl', 'latitude', 'longitude', 'size'],
      limit: 50,
    });

    if (candidates.length === 0) {
      res.json([]);
      return;
    }

    // Build profiles with resources
    const userProfile = await buildOrgWithResources(org);
    const candidateProfiles = await Promise.all(candidates.map(buildOrgWithResources));

    // Get scored recommendations
    const aiResults = await getRecommendations(userProfile, candidateProfiles);

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
          city: recOrg.city,
          state: recOrg.state,
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

// Helper: enrich posts with reaction counts
async function enrichPosts(posts: Post[]) {
  return Promise.all(
    posts.map(async (post) => {
      const reactionCount = await Reaction.count({ where: { postId: post.id } });
      return { ...post.toJSON(), _count: { reactions: reactionCount } };
    })
  );
}

const postIncludes = [
  { model: User, as: 'author', attributes: ['id', 'name', 'avatarUrl'] },
  { model: Organization, as: 'organization', attributes: ['id', 'name', 'logoUrl'] },
  { model: Media, as: 'media', attributes: ['id', 'url', 'type', 'caption', 'displayOrder'] },
];

// Feed posts — connected orgs (default, backward compatible)
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
      include: postIncludes,
      order: [['createdAt', 'DESC']],
      limit: 50,
    });

    res.json(await enrichPosts(posts));
  } catch (error) {
    console.error('Feed posts error:', error);
    res.json([]);
  }
});

// All posts = union of connected + favorites + recommended
router.get('/posts/all', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const org = await Organization.findOne({ where: { ownerId: req.userId } });
    const orgIdSet = new Set<number>();

    // Include own org
    if (org) {
      orgIdSet.add(org.id);

      // Connected orgs
      const partnerships = await Partnership.findAll({
        where: {
          status: 'accepted',
          [Op.or]: [{ requesterId: org.id }, { targetId: org.id }],
        },
      });
      partnerships.forEach((p) => orgIdSet.add(p.requesterId === org.id ? p.targetId : p.requesterId));

      // Recommended orgs
      const recs = await FeedRecommendation.findAll({
        where: { orgId: org.id },
        attributes: ['recommendedOrgId'],
      });
      recs.forEach((r) => orgIdSet.add(r.recommendedOrgId));
    }

    // Favorited orgs
    const favorites = await Favorite.findAll({
      where: { userId: req.userId },
      attributes: ['orgId'],
    });
    favorites.forEach((f) => orgIdSet.add(f.orgId));

    if (orgIdSet.size === 0) {
      res.json([]);
      return;
    }

    const posts = await Post.findAll({
      where: { orgId: { [Op.in]: [...orgIdSet] } },
      include: postIncludes,
      order: [['createdAt', 'DESC']],
      limit: 50,
    });
    res.json(await enrichPosts(posts));
  } catch (error) {
    console.error('All posts error:', error);
    res.json([]);
  }
});

// Posts from favorited orgs
router.get('/posts/favorites', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const favorites = await Favorite.findAll({
      where: { userId: req.userId },
      attributes: ['orgId'],
    });

    const orgIds = favorites.map((f) => f.orgId);
    if (orgIds.length === 0) {
      res.json([]);
      return;
    }

    const posts = await Post.findAll({
      where: { orgId: { [Op.in]: orgIds } },
      include: postIncludes,
      order: [['createdAt', 'DESC']],
      limit: 50,
    });

    res.json(await enrichPosts(posts));
  } catch (error) {
    console.error('Favorites posts error:', error);
    res.json([]);
  }
});

// Posts from AI-recommended orgs
router.get('/posts/recommended', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const org = await Organization.findOne({ where: { ownerId: req.userId } });
    if (!org) {
      res.json([]);
      return;
    }

    const recs = await FeedRecommendation.findAll({
      where: { orgId: org.id },
      attributes: ['recommendedOrgId'],
    });

    const recOrgIds = recs.map((r) => r.recommendedOrgId);
    if (recOrgIds.length === 0) {
      res.json([]);
      return;
    }

    const posts = await Post.findAll({
      where: { orgId: { [Op.in]: recOrgIds } },
      include: postIncludes,
      order: [['createdAt', 'DESC']],
      limit: 50,
    });

    res.json(await enrichPosts(posts));
  } catch (error) {
    console.error('Recommended posts error:', error);
    res.json([]);
  }
});

export default router;
