import { json, currentUser, secureHeaders, randomHex } from "../_lib.js";
export async function onRequestPost({ request, env }) {
  if (!secureHeaders(request)) return json({error:"Request origin could not be verified."},403);
  const user=await currentUser(request,env);
  if (!user) return json({error:"Please sign in to report a message."},401);
  let body; try { body=await request.json(); } catch { return json({error:"Invalid report."},400); }
  const messageId=String(body.message_id||"").slice(0,80);
  const reason=String(body.reason||"").trim().slice(0,300);
  if (!messageId || reason.length<3) return json({error:"Choose a reason for reporting this message."},400);
  const exists=await env.DB.prepare("SELECT id FROM community_chat_messages WHERE id=? AND status='visible'").bind(messageId).first();
  if (!exists) return json({error:"Message not found."},404);
  try {
    await env.DB.prepare("INSERT INTO community_chat_reports(id,message_id,reporter_user_id,reason) VALUES(?,?,?,?)").bind(randomHex(16),messageId,user.id,reason).run();
  } catch { return json({error:"You have already reported this message."},409); }
  return json({ok:true});
}
