import dbConnect from "@/lib/mongodb";
import ActivityLog from "@/models/ActivityLog";

/**
 * Extract the best available IP from a Next.js Request object.
 * In dev the forwarded headers are usually absent — falls back to "unknown".
 */
export function getIp(request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * Log an activity entry.
 * Fire-and-forget — never throws, never blocks the caller.
 *
 * @param {object} opts
 * @param {object|null}  opts.auth        - decoded JWT payload { sub, email, role } or null
 * @param {Request}      opts.request     - the original Next.js Request (for IP / UA)
 * @param {string}       opts.action      - ActivityLog action enum value
 * @param {string|null}  [opts.entity]    - entity type ("contact" | "account" | "prospect" | "user")
 * @param {string|null}  [opts.entityId]  - MongoDB ObjectId of the affected document
 * @param {string|null}  [opts.entityLabel] - human-readable name at time of action
 * @param {object|null}  [opts.meta]      - any extra structured data
 */
export function logActivity({
  auth,
  request,
  action,
  entity = null,
  entityId = null,
  entityLabel = null,
  meta = null,
}) {
  // Run asynchronously — do not await in the caller
  (async () => {
    try {
      await dbConnect();
      await ActivityLog.create({
        user: auth?.sub ?? null,
        userName: auth ? (auth.name ?? null) : null,
        userEmail: auth?.email ?? null,
        action,
        entity,
        entityId,
        entityLabel,
        ip: getIp(request),
        userAgent: request.headers.get("user-agent") ?? null,
        meta,
      });
    } catch (err) {
      // Log to console but never surface to the user
      console.error("[activity] Failed to write log:", err?.message ?? err);
    }
  })();
}
