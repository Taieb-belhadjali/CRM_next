import dbConnect from "@/lib/mongodb";
import Contact from "@/models/Contact";
import Account from "@/models/Account";
import Prospect from "@/models/Prospect";
import Deal from "@/models/Deal";
import Ticket from "@/models/Ticket";
import { getAuthUser } from "@/lib/auth";
import { withCors, handlePreflight } from "@/lib/cors";

function unauth() { return withCors(Response.json({ error: "Unauthorized" }, { status: 401 })); }
function err(e)   { console.error(e); return withCors(Response.json({ error: "Something went wrong." }, { status: 500 })); }

/** GET /api/search?q=... */
export async function GET(request) {
  try {
    const auth = getAuthUser(request);
    if (!auth) return unauth();
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim();
    if (!q) return withCors(Response.json({ results: [] }));
    await dbConnect();
    const re = new RegExp(q, "i");
    const results = [];
    const add = (type, items, fields) => {
      for (const item of items) {
        const text = fields.map((f) => item[f]).filter(Boolean).join(" ").toLowerCase();
        if (re.test(text)) {
          results.push({ type, ...item });
        }
      }
    };
    const [contacts, accounts, prospects, deals, tickets] = await Promise.all([
      Contact.find().limit(50).lean(),
      Account.find().limit(50).lean(),
      Prospect.find().limit(50).lean(),
      Deal.find().limit(50).lean(),
      Ticket.find().limit(50).lean(),
    ]);
    add("contact", contacts, ["firstName", "lastName", "email", "phone"]);
    add("account", accounts, ["name", "sector", "address"]);
    add("prospect", prospects, ["firstName", "lastName", "company", "email", "phone"]);
    add("deal", deals, ["title"]);
    add("ticket", tickets, ["subject", "description"]);
    return withCors(Response.json({ results }));
  } catch (e) { return err(e); }
}

export async function OPTIONS() { return handlePreflight(); }
