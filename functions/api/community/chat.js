import { json, currentUser, secureHeaders, randomHex } from "../_lib.js";

async function aliasFor(userId) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(userId));
  const suffix = [...new Uint8Array(digest)].slice(0,4).map(v=>v.toString(16).padStart(2,"0")).join("").toUpperCase();
  return "Member-" + suffix;
}
export async function onRequestGet({ env }) {
  const rows = await env.DB.prepare("SELECT id,display_name,message,created_at FROM community_chat_messages WHERE status='visible' ORDER BY created_at DESC LIMIT 60").all();
  return json({messages:(rows.results||[]).reverse()},200,{"cache-control":"no-store"});
}
function automatedSafetyCheck(message) {
  const text = message.toLowerCase();
  const checks = [
    { pattern: /(?:https?:\\/\\/|www\\.)/i, reason: "Links aren't allowed in community chat." },
    { pattern: /\\b[\\w.+-]+@[\\w.-]+\\.[a-z]{2,}\\b/i, reason: "Please don't share email addresses." },
    { pattern: /(?:\\+?\\d[\\d .()\\-]{7,}\\d)/, reason: "Please don't share phone numbers." },
    { pattern: /\\b(?:kill yourself|go die|i will kill|i'll kill|threaten(?:ing)?)\\b/i, reason: "Threatening or self-harm encouraging language isn't allowed." },
    { pattern: /\\b(?:idiot|moron|retard|stfu|f\\*\\*?k you|shut up)\\b/i, reason: "Please rewrite this respectfully." },
    { pattern: /\\b(?:stop taking (?:your )?(?:medication|medicine|meds)|quit alcohol cold turkey|stop your prescribed)\\b/i, reason: "Unsafe medical instructions aren't allowed. Encourage people to speak with a qualified professional." }
  ];
  for (const check of checks) if (check.pattern.test(message)) return check.reason;
  if (/(.)\\1{9,}/i.test(message)) return "Please remove repeated characters and try again.";
  return null;
}

export async function onRequestPost({ request, env }) {
  if (!secureHeaders(request)) return json({error:"Request origin could not be verified."},403);
  const user=await currentUser(request,env);
  if (!user) return json({error:"Please sign in to join the community chat."},401);
  let body; try { body=await request.json(); } catch { return json({error:"Invalid message."},400); }
  const message=String(body.message||"").trim();
  if (!message || message.length>500) return json({error:"Messages must be between 1 and 500 characters."},400);
  const blockedReason=automatedSafetyCheck(message);
  if (blockedReason) return json({error:blockedReason},422);
  const recent=await env.DB.prepare("SELECT created_at FROM community_chat_messages WHERE user_id=? AND created_at>datetime('now','-8 seconds') LIMIT 1").bind(user.id).first();
  if (recent) return json({error:"Please wait a few seconds before sending another message."},429);
  const id=randomHex(16), displayName=await aliasFor(user.id);
  await env.DB.prepare("INSERT INTO community_chat_messages(id,user_id,display_name,message) VALUES(?,?,?,?)").bind(id,user.id,displayName,message).run();
  return json({ok:true,id,display_name:displayName,automated_check:"passed"});
}
