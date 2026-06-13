import * as SecureStore from 'expo-secure-store';

const PREFIX = 'pvtu_ad_views:';

type ViewRecord = {
  count: number;
  lastSeenAt: string;
  sessionId: string;
};

let sessionId = `${Date.now()}`;

export function resetAdSession(): void {
  sessionId = `${Date.now()}`;
}

async function readRecord(adId: string): Promise<ViewRecord | null> {
  try {
    const raw = await SecureStore.getItemAsync(`${PREFIX}${adId}`);
    if (!raw) return null;
    return JSON.parse(raw) as ViewRecord;
  } catch {
    return null;
  }
}

async function writeRecord(adId: string, record: ViewRecord): Promise<void> {
  await SecureStore.setItemAsync(`${PREFIX}${adId}`, JSON.stringify(record));
}

function isSameDay(a: string, b: Date): boolean {
  const left = new Date(a);
  return left.toDateString() === b.toDateString();
}

export async function shouldShowAd(input: {
  id: string;
  frequency: 'UNLIMITED' | 'ONCE' | 'ONCE_PER_DAY' | 'ONCE_PER_SESSION';
  maxImpressions?: number | null;
}): Promise<boolean> {
  const record = await readRecord(input.id);
  const now = new Date();

  if (input.maxImpressions && record && record.count >= input.maxImpressions) {
    return false;
  }

  switch (input.frequency) {
    case 'ONCE':
      return !record || record.count === 0;
    case 'ONCE_PER_DAY':
      return !record || !isSameDay(record.lastSeenAt, now);
    case 'ONCE_PER_SESSION':
      return !record || record.sessionId !== sessionId;
    default:
      return true;
  }
}

export async function recordAdView(adId: string): Promise<void> {
  const record = await readRecord(adId);
  const next: ViewRecord = {
    count: (record?.count ?? 0) + 1,
    lastSeenAt: new Date().toISOString(),
    sessionId,
  };
  await writeRecord(adId, next);
}
