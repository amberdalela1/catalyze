import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body } from 'express-validator';
import { User, PhoneOTP } from '../models';
import {
  authenticate,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  AuthRequest,
} from '../middleware/auth';
import { handleValidationErrors } from '../middleware/validate';
import crypto from 'crypto';

const router = Router();

// Email/Password Signup
router.post(
  '/signup',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    handleValidationErrors,
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { name, email, password } = req.body;

      const existing = await User.findOne({ where: { email } });
      if (existing) {
        res.status(409).json({ message: 'Email already registered' });
        return;
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const user = await User.create({ name, email, passwordHash });

      const accessToken = generateAccessToken(user.id, false, user.role);
      const refreshToken = generateRefreshToken(user.id, false, user.role);

      res.status(201).json({
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
        accessToken,
        refreshToken,
      });
    } catch (error) {
      console.error('Signup error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
);

// Email/Password Login
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
    handleValidationErrors,
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { email, password, rememberMe } = req.body;

      const user = await User.findOne({ where: { email } });
      if (!user || !user.passwordHash) {
        res.status(401).json({ message: 'Invalid email or password' });
        return;
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        res.status(401).json({ message: 'Invalid email or password' });
        return;
      }

      const accessToken = generateAccessToken(user.id, !!rememberMe, user.role);
      const refreshToken = generateRefreshToken(user.id, !!rememberMe, user.role);

      res.json({
        user: { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl, role: user.role },
        accessToken,
        refreshToken,
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
);

// Google Sign-In
router.post('/google', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      res.status(400).json({ message: 'ID token required' });
      return;
    }

    // Verify Google ID token via Google's API
    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
    if (!response.ok) {
      res.status(401).json({ message: 'Invalid Google token' });
      return;
    }

    const payload = await response.json() as { sub: string; email: string; name: string; picture?: string };

    let user = await User.findOne({ where: { googleId: payload.sub } });
    if (!user) {
      user = await User.findOne({ where: { email: payload.email } });
      if (user) {
        await user.update({ googleId: payload.sub });
      } else {
        user = await User.create({
          name: payload.name,
          email: payload.email,
          googleId: payload.sub,
          avatarUrl: payload.picture,
        });
      }
    }

    const accessToken = generateAccessToken(user.id, false, user.role);
    const refreshToken = generateRefreshToken(user.id, false, user.role);

    res.json({
      user: { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl, role: user.role },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Apple Sign-In
router.post('/apple', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { identityToken, fullName, email: appleEmail } = req.body;
    if (!identityToken) {
      res.status(400).json({ message: 'Identity token required' });
      return;
    }

    // Decode Apple identity token (JWT) to get the subject (user ID)
    // In production, verify the token signature with Apple's public keys
    const parts = identityToken.split('.');
    if (parts.length !== 3) {
      res.status(401).json({ message: 'Invalid Apple token' });
      return;
    }

    const payloadStr = Buffer.from(parts[1], 'base64url').toString('utf-8');
    const payload = JSON.parse(payloadStr) as { sub: string; email?: string };

    let user = await User.findOne({ where: { appleId: payload.sub } });
    if (!user) {
      const email = appleEmail || payload.email;
      if (email) {
        user = await User.findOne({ where: { email } });
        if (user) {
          await user.update({ appleId: payload.sub });
        }
      }
      if (!user) {
        user = await User.create({
          name: fullName || 'Apple User',
          email: appleEmail || payload.email || null,
          appleId: payload.sub,
        });
      }
    }

    const accessToken = generateAccessToken(user.id, false, user.role);
    const refreshToken = generateRefreshToken(user.id, false, user.role);

    res.json({
      user: { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl, role: user.role },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error('Apple auth error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Phone OTP - Request
router.post(
  '/phone/request',
  [
    body('phone').matches(/^\+?[1-9]\d{1,14}$/).withMessage('Valid phone number required'),
    handleValidationErrors,
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { phone } = req.body;

      // Generate 6-digit OTP
      const code = crypto.randomInt(100000, 999999).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await PhoneOTP.create({ phone, code, expiresAt });

      // In production, send via Twilio/AWS SNS
      // For development, log the code
      if (process.env.NODE_ENV !== 'production') {
        console.log(`OTP for ${phone}: ${code}`);
      }

      res.json({ message: 'OTP sent successfully' });
    } catch (error) {
      console.error('Phone OTP error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
);

// Phone OTP - Verify
router.post(
  '/phone/verify',
  [
    body('phone').matches(/^\+?[1-9]\d{1,14}$/),
    body('code').isLength({ min: 6, max: 6 }),
    handleValidationErrors,
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { phone, code } = req.body;

      const otp = await PhoneOTP.findOne({
        where: { phone, code, used: false },
        order: [['createdAt', 'DESC']],
      });

      if (!otp || otp.expiresAt < new Date()) {
        res.status(401).json({ message: 'Invalid or expired OTP' });
        return;
      }

      await otp.update({ used: true });

      let user = await User.findOne({ where: { phone } });
      if (!user) {
        user = await User.create({ name: 'User', phone });
      }

      const accessToken = generateAccessToken(user.id, false, user.role);
      const refreshToken = generateRefreshToken(user.id, false, user.role);

      res.json({
        user: { id: user.id, name: user.name, phone: user.phone, avatarUrl: user.avatarUrl, role: user.role },
        accessToken,
        refreshToken,
      });
    } catch (error) {
      console.error('Phone verify error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
);

// Get current user
router.get('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findByPk(req.userId, {
      attributes: ['id', 'name', 'email', 'phone', 'avatarUrl', 'role'],
    });

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Refresh token
router.post('/refresh', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) {
      res.status(400).json({ message: 'Refresh token required' });
      return;
    }

    const payload = verifyRefreshToken(token);

    // Look up user to get current role
    const user = await User.findByPk(payload.userId);
    if (!user) {
      res.status(401).json({ message: 'User not found' });
      return;
    }

    // Detect if this was a long-lived (remember me) refresh token
    // by checking if its remaining lifetime exceeds the default 7d window
    const decoded = jwt.decode(token) as { exp?: number } | null;
    const remainingSeconds = decoded?.exp ? decoded.exp - Math.floor(Date.now() / 1000) : 0;
    const rememberMe = remainingSeconds > 7 * 24 * 3600;

    const accessToken = generateAccessToken(user.id, rememberMe, user.role);
    const refreshToken = generateRefreshToken(user.id, rememberMe, user.role);

    res.json({ accessToken, refreshToken });
  } catch {
    res.status(401).json({ message: 'Invalid refresh token' });
  }
});

// Logout (client-side token cleanup; this endpoint exists for future server-side token revocation)
router.post('/logout', authenticate, (_req: AuthRequest, res: Response): void => {
  res.json({ message: 'Logged out' });
});

export default router;
