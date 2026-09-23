import bcrypt from 'bcryptjs';
import { prisma } from '../../utils/prisma.js';
import { ApiError } from '../../utils/errors.js';
import {
  generateRefreshToken,
  hashToken,
  newFamilyId,
  refreshExpiryDate,
  signAccessToken,
} from '../../utils/tokens.js';
import { toAuthUser, type UserWithProfile } from '../../utils/serializers.js';
import type { ChangePasswordInput, LoginInput, RegisterInput } from './auth.schemas.js';

const BCRYPT_ROUNDS = 12;

export interface SessionMeta {
  userAgent?: string;
  ip?: string;
}

export interface AuthResult {
  user: ReturnType<typeof toAuthUser>;
  accessToken: string;
  refreshToken: string;
}

async function issueSession(user: UserWithProfile, meta: SessionMeta, familyId = newFamilyId()): Promise<AuthResult> {
  const { raw, hash } = generateRefreshToken();
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hash,
      familyId,
      expiresAt: refreshExpiryDate(),
      userAgent: meta.userAgent?.slice(0, 255),
      ip: meta.ip,
    },
  });
  const accessToken = signAccessToken({ id: user.id, role: user.role, username: user.username });
  return { user: toAuthUser(user), accessToken, refreshToken: raw };
}

export async function register(input: RegisterInput, meta: SessionMeta): Promise<AuthResult> {
  const registrationSetting = await prisma.siteSetting.findUnique({ where: { key: 'features.registration' } });
  if (registrationSetting && registrationSetting.value === false) {
    throw ApiError.forbidden('Registration is currently disabled');
  }

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: input.email }, { username: input.username }] },
    select: { email: true, username: true },
  });
  if (existing) {
    if (existing.email === input.email) throw ApiError.conflict('An account with this email already exists');
    throw ApiError.conflict('This username is already taken');
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  const user = await prisma.user.create({
    data: {
      email: input.email,
      username: input.username,
      passwordHash,
      lastLoginAt: new Date(),
      profile: { create: { displayName: input.displayName ?? input.username } },
    },
    include: { profile: true },
  });
  return issueSession(user, meta);
}

export async function login(input: LoginInput, meta: SessionMeta): Promise<AuthResult> {
  const identifier = input.emailOrUsername.toLowerCase();
  const user = await prisma.user.findFirst({
    where: { OR: [{ email: identifier }, { username: identifier }] },
    include: { profile: true },
  });
  // Constant-ish time: compare against a dummy hash when the user is missing.
  const hashToCompare = user?.passwordHash ?? '$2a$12$C6UzMDM.H6dfI/f/IKcEeO5nWQ3WhOI2ZVQ3nQ1o2p1a1r1o3oHm.';
  const valid = await bcrypt.compare(input.password, hashToCompare);
  if (!user || !valid) throw ApiError.unauthorized('Invalid email/username or password');
  if (!user.isActive) throw ApiError.forbidden('This account has been deactivated');

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  return issueSession(user, meta);
}

export async function refresh(rawToken: string | undefined, meta: SessionMeta): Promise<AuthResult> {
  if (!rawToken) throw ApiError.unauthorized('No refresh token');
  const tokenHash = hashToken(rawToken);
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: { include: { profile: true } } },
  });
  if (!stored) throw ApiError.unauthorized('Invalid refresh token');

  if (stored.revokedAt) {
    // Reuse of a rotated token indicates theft: revoke the whole family.
    await prisma.refreshToken.updateMany({
      where: { familyId: stored.familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw ApiError.unauthorized('Refresh token reuse detected; please sign in again');
  }
  if (stored.expiresAt < new Date()) throw ApiError.unauthorized('Refresh token expired');
  if (!stored.user.isActive) throw ApiError.forbidden('This account has been deactivated');

  await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
  return issueSession(stored.user, meta, stored.familyId);
}

export async function logout(rawToken: string | undefined): Promise<void> {
  if (!rawToken) return;
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashToken(rawToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function logoutAll(userId: string): Promise<void> {
  await prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { profile: true } });
  if (!user || !user.isActive) throw ApiError.unauthorized('Account not found or deactivated');
  return toAuthUser(user);
}

export async function changePassword(userId: string, input: ChangePasswordInput, keepTokenHash?: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw ApiError.unauthorized();
  const valid = await bcrypt.compare(input.currentPassword, user.passwordHash);
  if (!valid) throw ApiError.badRequest('Current password is incorrect', [{ path: 'currentPassword', message: 'Incorrect password' }]);

  const passwordHash = await bcrypt.hash(input.newPassword, BCRYPT_ROUNDS);
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
    // Sign out every other session.
    prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null, ...(keepTokenHash ? { NOT: { tokenHash: keepTokenHash } } : {}) },
      data: { revokedAt: new Date() },
    }),
  ]);
}

/** Housekeeping: delete expired/revoked tokens older than 7 days. */
export async function pruneRefreshTokens(): Promise<number> {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const result = await prisma.refreshToken.deleteMany({
    where: { OR: [{ expiresAt: { lt: new Date() } }, { revokedAt: { lt: cutoff } }] },
  });
  return result.count;
}
