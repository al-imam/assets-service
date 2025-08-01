export function createSecretKey(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}
