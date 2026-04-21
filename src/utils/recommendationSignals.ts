export type RecommendationSignalType = 'category' | 'location' | 'size' | 'resource';

export interface RecommendationSignal {
  type: RecommendationSignalType;
  label: string;
  title: string;
}

function countResourcesInList(listText: string): number {
  return listText
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
    .length;
}

function getResourceMatchCount(signal: string): number {
  if (signal.startsWith('They offer ') && signal.includes(' that you need')) {
    const listText = signal.slice('They offer '.length, signal.indexOf(' that you need')).trim();
    return countResourcesInList(listText);
  }

  if (signal.startsWith('You can offer them ')) {
    const listText = signal.slice('You can offer them '.length).trim();
    return countResourcesInList(listText);
  }

  return 0;
}

export function parseRecommendationSignals(reason?: string | null): RecommendationSignal[] {
  if (!reason) return [];

  const parts = reason.split(' · ').map(s => s.trim()).filter(Boolean);

  // Accumulate all resource signals into a single tag with a combined count
  let totalResourceCount = 0;
  const resourceTitles: string[] = [];
  const nonResourceSignals: RecommendationSignal[] = [];

  for (const signal of parts) {
    if (signal.startsWith('Same category')) {
      nonResourceSignals.push({ type: 'category', label: 'Same category', title: signal });
    } else if (signal.toLowerCase().includes('location')) {
      nonResourceSignals.push({ type: 'location', label: 'Nearby', title: signal });
    } else if (signal.includes('org size')) {
      const label = signal.includes('Similar') ? 'Same size' : 'Similar size';
      nonResourceSignals.push({ type: 'size', label, title: signal });
    } else if (signal.includes('offer') || signal.includes('need')) {
      const count = getResourceMatchCount(signal);
      totalResourceCount += count > 0 ? count : 1;
      resourceTitles.push(signal);
    }
  }

  const result: RecommendationSignal[] = [...nonResourceSignals];

  if (resourceTitles.length > 0) {
    const label = totalResourceCount > 0
      ? `${totalResourceCount} resource${totalResourceCount === 1 ? '' : 's'} matched`
      : 'Resource match';
    result.push({ type: 'resource', label, title: resourceTitles.join(' · ') });
  }

  return result;
}
