import dbConnect from "@/lib/mongodb";
import Task from "@/models/Task";
import { getAuthUser } from "@/lib/auth";
import { withCors, handlePreflight } from "@/lib/cors";
import { logActivity } from "@/lib/activity";

function unauth() { return withCors(Response.json({ error: "Unauthorized" }, { status: 401 })); }

export async function PATCH(request, { params }) {
  try {
    const auth = getAuthUser(request);
    if (!auth) return unauth();
    const { id } = await params;
    const body = await request.json();
    const allowed = {};
    if (body.title          !== undefined) allowed.title          = body.title.trim();
    if (body.description    !== undefined) allowed.description    = body.description?.trim();
    if (body.dueDate        !== undefined) allowed.dueDate        = body.dueDate || null;
    if (body.priority       !== undefined) allowed.priority       = body.priority;
    if (body.status         !== undefined) allowed.status         = body.status;
    if (body.assignee       !== undefined) allowed.assignee       = body.assignee || null;
    if (body.relatedTo      !== undefined) allowed.relatedTo      = body.relatedTo || null;
    if (body.relatedToModel !== undefined) allowed.relatedToModel = body.relatedToModel || null;
    await dbConnect();
    const task = await Task.findByIdAndUpdate(id, allowed, { new: true }).populate("assignee", "name email");
    if (!task) return withCors(Response.json({ error: "Task not found" }, { status: 404 }));
    logActivity({
      auth, request, action: "task_update", entity: "task",
      entityId: id, entityLabel: task.title,
      meta: { fields: Object.keys(allowed) },
    });
    return withCors(Response.json({ task }));
  } catch (e) { console.error(e); return withCors(Response.json({ error: "Something went wrong." }, { status: 500 })); }
}

export async function DELETE(request, { params }) {
  try {
    const auth = getAuthUser(request);
    if (!auth) return unauth();
    const { id } = await params;
    await dbConnect();
    const task = await Task.findByIdAndDelete(id);
    if (!task) return withCors(Response.json({ error: "Task not found" }, { status: 404 }));
    logActivity({ auth, request, action: "task_delete", entity: "task", entityId: id, entityLabel: task.title });
    return withCors(Response.json({ message: "Deleted." }));
  } catch (e) { console.error(e); return withCors(Response.json({ error: "Something went wrong." }, { status: 500 })); }
}

export async function OPTIONS() { return handlePreflight(); }
