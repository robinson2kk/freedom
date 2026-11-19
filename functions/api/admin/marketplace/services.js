import { json, currentUser, secureHeaders } from "../../_lib.js";

async function admin(request, env) {
  const user = await currentUser(request, env);
  const allowed = String(env.FREEDOM_ADMIN_EMAIL || "").trim().toLowerCase();
  return user && allowed && user.email.toLowerCase() === allowed ? user : null;
}

export async function onRequestGet({ request, env }) {
  if (!await admin(request, env)) return json({ error: "Not authorised." }, 403);
  const rows = await env.DB.prepare(
    "SELECT s.id,s.application_id,s.title,s.description,s.duration_minutes,s.price_paise,s.delivery_mode,s.review_status,s.review_notes,s.created_at,p.full_name,p.marketplace_category,p.public_listing_consent,p.provider_onboarding_status FROM professional_services s JOIN professional_applications p ON p.id=s.application_id ORDER BY CASE s.review_status WHEN 'pending' THEN 0 ELSE 1 END,s.created_at DESC LIMIT 200"
  ).all();
  return json({ services: rows.results || [] });
}

export async function onRequestPatch({ request, env }) {
  if (!secureHeaders(request)) return json({ error: "Request origin could not be verified." }, 403);
  const reviewer = await admin(request, env);
  if (!reviewer) return json({ error: "Not authorised." }, 403);
  let b; try { b = await request.json(); } catch { return json({ error: "Invalid request." }, 400); }
  const id = String(b.id || "");
  const status = String(b.status || "");
  const notes = String(b.notes || "").trim().slice(0,1000);
  if (!id || !["approved","rejected"].includes(status) || notes.length < 5) return json({ error: "Choose approve/reject and record review notes." }, 400);
  const service = await env.DB.prepare(
    "SELECT s.id,p.status AS application_status,p.public_listing_consent FROM professional_services s JOIN professional_applications p ON p.id=s.application_id WHERE s.id=?"
  ).bind(id).first();
  if (!service) return json({ error: "Service not found." }, 404);
  if (status === "approved" && (service.application_status !== "verified" || service.public_listing_consent !== 1)) return json({ error: "The provider must be approved and have consented to public listing before service approval." }, 400);
  await env.DB.prepare(
    "UPDATE professional_services SET review_status=?,review_notes=?,reviewed_by=?,reviewed_at=datetime('now'),active=0,updated_at=datetime('now') WHERE id=?"
  ).bind(status, notes, reviewer.email, id).run();
  await env.DB.prepare(
    "INSERT INTO marketplace_audit_log(id,actor_user_id,actor_role,action,entity_type,entity_id,metadata_json) VALUES(lower(hex(randomblob(16))),?,'admin',?,'professional_service',?,?)"
  ).bind(reviewer.id, "service_" + status, id, JSON.stringify({notes})).run();
  return json({ ok: true, status, active: false, message: "Review recorded. Public listing and booking activation remain disabled pending payment-provider onboarding and launch approval." });
}
