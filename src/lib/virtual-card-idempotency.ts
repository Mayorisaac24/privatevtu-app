import * as Crypto from 'expo-crypto';

/** Client idempotency key for create/fund — backend dedupes wallet debits. */
export async function newVirtualCardIdempotencyKey(prefix: string): Promise<string> {
  const id = await Crypto.randomUUID();
  return `${prefix}-${id}`;
}
