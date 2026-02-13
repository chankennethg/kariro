import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '@/middleware/error.js';

// Mock bcryptjs
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('$2a$10$hashedpassword'),
    compare: vi.fn(),
  },
}));

// Mock hono/jwt
vi.mock('hono/jwt', () => ({
  sign: vi.fn().mockResolvedValue('mock-access-token'),
  verify: vi.fn(),
}));

// Mock db — chain-style mock supporting multiple Drizzle patterns:
//   select().from().where()              — direct await
//   select().from().where().orderBy()    — token limit check
//   insert().values()                    — bare await (thenable)
//   insert().values().returning()        — insert with return
//   delete().where()                     — simple delete
//   delete().where().returning()         — atomic delete (refresh rotation)
vi.mock('@/db/index.js', () => {
  const mockReturning = vi.fn();
  const mockOrderBy = vi.fn();
  const mockDeleteReturning = vi.fn();
  const mockDeleteWhere = vi.fn();

  // values() is thenable (for bare await) and has .returning() (for insert...returning)
  const mockValues = vi.fn(() => ({
    returning: mockReturning,
    then(resolve: (v?: unknown) => void) { resolve(); },
  }));

  // where() is set up per-test via mockReturnValueOnce/mockResolvedValueOnce
  const mockWhere = vi.fn();

  const mockFrom = vi.fn(() => ({ where: mockWhere }));
  const mockSelect = vi.fn(() => ({ from: mockFrom }));
  const mockInsert = vi.fn(() => ({ values: mockValues }));
  const mockDeleteFn = vi.fn(() => ({ where: mockDeleteWhere }));

  return {
    db: {
      select: mockSelect,
      insert: mockInsert,
      delete: mockDeleteFn,
      _mockReturning: mockReturning,
      _mockFrom: mockFrom,
      _mockWhere: mockWhere,
      _mockOrderBy: mockOrderBy,
      _mockValues: mockValues,
      _mockSelect: mockSelect,
      _mockDeleteFn: mockDeleteFn,
      _mockDeleteWhere: mockDeleteWhere,
      _mockDeleteReturning: mockDeleteReturning,
    },
  };
});

// Mock schema tables
vi.mock('@/db/schema/tables.js', () => ({
  users: { id: 'id', email: 'email', name: 'name', passwordHash: 'password_hash', createdAt: 'created_at' },
  refreshTokens: { id: 'id', userId: 'user_id', tokenHash: 'token_hash', expiresAt: 'expires_at', createdAt: 'created_at' },
}));

// Import after mocking
const bcrypt = (await import('bcryptjs')).default;
const { verify } = await import('hono/jwt');
const { db } = await import('@/db/index.js');
const {
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
  getCurrentUser,
  verifyAccessToken,
  cleanupExpiredTokens,
} = await import('./auth.service.js');

const mockDb = db as typeof db & {
  _mockReturning: ReturnType<typeof vi.fn>;
  _mockFrom: ReturnType<typeof vi.fn>;
  _mockWhere: ReturnType<typeof vi.fn>;
  _mockOrderBy: ReturnType<typeof vi.fn>;
  _mockValues: ReturnType<typeof vi.fn>;
  _mockSelect: ReturnType<typeof vi.fn>;
  _mockDeleteFn: ReturnType<typeof vi.fn>;
  _mockDeleteWhere: ReturnType<typeof vi.fn>;
  _mockDeleteReturning: ReturnType<typeof vi.fn>;
};

/** Helper: set up mockWhere for a .where().orderBy() chain (token limit check). */
function setupWhereOrderBy(data: unknown[]) {
  mockDb._mockOrderBy.mockResolvedValueOnce(data);
  mockDb._mockWhere.mockReturnValueOnce({ orderBy: mockDb._mockOrderBy });
}

/** Helper: set up mockDeleteWhere for a .where().returning() chain (atomic delete). */
function setupDeleteReturning(data: unknown[]) {
  mockDb._mockDeleteReturning.mockResolvedValueOnce(data);
  mockDb._mockDeleteWhere.mockReturnValueOnce({ returning: mockDb._mockDeleteReturning });
}

describe('Auth Service', () => {
  const userId = '550e8400-e29b-41d4-a716-446655440000';
  const email = 'test@example.com';
  const password = 'password123';
  const name = 'Test User';
  const now = new Date();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('registerUser', () => {
    it('creates user and refresh token, returns data', async () => {
      // 1. Insert user → returning
      mockDb._mockReturning.mockResolvedValueOnce([{ id: userId, email, name, createdAt: now }]);
      // 2. Insert refresh token → bare await on values() (handled by thenable)
      // 3. Token limit check: select().from().where().orderBy()
      setupWhereOrderBy([{ id: 'rt-1' }]);

      const result = await registerUser(email, password, name);

      expect(result.user.id).toBe(userId);
      expect(result.user.email).toBe(email);
      expect(result.tokens.accessToken).toBe('mock-access-token');
      expect(result.tokens.refreshToken).toBeDefined();
      expect(result.tokens.expiresIn).toBe(900);
    });

    it('throws 409 on duplicate email via unique constraint', async () => {
      const pgError = new Error('duplicate key value');
      (pgError as unknown as { code: string }).code = '23505';
      mockDb._mockReturning.mockRejectedValueOnce(pgError);

      await expect(registerUser(email, password, name)).rejects.toThrow(AppError);
      await expect(registerUser(email, password, name).catch((e) => {
        expect((e as AppError).statusCode).toBe(409);
        expect((e as AppError).errorCode).toBe('EMAIL_EXISTS');
        throw e;
      })).rejects.toThrow();
    });

    it('re-throws non-unique-violation errors', async () => {
      mockDb._mockReturning.mockRejectedValueOnce(new Error('connection lost'));

      await expect(registerUser(email, password, name)).rejects.toThrow('connection lost');
    });
  });

  describe('loginUser', () => {
    it('returns tokens for valid credentials', async () => {
      // 1. Find user: select().from().where()
      mockDb._mockWhere.mockResolvedValueOnce([
        { id: userId, email, name, passwordHash: '$2a$10$hashedpassword', createdAt: now },
      ]);
      vi.mocked(bcrypt.compare).mockResolvedValueOnce(true as never);
      // 2. Insert refresh token → bare await
      // 3. Token limit check
      setupWhereOrderBy([{ id: 'rt-1' }]);

      const result = await loginUser(email, password);

      expect(result.user.id).toBe(userId);
      expect(result.tokens.accessToken).toBe('mock-access-token');
    });

    it('throws 401 on wrong password', async () => {
      mockDb._mockWhere.mockResolvedValueOnce([
        { id: userId, email, name, passwordHash: '$2a$10$hashedpassword', createdAt: now },
      ]);
      vi.mocked(bcrypt.compare).mockResolvedValueOnce(false as never);

      await expect(loginUser(email, 'wrong')).rejects.toThrow(AppError);
    });

    it('throws 401 on unknown email', async () => {
      mockDb._mockWhere.mockResolvedValueOnce([]);

      await expect(loginUser('unknown@example.com', password)).rejects.toThrow(AppError);
    });
  });

  describe('refreshAccessToken', () => {
    it('atomically rotates token and returns new access + refresh tokens', async () => {
      // 1. Atomic delete old token: delete().where().returning()
      setupDeleteReturning([{ id: 'rt-id', userId }]);
      // 2. Find user: select().from().where()
      mockDb._mockWhere.mockResolvedValueOnce([{ id: userId, email }]);
      // 3. Insert new refresh token → bare await
      // 4. Token limit check
      setupWhereOrderBy([{ id: 'rt-new' }]);

      const result = await refreshAccessToken('some-refresh-token');

      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBeDefined();
      expect(result.expiresIn).toBe(900);
      expect(db.delete).toHaveBeenCalled();
    });

    it('throws 401 on invalid/expired token', async () => {
      // Atomic delete returns empty — token not found
      setupDeleteReturning([]);

      await expect(refreshAccessToken('bad-token')).rejects.toThrow(AppError);
    });
  });

  describe('logoutUser', () => {
    it('deletes the refresh token row for the given user', async () => {
      mockDb._mockDeleteWhere.mockResolvedValueOnce(undefined);

      await logoutUser(userId, 'some-refresh-token');
      expect(db.delete).toHaveBeenCalled();
    });
  });

  describe('getCurrentUser', () => {
    it('returns user profile', async () => {
      mockDb._mockWhere.mockResolvedValueOnce([{ id: userId, email, name, createdAt: now }]);

      const result = await getCurrentUser(userId);

      expect(result.id).toBe(userId);
      expect(result.email).toBe(email);
      expect(result.createdAt).toBe(now.toISOString());
    });

    it('throws 404 for missing user', async () => {
      mockDb._mockWhere.mockResolvedValueOnce([]);

      await expect(getCurrentUser(userId)).rejects.toThrow(AppError);
    });
  });

  describe('verifyAccessToken', () => {
    it('returns payload for valid token', async () => {
      vi.mocked(verify).mockResolvedValueOnce({ sub: userId, email } as never);

      const result = await verifyAccessToken('valid-token');

      expect(result.sub).toBe(userId);
      expect(result.email).toBe(email);
    });

    it('throws 401 for invalid token', async () => {
      vi.mocked(verify).mockRejectedValueOnce(new Error('invalid'));

      await expect(verifyAccessToken('bad-token')).rejects.toThrow(AppError);
    });
  });

  describe('cleanupExpiredTokens', () => {
    it('deletes expired tokens', async () => {
      mockDb._mockDeleteWhere.mockResolvedValueOnce(undefined);

      await cleanupExpiredTokens();
      expect(db.delete).toHaveBeenCalled();
    });
  });
});
