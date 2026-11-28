import { json, currentUser, secureHeaders, randomHex } from "../_lib.js";
async function admin(request,env) {
  const user=await currentUser(request,env), allowed=String(env.FREEDOM_ADMIN_EMAIL||"").trim().toLowerCase();
  return user&&allowed&&user.email.toLowerCase()===allowed?user:null;
}
export async function onRequestGet({request,env}) {
  if(!await admin(request,env)) return json({error:"Not authorised."},403);
  const rows=await env.DB.prepare("SELECT r.id AS report_id,r.reason,r.created_at AS reported_at,m.id AS message_id,m.display_name,m.message,m.status,(SELECT COUNT(*) FROM community_chat_reports all_reports WHERE all_reports.message_id=m.id) AS report_count FROM community_chat_reports r JOIN community_chat_messages m ON m.id=r.message_id WHERE r.status='open' ORDER BY r.created_at ASC LIMIT 100").all();
  return json({reports:rows.results||[]});
}
export async function onRequestPatch({request,env}) {
  if(!secureHeaders(request)) return json({error:"Request origin could not be verified."},403);
  const reviewer=await admin(request,env); if(!reviewer) return json({error:"Not authorised."},403);
  let body; try{body=await request.json()}catch{return json({error:"Invalid request."},400)}
  const messageId=String(body.message_id||""), action=String(body.action||"");
  if(!/^[a-f0-9]{32}$/.test(messageId)||!["hide","remove","restore"].includes(action)) return json({error:"Choose a valid moderation action."},400);
  const status=action==="hide"?"hidden":action==="remove"?"removed":"visible";
  const message=await env.DB.prepare("SELECT id,status FROM community_chat_messages WHERE id=?").bind(messageId).first();
  if(!message) return json({error:"Message not found."},404);
  await env.DB.batch([
    env.DB.prepare("UPDATE community_chat_messages SET status=? WHERE id=?").bind(status,messageId),
    env.DB.prepare("UPDATE community_chat_reports SET status='reviewed' WHERE message_id=? AND status='open'").bind(messageId),
    env.DB.prepare("INSERT INTO community_chat_moderation_actions(id,message_id,reviewer_user_id,action,previous_status,new_status) VALUES(?,?,?,?,?,?)").bind(randomHex(16),messageId,reviewer.id,action,message.status,status)
  ]);
  return json({ok:true,status});
}
