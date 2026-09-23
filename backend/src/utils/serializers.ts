import type { Profile, User } from '@prisma/client';

export type UserWithProfile = User & { profile: Profile | null };

export interface PublicProfile {
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  institution: string | null;
  location: string | null;
  websiteUrl: string | null;
  githubUrl: string | null;
  linkedinUrl: string | null;
}

/** Shape returned to the authenticated owner. Never includes the password hash. */
export function toAuthUser(user: UserWithProfile) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
    profile: toProfile(user.profile, user.username),
  };
}

/** Shape safe to show to anyone. */
export function toPublicUser(user: UserWithProfile) {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    createdAt: user.createdAt,
    profile: toProfile(user.profile, user.username),
  };
}

/** Minimal author card used inside content payloads. */
export function toAuthorSummary(user: { id: string; username: string; profile: Pick<Profile, 'displayName' | 'avatarUrl'> | null }) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.profile?.displayName ?? user.username,
    avatarUrl: user.profile?.avatarUrl ?? null,
  };
}

export const authorSelect = {
  id: true,
  username: true,
  profile: { select: { displayName: true, avatarUrl: true } },
} as const;

function toProfile(profile: Profile | null, fallbackName: string): PublicProfile {
  return {
    displayName: profile?.displayName ?? fallbackName,
    bio: profile?.bio ?? null,
    avatarUrl: profile?.avatarUrl ?? null,
    institution: profile?.institution ?? null,
    location: profile?.location ?? null,
    websiteUrl: profile?.websiteUrl ?? null,
    githubUrl: profile?.githubUrl ?? null,
    linkedinUrl: profile?.linkedinUrl ?? null,
  };
}
