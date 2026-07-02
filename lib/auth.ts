import { createHash, randomBytes } from "crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "./db";
import { ALL_PERMISSIONS } from "./permissions";

/**
 * The auth Data Access Layer: DB-backed sessions plus permission checks.
 * Secure checks live here, next to the data; the proxy only does the
 * optimistic "no cookie → go log in" redirect.
 */

export const SESSION_COOKIE = "nexora_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export type AuthUser = {
  id: number;
  sub: string | null;
  email: string;
  name: string;
};

export type Session = {
  user: AuthUser;
  permissions: Set<string>;
  /** True when NEXORA_AUTH_DISABLED=1 — a synthetic all-access session. */
  synthetic: boolean;
};

export function isAuthDisabled(): boolean {
  return process.env.NEXORA_AUTH_DISABLED === "1";
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function loadPermissions(userId: number): Set<string> {
  const rows = getDb()
    .prepare(
      `SELECT DISTINCT rp.permission FROM role_permissions rp
       JOIN user_roles ur ON ur.role_id = rp.role_id
       WHERE ur.user_id = ?`
    )
    .all(userId) as { permission: string }[];
  return new Set(rows.map((r) => r.permission));
}

/**
 * The session for the current request, or null. Cached per request so the
 * layout, page and any actions share one lookup.
 */
export const getSession = cache(async (): Promise<Session | null> => {
  if (isAuthDisabled()) {
    return {
      user: { id: 0, sub: null, email: "auth-disabled", name: "Auth disabled" },
      permissions: new Set([ALL_PERMISSIONS]),
      synthetic: true,
    };
  }
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const db = getDb();
  const row = db
    .prepare(
      `SELECT s.expires_at, u.id, u.sub, u.email, u.name
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ?`
    )
    .get(hashToken(token)) as
    | { expires_at: string; id: number; sub: string | null; email: string; name: string }
    | undefined;
  if (!row) return null;
  if (row.expires_at <= new Date().toISOString()) {
    db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashToken(token));
    return null;
  }
  return {
    user: { id: row.id, sub: row.sub, email: row.email, name: row.name },
    permissions: loadPermissions(row.id),
    synthetic: false,
  };
});

export function hasPermission(session: Session, permission: string): boolean {
  return (
    session.permissions.has(ALL_PERMISSIONS) ||
    session.permissions.has(permission)
  );
}

/**
 * Guard for pages and Server Actions: redirects to /login without a session
 * and to /denied without the permission. Returns the session otherwise.
 */
export async function requirePermission(permission: string): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasPermission(session, permission)) redirect("/denied");
  return session;
}

/** Guard for pages/actions that only need a signed-in user. */
export async function requireUser(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

/**
 * Guard for API route handlers: returns the session, or an HTTP status to
 * respond with (401 no/invalid session, 403 missing permission).
 */
export async function checkApiPermission(
  permission: string
): Promise<{ session: Session } | { status: 401 | 403 }> {
  const session = await getSession();
  if (!session) return { status: 401 };
  if (!hasPermission(session, permission)) return { status: 403 };
  return { session };
}

/** Create a DB session and set its cookie. Call from a Server Action or Route Handler. */
export async function createSession(
  userId: number,
  idToken: string
): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
  const db = getDb();
  db.prepare(
    "INSERT INTO sessions (token_hash, user_id, id_token, expires_at) VALUES (?, ?, ?, ?)"
  ).run(hashToken(token), userId, idToken, expiresAt.toISOString());
  // Opportunistic cleanup so the table doesn't accumulate dead sessions.
  db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(
    new Date().toISOString()
  );
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: (process.env.NEXORA_APP_URL ?? "").startsWith("https://"),
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

/**
 * Destroy the current session. Returns the id_token that was stored with it
 * (for OIDC RP-initiated logout), if any.
 */
export async function destroySession(): Promise<string> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  let idToken = "";
  if (token) {
    const db = getDb();
    const row = db
      .prepare("SELECT id_token FROM sessions WHERE token_hash = ?")
      .get(hashToken(token)) as { id_token: string } | undefined;
    idToken = row?.id_token ?? "";
    db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashToken(token));
  }
  store.delete(SESSION_COOKIE);
  return idToken;
}

/**
 * Find-or-create the user for a completed OIDC login. Matches by OIDC subject
 * first, then by email (linking the subject — this is how a pre-provisioned
 * bootstrap admin picks up their account on first login).
 */
export function upsertOidcUser(claims: {
  sub: string;
  email: string;
  name: string;
}): AuthUser {
  const db = getDb();
  const now = new Date().toISOString();
  const bySub = db
    .prepare("SELECT id, sub, email, name FROM users WHERE sub = ?")
    .get(claims.sub) as AuthUser | undefined;
  if (bySub) {
    db.prepare(
      "UPDATE users SET email = ?, name = ?, last_login_at = ? WHERE id = ?"
    ).run(claims.email, claims.name, now, bySub.id);
    return { ...bySub, email: claims.email, name: claims.name };
  }
  const byEmail = db
    .prepare(
      "SELECT id, sub, email, name FROM users WHERE email = ? COLLATE NOCASE AND sub IS NULL"
    )
    .get(claims.email) as AuthUser | undefined;
  if (byEmail) {
    db.prepare(
      "UPDATE users SET sub = ?, name = ?, last_login_at = ? WHERE id = ?"
    ).run(claims.sub, claims.name, now, byEmail.id);
    return { ...byEmail, sub: claims.sub, name: claims.name };
  }
  const id = Number(
    db
      .prepare(
        "INSERT INTO users (sub, email, name, last_login_at) VALUES (?, ?, ?, ?)"
      )
      .run(claims.sub, claims.email, claims.name, now).lastInsertRowid
  );
  return { id, sub: claims.sub, email: claims.email, name: claims.name };
}

// --- Queries for the access-management GUI ---

export type UserWithRoles = AuthUser & {
  last_login_at: string;
  roles: { id: number; name: string }[];
};

export type RoleWithPermissions = {
  id: number;
  name: string;
  description: string;
  built_in: number;
  permissions: string[];
  memberCount: number;
};

export function listUsersWithRoles(): UserWithRoles[] {
  const db = getDb();
  const users = db
    .prepare(
      "SELECT id, sub, email, name, last_login_at FROM users ORDER BY email COLLATE NOCASE"
    )
    .all() as (AuthUser & { last_login_at: string })[];
  const roleRows = db
    .prepare(
      `SELECT ur.user_id, r.id, r.name FROM user_roles ur
       JOIN roles r ON r.id = ur.role_id ORDER BY r.name`
    )
    .all() as { user_id: number; id: number; name: string }[];
  return users.map((u) => ({
    ...u,
    roles: roleRows
      .filter((r) => r.user_id === u.id)
      .map((r) => ({ id: r.id, name: r.name })),
  }));
}

export function listRolesWithPermissions(): RoleWithPermissions[] {
  const db = getDb();
  const roles = db
    .prepare(
      `SELECT r.id, r.name, r.description, r.built_in,
        (SELECT COUNT(*) FROM user_roles ur WHERE ur.role_id = r.id) AS memberCount
       FROM roles r ORDER BY r.built_in DESC, r.name COLLATE NOCASE`
    )
    .all() as (Omit<RoleWithPermissions, "permissions">)[];
  const perms = db
    .prepare("SELECT role_id, permission FROM role_permissions")
    .all() as { role_id: number; permission: string }[];
  return roles.map((r) => ({
    ...r,
    permissions: perms
      .filter((p) => p.role_id === r.id)
      .map((p) => p.permission),
  }));
}

/** True if at least one user would still hold access.manage (or Admin's wildcard). */
export function someoneCanManageAccess(): boolean {
  const row = getDb()
    .prepare(
      `SELECT COUNT(*) AS c FROM user_roles ur
       JOIN role_permissions rp ON rp.role_id = ur.role_id
       WHERE rp.permission IN (?, 'access.manage')`
    )
    .get(ALL_PERMISSIONS) as { c: number };
  return row.c > 0;
}
