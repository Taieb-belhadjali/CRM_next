import dbConnect from "@/lib/mongodb";
import Deal from "@/models/Deal";
import Task from "@/models/Task";
import Call from "@/models/Call";
import Prospect from "@/models/Prospect";
import ActivityLog from "@/models/ActivityLog";
import { getAuthUser } from "@/lib/auth";
import { withCors, handlePreflight } from "@/lib/cors";

function unauth() { return withCors(Response.json({ error: "Unauthorized" }, { status: 401 })); }
function err(e)   { console.error(e); return withCors(Response.json({ error: "Something went wrong." }, { status: 500 })); }

const STAGE_LABELS = {
  prospection: "Prospection",
  proposition: "Proposition",
  negociation: "Négociation",
  gagne: "Gagné",
  perdu: "Perdu",
};

/** GET /api/dashboard */
export async function GET(request) {
  try {
    const auth = getAuthUser(request);
    if (!auth) return unauth();
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get("scope") || "own";
    await dbConnect();
    const ownerFilter = scope === "all" ? {} : { owner: auth.sub };
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
    const openDeals = await Deal.countDocuments({ ...ownerFilter, stage: { $nin: ["gagne", "perdu"] } });
    const tasksDueToday = await Task.countDocuments({
      ...ownerFilter,
      status: { $ne: "done" },
      dueDate: { $lte: now, $gte: startOfDay },
    });
    const callsScheduled = await Call.countDocuments({
      ...ownerFilter,
      scheduledAt: { $gte: now },
      status: "scheduled",
    });
    const newProspectsThisWeek = await Prospect.countDocuments({
      ...ownerFilter,
      createdAt: { $gte: startOfWeek },
    });
    const pipeline = await Deal.aggregate([
      { $match: ownerFilter ? { owner: ownerFilter.owner } : {} },
      {
        $group: {
          _id: "$stage",
          count: { $sum: 1 },
          value: { $sum: "$value" },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    const pipelineMap = new Map(pipeline.map((p) => [p._id, p]));
    const stages = ["prospection", "proposition", "negociation", "gagne", "perdu"].map((key) => ({
      key,
      label: STAGE_LABELS[key] || key,
      count: pipelineMap.get(key)?.count || 0,
      value: pipelineMap.get(key)?.value || 0,
    }));
    const tasks = await Task.find({
      ...ownerFilter,
      status: { $ne: "done" },
      dueDate: { $lte: now },
    })
      .sort({ dueDate: 1 })
      .limit(10)
      .populate("assignee", "name email")
      .lean();
    const activities = await ActivityLog.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();
    return withCors(Response.json({
      kpis: { openDeals, tasksDueToday, callsScheduled, newProspectsThisWeek },
      pipeline: stages,
      tasksDueToday: tasks,
      recentActivity: activities,
    }));
  } catch (e) { return err(e); }
}

export async function OPTIONS() { return handlePreflight(); }
