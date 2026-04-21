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

  return reason
    .split(' · ')
    .map(signal => signal.trim())
    .filter(Boolean)
    .map(signal => {
      if (signal.startsWith('Same category')) {
        return { type: 'category', label: 'Same category', title: signal };
      }

      if (signal.toLowerCase().includes('location')) {
        return { type: 'location', label: 'Nearby', title: signal };
      }

      if (signal.includes('org size')) {
        const label = signal.includes('Similar') ? 'Same size' : 'Similar size';
        return { type: 'size', label, title: signal };
      }

      if (signal.includes('offer') || signal.includes('need')) {
        const count = getResourceMatchCount(signal);
        const label = count > 0
          ? `${count} resource${count === 1 ? '' : 's'} matched`
          : 'Resource match';
        return { type: 'resource', label, title: signal };
      }

      return null;
    })
    .filter((signal): signal is RecommendationSignal => signal !== null);
}
