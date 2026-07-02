import {
  createRole,
  deleteRole,
  deleteUser,
  inviteUser,
  updateRole,
  updateUserRoles,
} from "@/lib/actions";
import {
  listRolesWithPermissions,
  listUsersWithRoles,
  requirePermission,
} from "@/lib/auth";
import { isOidcConfigured } from "@/lib/oidc";
import { ALL_PERMISSIONS, PERMISSION_GROUPS } from "@/lib/permissions";
import { Card, Empty, Field, btnCls, btnDangerCls, inputCls } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Access" };

export default async function AccessPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const session = await requirePermission("access.manage");
  const { error, notice } = await searchParams;
  const users = listUsersWithRoles();
  const roles = listRolesWithPermissions();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Admin — access</h1>
        <p className="mt-1 text-sm text-slate-500">
          Who can sign in and what they&rsquo;re allowed to do. Users appear here on
          their first SSO sign-in (or pre-provision them by email); roles bundle
          permissions and are assignable per user.
        </p>
        {!isOidcConfigured() && (
          <p className="mt-2 rounded-md border border-amber-200 bg-amber-100/60 px-3 py-2 text-sm text-amber-900">
            Single sign-on isn&rsquo;t configured yet (<code>OIDC_ISSUER</code> /{" "}
            <code>OIDC_CLIENT_ID</code>), so nobody can actually sign in. See the
            README for setup.
          </p>
        )}
      </div>

      {error && (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      )}
      {notice && (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {notice}
        </p>
      )}

      <Card title={`Users (${users.length})`}>
        {users.length === 0 ? (
          <Empty>
            No users yet. Set NEXORA_ADMIN_EMAIL before first boot, or
            pre-provision someone below.
          </Empty>
        ) : (
          <div className="space-y-4">
            {users.map((u) => (
              <div key={u.id} className="rounded-lg border border-slate-200 p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{u.name || u.email}</span>
                  <span className="text-xs text-slate-500">{u.email}</span>
                  {u.id === session.user.id && (
                    <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-800">
                      you
                    </span>
                  )}
                  {!u.sub && (
                    <span
                      className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800"
                      title="Pre-provisioned — becomes active on their first SSO sign-in."
                    >
                      awaiting first sign-in
                    </span>
                  )}
                  <span className="ml-auto text-xs text-slate-400">
                    {u.last_login_at
                      ? `last sign-in ${u.last_login_at.slice(0, 16).replace("T", " ")}`
                      : "never signed in"}
                  </span>
                </div>
                <div className="flex flex-wrap items-end gap-4">
                  <form action={updateUserRoles} className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <input type="hidden" name="user_id" value={u.id} />
                    {roles.map((r) => (
                      <label key={r.id} className="flex items-center gap-1.5 text-sm">
                        <input
                          type="checkbox"
                          name="role"
                          value={r.id}
                          defaultChecked={u.roles.some((ur) => ur.id === r.id)}
                        />
                        {r.name}
                      </label>
                    ))}
                    <button type="submit" className={btnCls}>
                      Save roles
                    </button>
                  </form>
                  {u.id !== session.user.id && (
                    <form action={deleteUser}>
                      <input type="hidden" name="id" value={u.id} />
                      <button type="submit" className={btnDangerCls}>
                        Remove user
                      </button>
                    </form>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        <form action={inviteUser} className="mt-4 flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4">
          <div className="w-72">
            <Field label="Pre-provision a user (email as released by your IdP)">
              <input type="email" name="email" required placeholder="colleague@example.com" className={inputCls} />
            </Field>
          </div>
          <button type="submit" className={btnCls}>
            Add user
          </button>
        </form>
      </Card>

      <div className="space-y-4">
        {roles.map((role) => (
          <Card
            key={role.id}
            title={`Role: ${role.name}${role.built_in ? " (built-in)" : ""} — ${role.memberCount} member${role.memberCount === 1 ? "" : "s"}`}
          >
            {role.built_in ? (
              <p className="text-sm text-slate-500">
                {role.description} Always grants{" "}
                <strong>every permission</strong> (including ones added in
                future versions); it can&rsquo;t be edited or deleted.
              </p>
            ) : (
              <form action={updateRole} className="space-y-4">
                <input type="hidden" name="id" value={role.id} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Role name">
                    <input name="name" required defaultValue={role.name} className={inputCls} />
                  </Field>
                  <Field label="Description">
                    <input name="description" defaultValue={role.description} className={inputCls} />
                  </Field>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {PERMISSION_GROUPS.map((group) => (
                    <fieldset key={group.label} className="rounded-lg border border-slate-200 p-3">
                      <legend className="px-1 text-xs font-semibold text-slate-500">
                        {group.label}
                      </legend>
                      <div className="space-y-1.5">
                        {group.permissions.map((p) => (
                          <label key={p.key} className="flex items-start gap-1.5 text-sm">
                            <input
                              type="checkbox"
                              name="perm"
                              value={p.key}
                              defaultChecked={
                                role.permissions.includes(p.key) ||
                                role.permissions.includes(ALL_PERMISSIONS)
                              }
                              className="mt-1"
                            />
                            <span>
                              {p.label}{" "}
                              <code className="text-xs text-slate-400">{p.key}</code>
                            </span>
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  ))}
                </div>
                <div className="flex items-center gap-4">
                  <button type="submit" className={btnCls}>
                    Save role
                  </button>
                </div>
              </form>
            )}
            {!role.built_in && (
              <form action={deleteRole} className="mt-3 border-t border-slate-100 pt-3">
                <input type="hidden" name="id" value={role.id} />
                <button type="submit" className={btnDangerCls}>
                  Delete role{role.memberCount > 0 ? ` (removes it from ${role.memberCount} user${role.memberCount === 1 ? "" : "s"})` : ""}
                </button>
              </form>
            )}
          </Card>
        ))}
      </div>

      <Card title="Add a role">
        <form action={createRole} className="flex flex-wrap items-end gap-3">
          <div className="w-56">
            <Field label="Role name">
              <input name="name" required placeholder="e.g. Sales rep" className={inputCls} />
            </Field>
          </div>
          <div className="w-80">
            <Field label="Description">
              <input name="description" className={inputCls} />
            </Field>
          </div>
          <button type="submit" className={btnCls}>
            Create role
          </button>
        </form>
      </Card>
    </div>
  );
}
