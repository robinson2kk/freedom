import { json, currentUser, secureHeaders } from "../_lib.js";
const categories = ["pornography","masturbation","alcohol","smoking"];
const statuses = ["seeking_support","making_progress","self_reported_recovery"];

export async function onRequestPost({ request, env }) {
  if (!secureHeaders(request)) return json({error:"Request origin could not be verified."},403);
  const user = await currentUser(request,env);
  if (!user) return json({error:"Please sign in to share an optional community progress report."},401);
  let body; try { body=await request.json(); } catch { return json({error:"Invalid report."},400); }
  const category=String(body.category||""), status=String(body.progress_status||"");
  if (!categories.includes(category) || !statuses.includes(status)) return json({error:"Choose a valid category and progress status."},400);
  await env.DB.prepare("INSERT INTO community_progress_reports(user_id,category,progress_status,share_publicly) VALUES(?,?,?,1) ON CONFLICT(user_id,category) DO UPDATE SET progress_status=excluded.progress_status,share_publicly=1,updated_at=datetime('now')").bind(user.id,category,status).run();
  return json({ok:true});
}
export async function onRequestDelete({ request, env }) {
  if (!secureHeaders(request)) return json({error:"Request origin could not be verified."},403);
  const user=await currentUser(request,env);
  if (!user) return json({error:"Please sign in."},401);
  let body; try { body=await request.json(); } catch { return json({error:"Invalid request."},400); }
  const category=String(body.category||"");
  if (!categories.includes(category)) return json({error:"Choose a valid category."},400);
  await env.DB.prepare("DELETE FROM community_progress_reports WHERE user_id=? AND category=?").bind(user.id,category).run();
  return json({ok:true});
}
