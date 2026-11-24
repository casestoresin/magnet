// Simple fixed-credential admin session.
// Uses Web Crypto so it works in both middleware (Edge) and API routes (Node).

export const COOKIE = 'magnet_admin';
export const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

const enc = new TextEncoder();

function secret() {
  return process.env.AUTH_SECRET || '';
}

const toHex = (buf) => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');

async function hmac(data) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret()), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return toHex(await crypto.subtle.sign('HMAC', key, enc.encode(data)));
}

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function authConfigured() {
  return !!(process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD && secret());
}

export async function checkCredentials(username, password) {
  if (!authConfigured()) return false;
  // Compare HMACs so timing doesn't leak the length/content of the real values
  const [u1, u2, p1, p2] = await Promise.all([
    hmac(`u:${username || ''}`),
    hmac(`u:${process.env.ADMIN_USERNAME}`),
    hmac(`p:${password || ''}`),
    hmac(`p:${process.env.ADMIN_PASSWORD}`),
  ]);
  return safeEqual(u1, u2) & safeEqual(p1, p2) ? true : false;
}

export async function createToken() {
  const exp = Date.now() + MAX_AGE * 1000;
  const payload = `admin.${exp}`;
  return `${payload}.${await hmac(payload)}`;
}

export async function verifyToken(token) {
  if (!token || !secret()) return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [who, exp, sig] = parts;
  if (!(Number(exp) > Date.now())) return false;
  return safeEqual(sig, await hmac(`${who}.${exp}`));
}
