import mongoose from "mongoose";

const ActivityLogSchema = new mongoose.Schema(
  {
    // Who did it — null for failed login attempts (user not resolved yet)
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    // Denormalised so logs remain readable even after a user is deleted
    userName: { type: String, default: null },
    userEmail: { type: String, default: null },

    // What happened
    action: {
      type: String,
      required: true,
      // auth
      // entity CRUD
      // admin
      enum: [
        "login",
        "logout",
        "register",
        "login_failed",
        "contact_create",
        "contact_update",
        "contact_delete",
        "account_create",
        "account_update",
        "account_delete",
        "prospect_create",
        "prospect_update",
        "prospect_delete",
        "prospect_import",
        "prospect_convert",
        "user_create",
        "user_update",
        "user_delete",
        "deal_create",
        "deal_update",
        "deal_delete",
        "deal_stage_change",
        "task_create",
        "task_update",
        "task_delete",
        "call_create",
        "call_update",
        "call_delete",
        "meeting_create",
        "meeting_update",
        "meeting_delete",
        "ticket_create",
        "ticket_update",
        "ticket_delete",
      ],
    },

    // Which collection the action targets (null for auth actions)
    entity: {
      type: String,
      enum: ["contact", "account", "prospect", "deal", "task", "call", "meeting", "ticket", "user", null],
      default: null,
    },

    // The _id of the affected document (if applicable)
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    // Human-readable label for the entity (name/title at time of action)
    entityLabel: { type: String, default: null },

    // Request context
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },

    // Extra data (e.g. changed fields, import counts)
    meta: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  {
    timestamps: true,
    // Expire logs after 1 year (TTL index on createdAt)
    // Remove this index if you need permanent retention.
  }
);

// Index for the admin list view queries
ActivityLogSchema.index({ createdAt: -1 });
ActivityLogSchema.index({ user: 1, createdAt: -1 });
ActivityLogSchema.index({ action: 1, createdAt: -1 });
ActivityLogSchema.index({ entity: 1, createdAt: -1 });

export default mongoose.models.ActivityLog ||
  mongoose.model("ActivityLog", ActivityLogSchema);
