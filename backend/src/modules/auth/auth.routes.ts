import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { authLimiter } from '../../middleware/rateLimit.js';
import { changePasswordSchema, loginSchema, registerSchema } from './auth.schemas.js';
import * as controller from './auth.controller.js';

export const authRouter = Router();

authRouter.post('/register', authLimiter, validate(registerSchema), controller.register);
authRouter.post('/login', authLimiter, validate(loginSchema), controller.login);
authRouter.post('/refresh', controller.refresh);
authRouter.post('/logout', controller.logout);
authRouter.post('/logout-all', requireAuth, controller.logoutAll);
authRouter.get('/me', requireAuth, controller.me);
authRouter.post('/change-password', requireAuth, validate(changePasswordSchema), controller.changePassword);
