import { json } from "../_lib.js";

const categories = ["pornography","masturbation","alcohol","smoking"];
export async function onRequestGet({ env }) {
  const rows = await env.DB.prepare(
    "SELECT category,COUNT(DISTINCT CASE WHEN progress_status IN ('seeking_support','making_progress') THEN user_id END) AS reported,COUNT(DISTINCT CASE WHEN progress_status='self_reported_recovery' THEN user_id END) AS recovery FROM community_progress_reports WHERE share_publicly=1 GROUP BY category"
  ).all();
  const totals = await env.DB.prepare(
    "SELECT COUNT(DISTINCT CASE WHEN progress_status IN ('seeking_support','making_progress') THEN user_id END) AS seeking_support,COUNT(DISTINCT CASE WHEN progress_status='self_reported_recovery' THEN user_id END) AS self_reported_recovery FROM community_progress_reports WHERE share_publicly=1"
  ).first();
  const byCategory = Object.fromEntries((rows.results || []).map(r => [r.category, {
    reported: Number(r.reported || 0),
    recovery: Number(r.recovery || 0)
  }]));
  return json({
    totals: {
      seekingSupport: Number(totals?.seeking_support || 0),
      selfReportedRecovery: Number(totals?.self_reported_recovery || 0)
    },
    categories: categories.map(category => ({ category, ...(byCategory[category] || {reported:0,recovery:0}) })),
    updatedAt: new Date().toISOString(),
    note: "Voluntary, anonymous aggregate self-reports from signed-in community members. Recovery is self-reported, not clinically or independently verified."
  }, 200, { "cache-control": "no-store" });
}
