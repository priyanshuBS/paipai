import type { Database } from '@paipai/db';
import type { Auth, AuthSession, AuthUser } from './auth';
import type { Env } from './env';

export interface AppDeps {
  env: Env;
  db: Database;
  auth: Auth;
}

export interface AppEnv {
  Variables: {
    deps: AppDeps;
    requestId: string;
    user: AuthUser;
    session: AuthSession['session'];
  };
}

/** Minimal per-request user context passed into services. */
export interface UserCtx {
  userId: string;
  timezone: string;
}
