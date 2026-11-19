import { json, currentUser, secureHeaders, randomHex } from "../_lib.js";

async function provider(request, env) {
  const user = await currentUser(request, env);
  if (!user) return null;
  return env.DB.prepare(
    "SELECT id, full_name, marketplace_category FROM professional_applications WHERE lower(email)=lower(?) AND status='verified' ORDER BY submitted_at DESC LIMIT 1"
  ).bind(user.email).first();
}

export async function onRequestGet({ request, env }) {
  const app = await provider(request, env);
  if (!app) return json({ error: "An approved professional account is required." }, 403);
  const rows = await env.DB.prepare(
    "SELECT id,title,description,duration_minutes,price_paise,currency,delivery_mode,active,review_status,review_notes,created_at FROM professional_services WHERE application_id=? ORDER BY created_at DESC"
  ).bind(app.id).all();
  return json({ services: rows.results || [] });
}

export async function onRequestPost({ request, env }) {
  if (!secureHeaders(request)) return json({ error: "Request origin could not be verified." }, 403);
  const app = await provider(request, env);
  if (!app) return json({ error: "An approved professional account is required." }, 403);
  let body; try { body = await request.json(); } catch { return json({ error: "Invalid request body." }, 400); }
  const title = String(body.title || "").trim().slice(0,100);
  const description = String(body.description || "").trim().slice(0,1000);
  const duration = Number(body.durationMinutes);
  const price = Number(body.priceRupees);
  const mode = String(body.deliveryMode || "");
  if (title.length < 3) return json({ error: "Enter a service title of at least 3 characters." }, 400);
  if (!Number.isInteger(duration) || duration < 15 || duration > 240) return json({ error: "Duration must be between 15 and 240 minutes." }, 400);
  if (!Number.isInteger(price) || price < 100 || price > 5000) return json({ error: "Price must be ₹100–₹5,000." }, 400);
  if (!["online","in_person","both"].includes(mode)) return json({ error: "Choose a valid delivery mode." }, 400);
  const count = await env.DB.prepare("SELECT COUNT(*) AS n FROM professional_services WHERE application_id=?").bind(app.id).first();
  if ((count?.n || 0) >= 10) return json({ error: "You can create up to 10 draft services." }, 429);
  const id = randomHex(16);
  await env.DB.prepare(
    "INSERT INTO professional_services(id,application_id,title,description,duration_minutes,price_paise,currency,delivery_mode,active) VALUES(?,?,?,?,?,'INR',?,0)"
  ).bind(id, app.id, title, description || null, duration, price * 100, mode).run();
  return json({ ok: true, serviceId: id, status: "pending_review", message: "Service saved as a draft. FREEDOM admin review is required before it can be listed." }, 201);
}
