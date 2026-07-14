import dbConnect from "@/lib/mongodb";
import Task from "@/models/Task";
import { getAuthUser } from "@/lib/auth";
import { withCors, handlePreflight } from "@/lib/cors";
import { logActivity } from "@/lib/activity";

function unauth() { return withCors(Response.json({ error: "Unauthorized" }, { status: 401 })); }

/** GET /api/tasks */
export async function GET(request) {
  try {
    const auth = getAuthUser(request);
    if (!auth) return unauth();
    const { searchParams } = new URL(request.url);
    const status    = searchParams.get("status");
    const priority  = searchParams.get("priority");
    const assignee  = searchParams.get("assignee");
    const relatedTo = searchParams.get("relatedTo");
    const search    = searchParams.get("search") || "";
    const page      = Math.max(1, parseInt(searchParams.get("page")  || "1",  10));
    const limit     = Math.min(100, parseInt(searchParams.get("limit") || "50", 10));
    await dbConnect();
    const filter = {};
    if (status)    filter.status    = status;
    if (priority)  filter.priority  = priority;
    if (assignee)  filter.assignee  = assignee;
    if (relatedTo) filter.relatedTo = relatedTo;
    if (search)    filter.title     = new RegExp(search, "i");
    const [tasks, total] = await Promise.all([
      Task.find(filter)
        .populate("assignee", "name email")
        .sort({ dueDate: 1, priority: -1, createdAt: -1 })
        .skip((page - 1) * limit).limit(limit).lean(),
      Task.countDocuments(filter),
    ]);
    return withCors(Response.json({ tasks, total, page, limit }));
  } catch (e) { console.error(e); return withCors(Response.json({ error: "Something went wrong." }, { status: 500 })); }
}

/** POST /api/tasks */
export async function POST(request) {
  try {
    const auth = getAuthUser(request);
    if (!auth) return unauth();
    const body = await request.json();
    const { title, description, dueDate, priority, status, assignee, relatedTo, relatedToModel } = body;
    if (!title?.trim()) return withCors(Response.json({ error: "title is required" }, { status: 400 }));
    await dbConnect();
    const task = await Task.create({
      title: title.trim(),
      description: description?.trim(),
      dueDate: dueDate || undefined,
      priority: priority || "medium",
      status: status || "todo",
      assignee: assignee || undefined,
      relatedTo: relatedTo || undefined,
      relatedToModel: relatedToModel || undefined,
    });
    const populated = await task.populate("assignee", "name email");
    logActivity({ auth, request, action: "task_create", entity: "task", entityId: task._id, entityLabel: title.trim() });
    return withCors(Response.json({ task: populated }, { status: 201 }));
  } catch (e) { console.error(e); return withCors(Response.json({ error: "Something went wrong." }, { status: 500 })); }
}

export async function OPTIONS() { return handlePreflight(); }
