import OpenAI from 'openai';

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export interface OrgProfile {
  id: number;
  name: string;
  mission: string;
  category: string;
  city?: string | null;
  state?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  size?: string | null;
}

export interface OrgWithResources extends OrgProfile {
  offeredResources: string[];
  neededResources: string[];
}

export interface RecommendationResult {
  orgId: number;
  reason: string;
  score: number;
}

// ── Distance helpers ──────────────────────────────────────────────

/** Haversine distance in miles. */
function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 3959; // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Geo score: 0–30 points.
 * < 50 mi → 30, < 150 mi → 25, < 500 mi → 20, < 1000 mi → 15,
 * < 2500 mi → 10, < 5000 mi → 5, else 2.
 * No coords → 5
 */
function geoScore(userOrg: OrgProfile, candidate: OrgProfile): number {
  if (!userOrg.latitude || !userOrg.longitude || !candidate.latitude || !candidate.longitude) {
    return 5;
  }
  const d = haversineDistance(userOrg.latitude, userOrg.longitude, candidate.latitude, candidate.longitude);
  if (d < 50) return 30;
  if (d < 150) return 25;
  if (d < 500) return 20;
  if (d < 1000) return 15;
  if (d < 2500) return 10;
  if (d < 5000) return 5;
  return 2;
}

/**
 * Size score: 0–15 points.
 * Same size → 15, adjacent → 10, opposite → 5, unknown → 8.
 */
function sizeScore(userOrg: OrgProfile, candidate: OrgProfile): number {
  if (!userOrg.size || !candidate.size) return 8;
  if (userOrg.size === candidate.size) return 15;
  const sizeOrder = { small: 0, medium: 1, large: 2 } as Record<string, number>;
  const diff = Math.abs((sizeOrder[userOrg.size] ?? 1) - (sizeOrder[candidate.size] ?? 1));
  return diff === 1 ? 10 : 5;
}

/**
 * Resource matching score: 0–30 points (15 each direction).
 * "They offer what I need" + "I offer what they need".
 */
function resourceScore(userOrg: OrgWithResources, candidate: OrgWithResources): { total: number; reasons: string[] } {
  const reasons: string[] = [];

  // What they offer that I need
  const theyOfferINeed = candidate.offeredResources.filter(r => userOrg.neededResources.includes(r));
  // What I offer that they need
  const iOfferTheyNeed = userOrg.offeredResources.filter(r => candidate.neededResources.includes(r));

  let offerScore = 0;
  if (theyOfferINeed.length >= 3) offerScore = 15;
  else if (theyOfferINeed.length === 2) offerScore = 12;
  else if (theyOfferINeed.length === 1) offerScore = 8;

  let needScore = 0;
  if (iOfferTheyNeed.length >= 3) needScore = 15;
  else if (iOfferTheyNeed.length === 2) needScore = 12;
  else if (iOfferTheyNeed.length === 1) needScore = 8;

  if (theyOfferINeed.length > 0) {
    reasons.push(`They offer ${theyOfferINeed.slice(0, 3).join(', ')} that you need`);
  }
  if (iOfferTheyNeed.length > 0) {
    reasons.push(`You can offer them ${iOfferTheyNeed.slice(0, 3).join(', ')}`);
  }

  return { total: offerScore + needScore, reasons };
}

/**
 * Category score: 0–20 points.
 * Same category → 20, different → 0.
 * When user has no resources specified, category weight increases to compensate.
 */
function categoryScore(userOrg: OrgWithResources, candidate: OrgWithResources): { total: number; reason: string | null } {
  if (!userOrg.category || !candidate.category) return { total: 0, reason: null };

  const hasResources = userOrg.offeredResources.length > 0 || userOrg.neededResources.length > 0;

  if (userOrg.category.toLowerCase() === candidate.category.toLowerCase()) {
    // Boost category score when no resources are specified (category becomes primary signal)
    const score = hasResources ? 20 : 30;
    return { total: score, reason: `Same category: ${candidate.category}` };
  }

  return { total: 0, reason: null };
}

// ── Main scoring function (local first, AI fallback) ──────────────

export async function getRecommendations(
  userOrg: OrgWithResources,
  candidateOrgs: OrgWithResources[],
): Promise<RecommendationResult[]> {
  if (candidateOrgs.length === 0) return [];

  // ── Phase 1: Local deterministic scoring (0–95 pts) ──
  // geo(30) + size(15) + resources(30) + category(20, or 30 if no resources)
  const scored = candidateOrgs.map(candidate => {
    const geo = geoScore(userOrg, candidate);
    const size = sizeScore(userOrg, candidate);
    const res = resourceScore(userOrg, candidate);
    const cat = categoryScore(userOrg, candidate);
    const localScore = geo + size + res.total + cat.total;

    // Build reason string from local factors
    const reasonParts: string[] = [];
    if (cat.reason) reasonParts.push(cat.reason);
    if (geo >= 20) reasonParts.push('Nearby location');
    if (size >= 15) reasonParts.push('Similar org size');
    else if (size >= 10) reasonParts.push('Compatible org size');
    reasonParts.push(...res.reasons);

    return {
      orgId: candidate.id,
      score: localScore,
      reason: reasonParts.length > 0 ? reasonParts.join(' · ') : `${candidate.category} organization`,
      candidate,
    };
  });

  // Sort by local score descending
  scored.sort((a, b) => b.score - a.score);

  // ── Phase 2: AI enhancement for top candidates ──
  // Only call AI to refine/re-rank the top 10 and produce nicer reasons
  const topCandidates = scored.slice(0, 200);

  if (openai) {
    try {
      const aiResults = await getAIRecommendations(userOrg, topCandidates.map(s => s.candidate));
      if (aiResults.length > 0) {
        // Blend: local score (75%) + AI score (25%)
        const aiMap = new Map(aiResults.map(r => [r.orgId, r]));
        for (const s of topCandidates) {
          const ai = aiMap.get(s.orgId);
          if (ai) {
            const aiNormalized = (ai.score / 100) * 25; // AI score is 0-100, map to 0-25
            s.score = s.score + aiNormalized;
            // Use AI reason if local reason is generic
            if (ai.reason && s.reason.length < 30) {
              s.reason = ai.reason;
            } else if (ai.reason) {
              s.reason = s.reason + ' · ' + ai.reason;
            }
          }
        }
        topCandidates.sort((a, b) => b.score - a.score);
      }
    } catch (error) {
      console.warn('AI enhancement failed, using local scoring only:', (error as Error).message);
    }
  }

  // Normalize scores to 0-100 scale and filter out weak matches
  const maxScore = topCandidates[0]?.score || 1;
  return topCandidates
    .slice(0, 200)
    .map(s => ({
      orgId: s.orgId,
      score: Math.round((s.score / maxScore) * 100),
      reason: s.reason,
    }))
    .filter(s => s.score >= 15); // Drop orgs that score less than 40% of the best match
}

/** AI-only scoring (used as Phase 2 enhancement). */
async function getAIRecommendations(
  userOrg: OrgWithResources,
  candidateOrgs: OrgWithResources[],
): Promise<RecommendationResult[]> {
  if (!openai || candidateOrgs.length === 0) return [];

  const prompt = `You are helping a non-profit organization find the best partners to collaborate with.

User's Organization:
- Name: ${userOrg.name}
- Category: ${userOrg.category}
- Mission: ${userOrg.mission}
- Location: ${userOrg.city || 'Unknown'}, ${userOrg.state || 'Unknown'}
- Size: ${userOrg.size || 'Unknown'}
- Can offer: ${userOrg.offeredResources.slice(0, 10).join(', ') || 'None specified'}
- Needs: ${userOrg.neededResources.slice(0, 10).join(', ') || 'None specified'}

Candidate Organizations:
${candidateOrgs.map((org, i) => `${i + 1}. ID: ${org.id}, Name: ${org.name}, Category: ${org.category}, Mission: ${org.mission}, Location: ${org.city || 'Unknown'}, ${org.state || 'Unknown'}, Size: ${org.size || 'Unknown'}, Offers: ${org.offeredResources.slice(0, 5).join(', ') || 'N/A'}, Needs: ${org.neededResources.slice(0, 5).join(', ') || 'N/A'}`).join('\n')}

Rank the top ${Math.min(5, candidateOrgs.length)} organizations that would be the best partners. Consider mission alignment, complementary services, and collaboration potential.

Respond in JSON format only:
[
  { "orgId": <number>, "reason": "<brief 10-word-max explanation>", "score": <0-100> }
]`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 500,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return [];

    const parsed = JSON.parse(content);
    const results: RecommendationResult[] = Array.isArray(parsed) ? parsed : parsed.recommendations || [];

    return results
      .filter((r: RecommendationResult) => r.orgId && r.reason && typeof r.score === 'number')
      .sort((a: RecommendationResult, b: RecommendationResult) => b.score - a.score);
  } catch (error) {
    console.error('OpenAI recommendation error:', error);
    return [];
  }
}
