import { json, currentUser, secureHeaders, randomHex } from "../_lib.js";

async function provider(request, env) {
  const user = await currentUser(request, env);
  if (!user) return null;
  return env.DB.prepare(
    "SELECT id FROM professional_applications WHERE linked_user_id=? AND status='verified' ORDER BY submitted_at DESC LIMIT 1"
  ).bind(user.id).first();
}

export async function onRequestGet({ request, env }) {
  const app = await provider(request, env);
  if (!app) return json({ error: "An approved professional account is required." }, 403);
  const rows = await env.DB.prepare(
    "SELECT s.id,s.service_id,s.starts_at,s.ends_at,s.timezone,s.status,v.title AS service_title FROM professional_slots s JOIN professional_services v ON v.id=s.service_id WHERE s.application_id=? ORDER BY s.starts_at DESC LIMIT 100"
  ).bind(app.id).all();
  return json({ slots: rows.results || [] });
}

export async function onRequestPost({ request, env }) {
  if (!secureHeaders(request)) return json({ error: "Request origin could not be verified." }, 403);
  const app = await provider(request, env);
  if (!app) return json({ error: "An approved professional account is required." }, 403);
  let body; try { body = await request.json(); } catch { return json({ error: "Invalid request body." }, 400); }
  const serviceId = String(body.serviceId || "");
  const starts = new Date(body.startsAt);
  const ends = new Date(body.endsAt);
  if (!serviceId || !Number.isFinite(starts.getTime()) || !Number.isFinite(ends.getTime()) || ends <= starts) return json({ error: "Choose a valid service and start/end time." }, 400);
  if (starts.getTime() < Date.now() + 10 * 60 * 1000) return json({ error: "Availability must start at least 10 minutes from now." }, 400);
  if (starts.getTime() > Date.now() + 90 * 24 * 60 * 60 * 1000) return json({ error: "Availability can be added up to 90 days ahead." }, 400);
  const service = await env.DB.prepare("SELECT id,duration_minutes FROM professional_services WHERE id=? AND application_id=? AND active=0").bind(serviceId, app.id).first();
  if (!service) return json({ error: "Choose one of your saved draft services." }, 400);
  if (ends.getTime() - starts.getTime() !== service.duration_minutes * 60000) return json({ error: "Slot length must match the selected service duration." }, 400);
  const overlap = await env.DB.prepare(
    "SELECT id FROM professional_slots WHERE application_id=? AND status IN ('available','held','booked') AND starts_at < ? AND ends_at > ? LIMIT 1"
  ).bind(app.id, ends.toISOString(), starts.toISOString()).first();
  if (overlap) return json({ error: "This time overlaps an existing slot." }, 409);
  const id = randomHex(16);
  await env.DB.prepare(
    "INSERT INTO professional_slots(id,application_id,service_id,starts_at,ends_at,timezone,status) VALUES(?,?,?,?,?,'Asia/Kolkata','available')"
  ).bind(id, app.id, serviceId, starts.toISOString(), ends.toISOString()).run();
  return json({ ok: true, slotId: id, message: "Availability saved. It will not accept bookings until the service is approved and booking checkout is launched." }, 201);
}
