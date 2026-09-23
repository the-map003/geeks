import type { PrismaClient, Role, User } from '@prisma/client';
import bcrypt from 'bcryptjs';
import type { SeedUserKey } from './types.js';

export interface DemoAccount {
  key: SeedUserKey;
  email: string;
  username: string;
  password: string;
  role: Role;
  displayName: string;
  bio: string;
  institution: string;
  location: string;
  githubUrl?: string;
}

/** Development-only demo accounts. Documented in README. Never use in production. */
export const demoAccounts: DemoAccount[] = [
  {
    key: 'student',
    email: 'student@example.com',
    username: 'student',
    password: 'Student@123',
    role: 'USER',
    displayName: 'Asha Student',
    bio: 'Second-year CS student working through DSA one problem at a time.',
    institution: 'University of Kigali',
    location: 'Kigali, Rwanda',
    githubUrl: 'https://github.com/example-student',
  },
  {
    key: 'editor',
    email: 'editor@example.com',
    username: 'editor',
    password: 'Editor@123',
    role: 'EDITOR',
    displayName: 'Eli Editor',
    bio: 'Writes and reviews tutorials. Loves clean explanations and cleaner code.',
    institution: 'GeeksHub Content Team',
    location: 'Nairobi, Kenya',
  },
  {
    key: 'admin',
    email: 'admin@example.com',
    username: 'admin',
    password: 'Admin@123',
    role: 'ADMIN',
    displayName: 'Ada Admin',
    bio: 'Keeps the platform running and the content published.',
    institution: 'GeeksHub',
    location: 'Remote',
  },
  {
    key: 'superadmin',
    email: 'superadmin@example.com',
    username: 'superadmin',
    password: 'SuperAdmin@123',
    role: 'SUPER_ADMIN',
    displayName: 'Sam Root',
    bio: 'System owner.',
    institution: 'GeeksHub',
    location: 'Remote',
  },
  {
    key: 'learner2',
    email: 'dev.kumar@example.com',
    username: 'devkumar',
    password: 'Learner@123',
    role: 'USER',
    displayName: 'Dev Kumar',
    bio: 'Backend developer brushing up on system design.',
    institution: 'Self-taught',
    location: 'Pune, India',
  },
  {
    key: 'learner3',
    email: 'mira.o@example.com',
    username: 'mira',
    password: 'Learner@123',
    role: 'USER',
    displayName: 'Mira Okafor',
    bio: 'Data science enthusiast and Python fan.',
    institution: 'Lagos Tech Institute',
    location: 'Lagos, Nigeria',
  },
];

export type UserMap = Record<SeedUserKey, User>;

export async function seedUsers(prisma: PrismaClient): Promise<UserMap> {
  const map: Partial<UserMap> = {};
  for (const account of demoAccounts) {
    const passwordHash = await bcrypt.hash(account.password, 10);
    const user = await prisma.user.create({
      data: {
        email: account.email,
        username: account.username,
        passwordHash,
        role: account.role,
        lastLoginAt: new Date(),
        profile: {
          create: {
            displayName: account.displayName,
            bio: account.bio,
            institution: account.institution,
            location: account.location,
            githubUrl: account.githubUrl,
          },
        },
      },
    });
    map[account.key] = user;
  }
  return map as UserMap;
}
