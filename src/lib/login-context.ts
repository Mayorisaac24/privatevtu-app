import { getStableDeviceId } from './device-id';

export async function getLoginDeviceId(): Promise<string> {
  return getStableDeviceId();
}
