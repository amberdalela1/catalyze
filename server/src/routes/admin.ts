import { Router, Response } from 'express';
import { Op } from 'sequelize';
import { User, Organization, Post, Partnership, Media, OrgResource, Reaction, Message } from '../models';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

// All admin routes require authentication + admin role
router.use(authenticate, requireAdmin);

// ── Dashboard stats ──
router.get('/stats', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [users, organizations, posts, partnerships, messages] = await Promise.all([
      User.count(),
      Organization.count(),
      Post.count(),
      Partnership.count({ where: { status: 'accepted' } }),
      Message.count(),
    ]);
    res.json({ users, organizations, posts, partnerships, messages });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ── Users ──
router.get('/users', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { q } = req.query;
    const where: Record<string, unknown> = {};
    if (q && typeof q === 'string') {
      where[Op.or as unknown as string] = [
        { name: { [Op.like]: `%${q}%` } },
        { email: { [Op.like]: `%${q}%` } },
      ];
    }
    const users = await User.findAll({
      where,
      attributes: ['id', 'name', 'email', 'phone', 'role', 'avatarUrl', 'createdAt'],
      include: [{ model: Organization, as: 'organization', attributes: ['id', 'name'] }],
      order: [['createdAt', 'DESC']],
      limit: 100,
    });
    res.json(users);
  } catch (error) {
    console.error('Admin get users error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.put('/users/:id/role', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findByPk(Number(req.params.id));
    if (!user) { res.status(404).json({ message: 'User not found' }); return; }
    if (user.id === req.userId) { res.status(400).json({ message: 'Cannot change your own role' }); return; }

    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) { res.status(400).json({ message: 'Invalid role' }); return; }

    await user.update({ role });
    res.json({ id: user.id, name: user.name, role: user.role });
  } catch (error) {
    console.error('Admin update role error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.delete('/users/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findByPk(Number(req.params.id));
    if (!user) { res.status(404).json({ message: 'User not found' }); return; }
    if (user.id === req.userId) { res.status(400).json({ message: 'Cannot delete yourself' }); return; }

    // Delete user's organization and all related data
    const org = await Organization.findOne({ where: { ownerId: user.id } });
    if (org) {
      await Promise.all([
        Post.destroy({ where: { orgId: org.id } }),
        Partnership.destroy({ where: { [Op.or]: [{ requesterId: org.id }, { targetId: org.id }] } }),
        Media.destroy({ where: { orgId: org.id } }),
        OrgResource.destroy({ where: { orgId: org.id } }),
        Message.destroy({ where: { [Op.or]: [{ senderOrgId: org.id }, { receiverOrgId: org.id }] } }),
      ]);
      await org.destroy();
    }

    await Reaction.destroy({ where: { userId: user.id } });
    await user.destroy();
    res.json({ message: 'User and related data deleted' });
  } catch (error) {
    console.error('Admin delete user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ── Organizations ──
router.get('/organizations', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { q } = req.query;
    const where: Record<string, unknown> = {};
    if (q && typeof q === 'string') {
      where[Op.or as unknown as string] = [
        { name: { [Op.like]: `%${q}%` } },
        { category: { [Op.like]: `%${q}%` } },
      ];
    }
    const orgs = await Organization.findAll({
      where,
      attributes: ['id', 'name', 'category', 'city', 'state', 'logoUrl', 'ownerId', 'canPost', 'canMessage', 'createdAt'],
      include: [{ model: User, as: 'owner', attributes: ['id', 'name', 'email'] }],
      order: [['createdAt', 'DESC']],
      limit: 100,
    });
    res.json(orgs);
  } catch (error) {
    console.error('Admin get orgs error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.delete('/organizations/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const org = await Organization.findByPk(Number(req.params.id));
    if (!org) { res.status(404).json({ message: 'Organization not found' }); return; }

    await Promise.all([
      Post.destroy({ where: { orgId: org.id } }),
      Partnership.destroy({ where: { [Op.or]: [{ requesterId: org.id }, { targetId: org.id }] } }),
      Media.destroy({ where: { orgId: org.id } }),
      OrgResource.destroy({ where: { orgId: org.id } }),
      Message.destroy({ where: { [Op.or]: [{ senderOrgId: org.id }, { receiverOrgId: org.id }] } }),
    ]);
    await org.destroy();
    res.json({ message: 'Organization and related data deleted' });
  } catch (error) {
    console.error('Admin delete org error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.put('/organizations/:id/restrictions', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const org = await Organization.findByPk(Number(req.params.id));
    if (!org) { res.status(404).json({ message: 'Organization not found' }); return; }

    const { canPost, canMessage } = req.body;
    const updates: Record<string, boolean> = {};
    if (typeof canPost === 'boolean') updates.canPost = canPost;
    if (typeof canMessage === 'boolean') updates.canMessage = canMessage;

    await org.update(updates);
    res.json({ id: org.id, name: org.name, canPost: org.canPost, canMessage: org.canMessage });
  } catch (error) {
    console.error('Admin update restrictions error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ── Posts ──
router.get('/posts', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { q } = req.query;
    const where: Record<string, unknown> = {};
    if (q && typeof q === 'string') {
      where[Op.or as unknown as string] = [
        { title: { [Op.like]: `%${q}%` } },
        { content: { [Op.like]: `%${q}%` } },
      ];
    }
    const posts = await Post.findAll({
      where,
      include: [
        { model: User, as: 'author', attributes: ['id', 'name'] },
        { model: Organization, as: 'organization', attributes: ['id', 'name'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: 100,
    });
    res.json(posts);
  } catch (error) {
    console.error('Admin get posts error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.delete('/posts/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const post = await Post.findByPk(Number(req.params.id));
    if (!post) { res.status(404).json({ message: 'Post not found' }); return; }

    await Promise.all([
      Reaction.destroy({ where: { postId: post.id } }),
      Media.destroy({ where: { postId: post.id } }),
    ]);
    await post.destroy();
    res.json({ message: 'Post deleted' });
  } catch (error) {
    console.error('Admin delete post error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create post on behalf of an org
router.post('/posts', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { orgId, title, content, type } = req.body;
    if (!orgId || !title || !content || !type) {
      res.status(400).json({ message: 'orgId, title, content, and type are required' });
      return;
    }
    if (!['tip', 'experience', 'announcement'].includes(type)) {
      res.status(400).json({ message: 'Invalid post type' });
      return;
    }
    const org = await Organization.findByPk(orgId);
    if (!org) {
      res.status(404).json({ message: 'Organization not found' });
      return;
    }
    const post = await Post.create({
      orgId: org.id,
      authorId: org.ownerId,
      title,
      content,
      type,
    });
    res.status(201).json(post);
  } catch (error) {
    console.error('Admin create post error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ── Partnerships ──
router.delete('/partnerships/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const partnership = await Partnership.findByPk(Number(req.params.id));
    if (!partnership) { res.status(404).json({ message: 'Partnership not found' }); return; }
    await partnership.destroy();
    res.json({ message: 'Partnership deleted' });
  } catch (error) {
    console.error('Admin delete partnership error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ── Messages ──
router.get('/messages', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { q } = req.query;
    const where: Record<string, unknown> = {};
    if (q && typeof q === 'string') {
      where.content = { [Op.like]: `%${q}%` };
    }
    const messages = await Message.findAll({
      where,
      include: [
        { model: Organization, as: 'senderOrg', attributes: ['id', 'name'] },
        { model: Organization, as: 'receiverOrg', attributes: ['id', 'name'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: 200,
    });
    res.json(messages);
  } catch (error) {
    console.error('Admin get messages error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.delete('/messages/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const message = await Message.findByPk(Number(req.params.id));
    if (!message) { res.status(404).json({ message: 'Message not found' }); return; }
    await message.destroy();
    res.json({ message: 'Message deleted' });
  } catch (error) {
    console.error('Admin delete message error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
