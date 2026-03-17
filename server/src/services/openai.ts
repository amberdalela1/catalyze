import OpenAI from 'openai';

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

interface OrgProfile {
  id: number;
  name: string;
  mission: string;
  category: string;
  city?: string | null;
  state?: string | null;
}

interface RecommendationResult {
  orgId: number;
  reason: string;
  score: number;
}

export async function getRecommendations(
  userOrg: OrgProfile,
  candidateOrgs: OrgProfile[]
): Promise<RecommendationResult[]> {
  if (candidateOrgs.length === 0) return [];
  if (!openai) {
    console.warn('OpenAI API key not configured — skipping AI recommendations');
    return [];
  }

  const prompt = `You are helping a non-profit organization find the best partners to collaborate with.

User's Organization:
- Name: ${userOrg.name}
- Category: ${userOrg.category}
- Mission: ${userOrg.mission}
- Location: ${userOrg.city || 'Unknown'}, ${userOrg.state || 'Unknown'}

Candidate Organizations:
${candidateOrgs.map((org, i) => `${i + 1}. ID: ${org.id}, Name: ${org.name}, Category: ${org.category}, Mission: ${org.mission}, Location: ${org.city || 'Unknown'}, ${org.state || 'Unknown'}`).join('\n')}

Rank the top ${Math.min(5, candidateOrgs.length)} organizations that would be the best partners. Consider:
1. Mission alignment and complementary goals
2. Geographic proximity
3. Category relevance
4. Potential for meaningful collaboration

Respond in JSON format only:
[
  { "orgId": <number>, "reason": "<brief explanation of why they're a good match>", "score": <0-100> }
]`;

  try {
    const response = await openai!.chat.completions.create({
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
