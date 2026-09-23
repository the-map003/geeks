import type { Role } from '@prisma/client';

export interface AuthUser {
  id: string;
  role: Role;
  username: string;
}

export const ROLE_RANK: Record<Role, number> = {
  USER: 0,
  EDITOR: 1,
  ADMIN: 2,
  SUPER_ADMIN: 3,
};

/** True when `role` is at least as privileged as `minimum`. */
export function hasRole(role: Role, minimum: Role): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}
