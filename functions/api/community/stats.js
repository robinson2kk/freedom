import { json } from "../_lib.js";

const categories = ["pornography","masturbation","alcohol","smoking"];
export async function onRequestGet({ env }) {
  const rows = await env.DB.prepare(
    "SELECT category,COUNT(DISTINCT user_id) AS reported,COUNT(DISTINCT CASE WHEN progress_status='self_reported_recovery' THEN user_id END) AS recovery FROM community_progress_reports WHERE share_publicly=1 GROUP BY category"
  ).all();
  const byCategory = Object.fromEntries((rows.results || []).map(r => [r.category, {
    reported: Number(r.reported || 0),
    recovery: Number(r.recovery || 0)
  }]));
  return json({
    categories: categories.map(category => ({ category, ...(byCategory[category] || {reported:0,recovery:0}) })),
    updatedAt: new Date().toISOString(),
    note: "Voluntary, anonymous aggregate self-reports from signed-in community members. Not clinical or independently verified outcomes."
  }, 200, { "cache-control": "no-store" });
}
