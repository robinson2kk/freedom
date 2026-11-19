import { json } from "../_lib.js";

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const category = (url.searchParams.get("category") || "").trim();
  const location = (url.searchParams.get("location") || "").trim().slice(0, 80);
  const validCategories = ["clinical_psychologist","counsellor","addiction_recovery","psychiatrist","wellness_coach","peer_support"];
  if (category && !validCategories.includes(category)) {
    return json({ error: "Choose a valid support category." }, 400);
  }

  const clauses = [
    "p.status='verified'",
    "p.public_listing_consent=1",
    "(p.verification_expires_at IS NULL OR p.verification_expires_at>=date('now'))",
    "s.active=1",
    "s.review_status='approved'",
    "EXISTS (SELECT 1 FROM professional_slots sl WHERE sl.service_id=s.id AND sl.status='available' AND sl.starts_at>datetime('now'))"
  ];
  const binds = [];
  if (category) { clauses.push("p.marketplace_category=?"); binds.push(category); }
  if (location) { clauses.push("lower(coalesce(p.location,'')) LIKE lower(?)"); binds.push("%" + location + "%"); }

  const result = await env.DB.prepare(
    "SELECT p.id AS provider_id,p.full_name,p.marketplace_category,p.qualifications,p.support_areas,p.languages,p.location,p.service_mode,p.bio,s.id AS service_id,s.title AS service_title,s.description AS service_description,s.duration_minutes,s.price_paise,s.currency,s.delivery_mode,(SELECT MIN(sl.starts_at) FROM professional_slots sl WHERE sl.service_id=s.id AND sl.status='available' AND sl.starts_at>datetime('now')) AS next_available FROM professional_applications p JOIN professional_services s ON s.application_id=p.id WHERE " + clauses.join(" AND ") + " ORDER BY next_available ASC LIMIT 100"
  ).bind(...binds).all();

  return json({ listings: result.results || [], bookingEnabled: false });
}
