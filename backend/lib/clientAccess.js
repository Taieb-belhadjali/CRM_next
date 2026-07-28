import { getAuthUser } from "@/lib/auth";

export function isClient(auth) {
  return auth?.role === "client";
}

export function clientAccessFilter(auth) {
  if (!isClient(auth)) return {};
  const conditions = [];
  if (auth.account) conditions.push({ account: auth.account });
  if (auth.sub) conditions.push({ assignee: auth.sub });
  if (auth.sub) conditions.push({ client: auth.sub });
  if (conditions.length === 0) return { _id: null };
  if (conditions.length === 1) return conditions[0];
  return { $or: conditions };
}

export function enforceClientAccountAccess(auth) {
  if (!isClient(auth)) return null;
  return clientAccessFilter(auth);
}
