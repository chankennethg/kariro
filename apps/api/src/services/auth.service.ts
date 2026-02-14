import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { sign, verify } from 'hono/jwt';
import { eq, and, gt, lt, asc } from 'drizzle-orm';
import { db } from '@/db/index.js';
import { users, refreshTokens } from '@/db/schema/tables.js';
import { AppError } from '@/middleware/error.js';
import { env } from '@/lib/env.js';

const ACCESS_TOKEN_EXPIRY_SECONDS = 15 * 60; // 15 minutes
const REFRESH_TOKEN_EXPIRY_DAYS = 30;
const BCRYPT_ROUNDS = 10;
const MAX_REFRESH_TOKENS_PER_USER = 10;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function createAccessToken(userId: string, email: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return sign(
    { sub: userId, email, iat: now, exp: now + ACCESS_TOKEN_EXPIRY_SECONDS },
    env.JWT_SECRET,
    'HS256',
  );
}

export async function verifyAccessToken(token: string): Promise<{ sub: string; email: string }> {
  try {
    const payload = await verify(token, env.JWT_SECRET, 'HS256');
    return { sub: payload.sub as string, email: payload.email as string };
  } catch {
    throw new AppError(401, 'INVALID_TOKEN', 'Invalid or expired access token');
  }
}

/** Create a refresh token for a user, enforcing the per-user limit. */
async function createRefreshTokenForUser(userId: string): Promise<string> {
  const refreshToken = generateRefreshToken();
  const tokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  await db.insert(refreshTokens).values({ userId, tokenHash, expiresAt });

  // Enforce per-user token limit — delete oldest tokens beyond the cap
  const userTokens = await db
    .select({ id: refreshTokens.id })
    .from(refreshTokens)
    .where(eq(refreshTokens.userId, userId))
    .orderBy(asc(refreshTokens.createdAt));

  if (userTokens.length > MAX_REFRESH_TOKENS_PER_USER) {
    const tokensToRemove = userTokens.slice(0, userTokens.length - MAX_REFRESH_TOKENS_PER_USER);
    for (const t of tokensToRemove) {
      await db.delete(refreshTokens).where(eq(refreshTokens.id, t.id));
    }
  }

  return refreshToken;
}

export async function registerUser(email: string, password: string, name: string) {
  const passwordHash = await hashPassword(password);

  let user: { id: string; email: string; name: string; createdAt: Date };
  try {
    const [inserted] = await db
      .insert(users)
      .values({ email, name, passwordHash })
      .returning({ id: users.id, email: users.email, name: users.name, createdAt: users.createdAt });
    user = inserted;
  } catch (err: unknown) {
    // Postgres unique_violation (23505) — race-safe duplicate email detection
    if (isUniqueViolation(err)) {
      throw new AppError(409, 'EMAIL_EXISTS', 'A user with this email already exists');
    }
    throw err;
  }

  const accessToken = await createAccessToken(user.id, user.email);
  const refreshToken = await createRefreshTokenForUser(user.id);

  return {
    user: { ...user, createdAt: user.createdAt.toISOString() },
    tokens: { accessToken, refreshToken, expiresIn: ACCESS_TOKEN_EXPIRY_SECONDS },
  };
}

export async function loginUser(email: string, password: string) {
  const [user] = await db
    .select({ id: users.id, email: users.email, name: users.name, passwordHash: users.passwordHash, createdAt: users.createdAt })
    .from(users)
    .where(eq(users.email, email));

  if (!user) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  const accessToken = await createAccessToken(user.id, user.email);
  const refreshToken = await createRefreshTokenForUser(user.id);

  return {
    user: { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt.toISOString() },
    tokens: { accessToken, refreshToken, expiresIn: ACCESS_TOKEN_EXPIRY_SECONDS },
  };
}

export async function refreshAccessToken(oldRefreshToken: string) {
  const tokenHash = hashToken(oldRefreshToken);

  // Atomic delete-and-return: prevents race condition where two concurrent
  // requests could both read the same token before either deletes it.
  const [stored] = await db
    .delete(refreshTokens)
    .where(and(eq(refreshTokens.tokenHash, tokenHash), gt(refreshTokens.expiresAt, new Date())))
    .returning({ id: refreshTokens.id, userId: refreshTokens.userId });

  if (!stored) {
    throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Invalid or expired refresh token');
  }

  const [user] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.id, stored.userId));

  if (!user) {
    throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Invalid or expired refresh token');
  }

  const accessToken = await createAccessToken(user.id, user.email);
  const refreshToken = await createRefreshTokenForUser(user.id);

  return { accessToken, refreshToken, expiresIn: ACCESS_TOKEN_EXPIRY_SECONDS };
}

export async function logoutUser(userId: string, refreshToken: string) {
  const tokenHash = hashToken(refreshToken);
  await db.delete(refreshTokens).where(
    and(eq(refreshTokens.tokenHash, tokenHash), eq(refreshTokens.userId, userId)),
  );
}

export async function getCurrentUser(userId: string) {
  const [user] = await db
    .select({ id: users.id, email: users.email, name: users.name, createdAt: users.createdAt })
    .from(users)
    .where(eq(users.id, userId));

  if (!user) {
    throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
  }

  return { ...user, createdAt: user.createdAt.toISOString() };
}

/** Remove expired refresh tokens from the database. */
export async function cleanupExpiredTokens() {
  await db.delete(refreshTokens).where(lt(refreshTokens.expiresAt, new Date()));
}

function isUniqueViolation(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  // Direct postgres error (has .code on the error itself)
  if ('code' in err && (err as { code: string }).code === '23505') return true;
  // Drizzle-wrapped error (postgres error is on .cause)
  if ('cause' in err) {
    const cause = (err as { cause: unknown }).cause;
    if (typeof cause === 'object' && cause !== null && 'code' in cause) {
      return (cause as { code: string }).code === '23505';
    }
  }
  return false;
}
