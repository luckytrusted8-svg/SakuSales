/**
 * Web Crypto API PBKDF2 PIN Hashing and Salt Generator
 * Safe, modern cryptographic implementation with zero external dependencies.
 */

const PBKDF2_ITERATIONS = 100_000;
const HASH_ALGORITHM = 'SHA-256';
const KEY_LENGTH_BITS = 256;

/**
 * Generate cryptographically secure random salt hex string (16 bytes = 32 hex chars)
 */
export function generateSalt(byteLength: number = 16): string {
  const array = new Uint8Array(byteLength);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Hash a 4-6 digit numeric PIN using PBKDF2 with SHA-256 and salt
 */
export async function hashPin(pin: string, saltHex: string): Promise<string> {
  const enc = new TextEncoder();
  const pinBuffer = enc.encode(pin);

  // Convert salt hex to Uint8Array
  const saltBuffer = new Uint8Array(
    saltHex.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
  );

  const baseKey = await crypto.subtle.importKey(
    'raw',
    pinBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: HASH_ALGORITHM,
    },
    baseKey,
    KEY_LENGTH_BITS
  );

  const derivedBytes = new Uint8Array(derivedBits);
  return Array.from(derivedBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Verify if provided PIN matches stored salt and hash
 */
export async function verifyPin(pin: string, saltHex: string, expectedHash: string): Promise<boolean> {
  if (!pin || !saltHex || !expectedHash) return false;
  try {
    const computedHash = await hashPin(pin, saltHex);
    // Constant-time like comparison
    if (computedHash.length !== expectedHash.length) return false;
    let match = true;
    for (let i = 0; i < computedHash.length; i++) {
      if (computedHash[i] !== expectedHash[i]) {
        match = false;
      }
    }
    return match;
  } catch (err) {
    console.error('PIN verification error:', err);
    return false;
  }
}
