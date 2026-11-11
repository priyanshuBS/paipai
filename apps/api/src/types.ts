import type { Database } from '@paipai/db';
import type { Auth, AuthSession, AuthUser } from './auth';
import type { Env } from './env';
import type { Notifier } from './lib/notifier';
import type { StorageProvider } from './lib/storage';

export interface AppDeps {
  env: Env;
  db: Database;
  auth: Auth;
  notifier: Notifier;
  storage: StorageProvider | null;
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
