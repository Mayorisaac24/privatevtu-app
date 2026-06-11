import * as SecureStore from 'expo-secure-store';

const DEVICE_ID_KEY = 'pvtu_device_id';

function createDeviceId(): string {
  return `dev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

export async function getStableDeviceId(): Promise<string> {
  const existing = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  if (existing) return existing;

  const id = createDeviceId();
  await SecureStore.setItemAsync(DEVICE_ID_KEY, id);
  return id;
}
