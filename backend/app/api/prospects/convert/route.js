import dbConnect from "@/lib/mongodb";
import Prospect from "@/models/Prospect";
import Contact from "@/models/Contact";
import Account from "@/models/Account";
import { getAuthUser } from "@/lib/auth";
import { withCors, handlePreflight } from "@/lib/cors";
import { logActivity } from "@/lib/activity";

export async function POST(request) {
  const auth = getAuthUser(request);
  if (!auth) {
    return withCors(Response.json({ error: "Unauthorized" }, { status: 401 }));
  }

  const { prospectId, createAccount = false } = await request.json();

  if (!prospectId) {
    return withCors(Response.json({ error: "prospectId is required" }, { status: 400 }));
  }

  await dbConnect();

  const prospect = await Prospect.findById(prospectId);
  if (!prospect) {
    return withCors(Response.json({ error: "Prospect not found" }, { status: 404 }));
  }
  if (prospect.status === "converted") {
    return withCors(Response.json({ error: "Prospect is already converted" }, { status: 409 }));
  }

  let account = null;
  if (createAccount && prospect.company) {
    account = await Account.create({ name: prospect.company, owner: auth.sub });
  }

  const contact = await Contact.create({
    firstName: prospect.firstName,
    lastName: prospect.lastName,
    jobTitle: prospect.jobTitle,
    email: prospect.email,
    phone: prospect.phone,
    address: prospect.address,
    account: account?._id,
    owner: auth.sub,
  });

  prospect.status = "converted";
  if (!prospect.tags.includes("converted")) prospect.tags.push("converted");
  await prospect.save();

  logActivity({
    auth,
    request,
    action: "prospect_convert",
    entity: "prospect",
    entityId: prospect._id,
    entityLabel: `${prospect.firstName} ${prospect.lastName}`,
    meta: { contactId: contact._id, accountId: account?._id ?? null },
  });

  return withCors(Response.json({ prospect, contact, account }, { status: 201 }));
}

export async function OPTIONS() {
  return handlePreflight();
}
