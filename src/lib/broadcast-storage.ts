import * as SecureStore from 'expo-secure-store';

const DISMISSED_KEY = 'broadcast_dismissed_ids';
const SEEN_MODALS_KEY = 'broadcast_seen_modal_ids';

async function readIds(key: string): Promise<Set<string>> {
  try {
    const raw = await SecureStore.getItemAsync(key);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((item) => typeof item === 'string'));
  } catch {
    return new Set();
  }
}

async function writeIds(key: string, ids: Set<string>): Promise<void> {
  await SecureStore.setItemAsync(key, JSON.stringify([...ids]));
}

export async function getDismissedBroadcastIds(): Promise<Set<string>> {
  return readIds(DISMISSED_KEY);
}

export async function dismissBroadcast(id: string): Promise<void> {
  const ids = await getDismissedBroadcastIds();
  ids.add(id);
  await writeIds(DISMISSED_KEY, ids);
}

export async function getSeenModalBroadcastIds(): Promise<Set<string>> {
  return readIds(SEEN_MODALS_KEY);
}

export async function markModalBroadcastSeen(id: string): Promise<void> {
  const ids = await getSeenModalBroadcastIds();
  ids.add(id);
  await writeIds(SEEN_MODALS_KEY, ids);
}
