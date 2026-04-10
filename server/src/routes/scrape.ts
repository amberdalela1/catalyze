import { Router, Response } from 'express';
import { query } from 'express-validator';
import { authenticate, AuthRequest } from '../middleware/auth';
import { handleValidationErrors } from '../middleware/validate';

const router = Router();

// Fetch HTML from a URL with timeout
async function fetchPage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CatalyzeBot/1.0)',
        'Accept': 'text/html',
      },
      redirect: 'follow',
    });
    clearTimeout(timeout);
    if (!response.ok) return null;
    const html = await response.text();
    return html.slice(0, 200_000);
  } catch {
    return null;
  }
}

// Extract emails from HTML content
function extractEmails(content: string): Set<string> {
  const emailPatterns = [
    /mailto:([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/gi,
    /\b([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})\b/g,
  ];
  const emails = new Set<string>();
  for (const pattern of emailPatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const email = match[1].toLowerCase();
      if (!email.endsWith('.png') && !email.endsWith('.jpg') && !email.endsWith('.svg')
        && !email.includes('example.com') && !email.includes('sentry')
        && !email.includes('webpack') && !email.includes('wixpress')) {
        emails.add(email);
      }
    }
  }
  return emails;
}

// Extract phone numbers from HTML content
function extractPhones(content: string): { telPhones: string[]; regexPhones: string[] } {
  const telPhones: string[] = [];
  const regexPhones: string[] = [];

  // tel: link phones (highest confidence)
  const telPattern = /href=["']tel:([+\d\-().  ]{7,20})["']/gi;
  let match;
  while ((match = telPattern.exec(content)) !== null) {
    const phone = match[1].replace(/\s+/g, ' ').trim();
    const digits = phone.replace(/\D/g, '');
    if (digits.length >= 10 && digits.length <= 15 && isValidPhone(digits)) {
      telPhones.push(phone);
    }
  }

  // General phone patterns (lower confidence)
  const generalPattern = /\b(\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})\b/g;
  while ((match = generalPattern.exec(content)) !== null) {
    const phone = match[1].replace(/\s+/g, ' ').trim();
    const digits = phone.replace(/\D/g, '');
    if (digits.length >= 10 && digits.length <= 15 && isValidPhone(digits) && hasPhoneSeparators(match[1])) {
      regexPhones.push(phone);
    }
  }

  return { telPhones, regexPhones };
}

// Reject garbage numbers (all same digit, sequential, known bad patterns)
function isValidPhone(digits: string): boolean {
  if (/^(\d)\1+$/.test(digits)) return false; // all same digit (9999999999)
  if (digits === '2147483647') return false; // MAX_INT
  if (digits.startsWith('0000')) return false;
  return true;
}

// Require at least one separator to reduce false positives from bare digit sequences
function hasPhoneSeparators(raw: string): boolean {
  return /[-.()\s+]/.test(raw);
}

// Pick the best email, preferring contact-style addresses
function pickBestEmail(emails: Set<string>): string | null {
  const emailArr = Array.from(emails);
  if (emailArr.length === 0) return null;
  const contactPriority = ['contact', 'info', 'hello', 'support', 'admin', 'office', 'general'];
  for (const prio of contactPriority) {
    const found = emailArr.find(e => e.startsWith(prio));
    if (found) return found;
  }
  return emailArr[0];
}

// Scrape public contact info from a website
router.get(
  '/',
  authenticate,
  [
    query('url').isURL().withMessage('Valid URL is required'),
    handleValidationErrors,
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      let url = req.query.url as string;
      if (!/^https?:\/\//i.test(url)) {
        url = 'https://' + url;
      }

      // Validate URL is not a private/internal address
      const parsedUrl = new URL(url);
      const hostname = parsedUrl.hostname.toLowerCase();
      if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.') || hostname.startsWith('10.') || hostname.startsWith('172.') || hostname === '0.0.0.0') {
        res.status(400).json({ message: 'Invalid URL' });
        return;
      }

      const allEmails = new Set<string>();
      let allTelPhones: string[] = [];
      let allRegexPhones: string[] = [];

      // Scrape main page
      const mainHtml = await fetchPage(url);
      if (mainHtml) {
        extractEmails(mainHtml).forEach(e => allEmails.add(e));
        const phones = extractPhones(mainHtml);
        allTelPhones.push(...phones.telPhones);
        allRegexPhones.push(...phones.regexPhones);
      }

      // Also try /contact and /contact-us pages for better results
      const base = parsedUrl.origin;
      const contactPaths = ['/contact', '/contact-us', '/about/contact'];
      const contactFetches = contactPaths.map(path => fetchPage(base + path));
      const contactPages = await Promise.all(contactFetches);

      for (const html of contactPages) {
        if (html) {
          extractEmails(html).forEach(e => allEmails.add(e));
          const phones = extractPhones(html);
          allTelPhones.push(...phones.telPhones);
          allRegexPhones.push(...phones.regexPhones);
        }
      }

      const bestEmail = pickBestEmail(allEmails);
      // Prefer tel: link phones, then fall back to regex-matched phones
      const bestPhone = allTelPhones[0] || allRegexPhones[0] || null;

      res.json({ contactEmail: bestEmail, contactPhone: bestPhone });
    } catch (error: any) {
      if (error.name === 'AbortError') {
        res.json({ contactEmail: null, contactPhone: null });
        return;
      }
      console.error('Scrape contact error:', error);
      res.json({ contactEmail: null, contactPhone: null });
    }
  }
);

export default router;
