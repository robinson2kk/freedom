import { json } from "../_lib.js";

export async function onRequestGet({ env }) {
  const result = await env.DB.prepare(
    "SELECT id, public_label AS label, public_scope AS scope FROM marketplace_categories WHERE active = 1 ORDER BY CASE id WHEN 'clinical_psychologist' THEN 1 WHEN 'counsellor' THEN 2 WHEN 'addiction_recovery' THEN 3 WHEN 'psychiatrist' THEN 4 WHEN 'wellness_coach' THEN 5 WHEN 'peer_support' THEN 6 ELSE 7 END"
  ).all();
  return json({ categories: result.results || [] }, 200, {
    "cache-control": "public, max-age=300"
  });
}
