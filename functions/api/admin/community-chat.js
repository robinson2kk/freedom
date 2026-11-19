import { json, currentUser, secureHeaders } from "../_lib.js";
async function admin(request,env) {
  const user=await currentUser(request,env), allowed=String(env.FREEDOM_ADMIN_EMAIL||"").trim().toLowerCase();
  return user&&allowed&&user.email.toLowerCase()===allowed?user:null;
}
export async function onRequestGet({request,env}) {
  if(!await admin(request,env)) return json({error:"Not authorised."},403);
  const rows=await env.DB.prepare("SELECT r.id AS report_id,r.reason,r.created_at AS reported_at,m.id AS message_id,m.display_name,m.message,m.status FROM community_chat_reports r JOIN community_chat_messages m ON m.id=r.message_id WHERE r.status='open' ORDER BY r.created_at ASC LIMIT 100").all();
  return json({reports:rows.results||[]});
}
export async function onRequestPatch({request,env}) {
  if(!secureHeaders(request)) return json({error:"Request origin could not be verified."},403);
  const reviewer=await admin(request,env); if(!reviewer) return json({error:"Not authorised."},403);
  let body; try{body=await request.json()}catch{return json({error:"Invalid request."},400)}
  const messageId=String(body.message_id||""), action=String(body.action||"");
  if(!messageId||!["hide","remove","restore"].includes(action)) return json({error:"Choose a valid moderation action."},400);
  const status=action==="hide"?"hidden":action==="remove"?"removed":"visible";
  await env.DB.prepare("UPDATE community_chat_messages SET status=? WHERE id=?").bind(status,messageId).run();
  await env.DB.prepare("UPDATE community_chat_reports SET status='reviewed' WHERE message_id=? AND status='open'").bind(messageId).run();
  return json({ok:true,status});
}
