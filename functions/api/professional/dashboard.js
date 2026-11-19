import { json, currentUser } from "../_lib.js";

const labels = {
  clinical_psychologist: "Clinical Psychologist",
  counsellor: "Counsellor",
  addiction_recovery: "Addiction Recovery Professional",
  psychiatrist: "Psychiatrist",
  wellness_coach: "Life & Wellness Coach",
  peer_support: "Peer-Support Facilitator"
};

export async function onRequestGet({ request, env }) {
  const user = await currentUser(request, env);
  if (!user) return json({ error: "Please sign in first." }, 401);
  const app = await env.DB.prepare(
    "SELECT full_name, marketplace_category, applicant_type, status, verification_expires_at FROM professional_applications WHERE lower(email)=lower(?) ORDER BY submitted_at DESC LIMIT 1"
  ).bind(user.email).first();
  if (!app) return json({ error: "No professional application was found for this account." }, 404);
  if (app.status !== "verified") return json({ error: "Your professional application must be approved before accessing the dashboard." }, 403);
  if (app.verification_expires_at && app.verification_expires_at < new Date().toISOString().slice(0,10)) return json({ error: "Your credential review has expired. Contact FREEDOM for re-review." }, 403);
  const categoryLabel = labels[app.marketplace_category] || (app.applicant_type === "peer" ? "Peer Support" : "Professional");
  return json({ name: app.full_name, category: app.marketplace_category, categoryLabel });
}
