// `user.permissions` is the flattened `"resource:action"[]` array GET
// /auth/me already returns (src/modules/auth/api/me.js) — this just checks
// membership in it. Not a hook: every call site already has `useAuth()` in
// scope, so there's nothing a wrapper hook would add beyond an extra layer.
export function hasPermission(user, resource, action) {
  return Boolean(user?.permissions?.includes(`${resource}:${action}`));
}
