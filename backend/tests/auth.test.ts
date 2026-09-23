import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { api, auth, createUser, extractCookie, resetDatabase } from './helpers.js';
import { prisma } from '../src/utils/prisma.js';

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('POST /api/auth/register', () => {
  it('creates an account, returns an access token and sets the refresh cookie', async () => {
    const res = await api()
      .post('/api/auth/register')
      .send({ email: 'New@Example.com', username: 'NewUser', password: 'Secret123', displayName: 'New User' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeTypeOf('string');
    expect(res.body.data.user.email).toBe('new@example.com');
    expect(res.body.data.user.username).toBe('newuser');
    expect(res.body.data.user.role).toBe('USER');
    expect(res.body.data.user.passwordHash).toBeUndefined();
    expect(extractCookie(res, 'gfg_refresh')).toMatch(/^gfg_refresh=.+/);
  });

  it('rejects invalid payloads with field errors', async () => {
    const res = await api().post('/api/auth/register').send({ email: 'nope', username: 'a', password: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    const paths = res.body.errors.map((e: { path: string }) => e.path);
    expect(paths).toEqual(expect.arrayContaining(['email', 'username', 'password']));
  });

  it('rejects duplicate email and username', async () => {
    await createUser('USER', { email: 'dup@example.com', username: 'dupuser' });
    const byEmail = await api().post('/api/auth/register').send({ email: 'dup@example.com', username: 'other', password: 'Secret123' });
    expect(byEmail.status).toBe(409);
    const byUsername = await api().post('/api/auth/register').send({ email: 'other@example.com', username: 'dupuser', password: 'Secret123' });
    expect(byUsername.status).toBe(409);
  });
});

describe('POST /api/auth/login', () => {
  it('signs in with email or username', async () => {
    const user = await createUser();
    const byEmail = await api().post('/api/auth/login').send({ emailOrUsername: user.email, password: user.password });
    expect(byEmail.status).toBe(200);
    const byUsername = await api().post('/api/auth/login').send({ emailOrUsername: user.username, password: user.password });
    expect(byUsername.status).toBe(200);
  });

  it('rejects wrong credentials without revealing which field failed', async () => {
    const user = await createUser();
    const res = await api().post('/api/auth/login').send({ emailOrUsername: user.email, password: 'WrongPass1' });
    expect(res.status).toBe(401);
    const unknown = await api().post('/api/auth/login').send({ emailOrUsername: 'ghost@example.com', password: 'WrongPass1' });
    expect(unknown.status).toBe(401);
    expect(unknown.body.message).toBe(res.body.message);
  });

  it('rejects deactivated accounts', async () => {
    const user = await createUser();
    await prisma.user.update({ where: { id: user.id }, data: { isActive: false } });
    const res = await api().post('/api/auth/login').send({ emailOrUsername: user.email, password: user.password });
    expect(res.status).toBe(403);
  });
});

describe('GET /api/auth/me', () => {
  it('requires a bearer token', async () => {
    const res = await api().get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns the current user', async () => {
    const user = await createUser('EDITOR');
    const res = await api().get('/api/auth/me').set(auth(user));
    expect(res.status).toBe(200);
    expect(res.body.data.user.id).toBe(user.id);
    expect(res.body.data.user.role).toBe('EDITOR');
  });

  it('rejects tampered tokens', async () => {
    const user = await createUser();
    const res = await api().get('/api/auth/me').set({ Authorization: `Bearer ${user.accessToken}x` });
    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/refresh', () => {
  it('rotates the refresh token and revokes the previous one', async () => {
    const user = await createUser();
    const first = await api().post('/api/auth/refresh').set('Cookie', user.refreshCookie);
    expect(first.status).toBe(200);
    expect(first.body.data.accessToken).toBeTypeOf('string');
    const rotated = extractCookie(first, 'gfg_refresh');
    expect(rotated).not.toBe(user.refreshCookie);

    // The old token is now revoked; reusing it revokes the whole family.
    const reuse = await api().post('/api/auth/refresh').set('Cookie', user.refreshCookie);
    expect(reuse.status).toBe(401);
    const afterReuse = await api().post('/api/auth/refresh').set('Cookie', rotated);
    expect(afterReuse.status).toBe(401);
  });

  it('fails without a cookie', async () => {
    const res = await api().post('/api/auth/refresh');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/logout', () => {
  it('revokes the refresh token and clears cookies', async () => {
    const user = await createUser();
    const res = await api().post('/api/auth/logout').set('Cookie', user.refreshCookie);
    expect(res.status).toBe(204);
    const again = await api().post('/api/auth/refresh').set('Cookie', user.refreshCookie);
    expect(again.status).toBe(401);
  });
});

describe('POST /api/auth/change-password', () => {
  it('changes the password and invalidates other sessions', async () => {
    const user = await createUser();
    const otherSession = await api().post('/api/auth/login').send({ emailOrUsername: user.email, password: user.password });
    const otherCookie = extractCookie(otherSession, 'gfg_refresh');

    const res = await api()
      .post('/api/auth/change-password')
      .set(auth(user))
      .set('Cookie', user.refreshCookie)
      .send({ currentPassword: user.password, newPassword: 'Brand-New-Pass9' });
    expect(res.status).toBe(204);

    const oldLogin = await api().post('/api/auth/login').send({ emailOrUsername: user.email, password: user.password });
    expect(oldLogin.status).toBe(401);
    const newLogin = await api().post('/api/auth/login').send({ emailOrUsername: user.email, password: 'Brand-New-Pass9' });
    expect(newLogin.status).toBe(200);

    const otherRefresh = await api().post('/api/auth/refresh').set('Cookie', otherCookie);
    expect(otherRefresh.status).toBe(401);
    const currentRefresh = await api().post('/api/auth/refresh').set('Cookie', user.refreshCookie);
    expect(currentRefresh.status).toBe(200);
  });

  it('rejects an incorrect current password', async () => {
    const user = await createUser();
    const res = await api().post('/api/auth/change-password').set(auth(user)).send({ currentPassword: 'nope1234', newPassword: 'Brand-New-Pass9' });
    expect(res.status).toBe(400);
  });
});

describe('Users', () => {
  it('updates the profile and rejects taken usernames', async () => {
    const user = await createUser();
    const other = await createUser();
    const ok = await api().patch('/api/users/me').set(auth(user)).send({ displayName: 'Renamed', bio: 'Hello', githubUrl: 'https://github.com/x' });
    expect(ok.status).toBe(200);
    expect(ok.body.data.user.profile.displayName).toBe('Renamed');
    const taken = await api().patch('/api/users/me').set(auth(user)).send({ username: other.username });
    expect(taken.status).toBe(409);
    const unknownField = await api().patch('/api/users/me').set(auth(user)).send({ role: 'ADMIN' });
    expect(unknownField.status).toBe(400);
  });

  it('exposes only public fields on the public profile', async () => {
    const user = await createUser();
    const res = await api().get(`/api/users/${user.username}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBeUndefined();
    expect(res.body.data.user.username).toBe(user.username);
    expect(res.body.data.user.stats.solved.total).toBe(0);
    const missing = await api().get('/api/users/does-not-exist');
    expect(missing.status).toBe(404);
  });
});
