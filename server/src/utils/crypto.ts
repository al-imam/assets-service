export function createSecretKey(...secrets: (string | undefined | null)[]): Uint8Array {
  return new TextEncoder().encode(secrets.filter(Boolean).join("~!~"));
}
