import { json, secureHeaders, randomHex, sha256 } from "./_lib.js";
const MODEL = "@cf/zai-org/glm-4.7-flash";
const SYSTEM = `You are Ruby, the warm, calm, non-judgmental recovery companion for FREEDOM, a free educational self-help website. Help people understand habits and compulsive behaviours, manage urges, reflect on setbacks without shame, and take one realistic next step. Be concise, kind, practical and culturally respectful. Ask one question at a time when clarification is needed.

Safety boundaries:
- You are an AI assistant, not a therapist, doctor, crisis counsellor or emergency service. Never diagnose, claim to provide treatment, or imply guaranteed recovery.
- Never recommend medication, dosing, stopping prescribed medication, detox protocols, or unsupervised alcohol withdrawal. If alcohol dependence is possible, advise medical assessment before reducing/stopping; withdrawal can be dangerous.
- Do not shame or moralise about sexuality. Masturbation alone is not a disorder. Focus on loss of control, distress and life impact.
- If someone may be in immediate danger or at risk of self-harm, encourage contacting local emergency services now and reaching a trusted person. In India, emergency number 112 and Tele-MANAS 14416 are available; do not assume every user is in India.
- Do not ask for full name, address, phone, email, passwords or identifying details. Remind users not to share them.
- Do not make up helplines, facts, research or website features. For topics outside your scope, say so and suggest a qualified professional.
- Never claim messages are confidential medical records. Chat is not stored in FREEDOM's database by this endpoint, but the AI provider processes the prompt to generate a reply.
- If a user requests help with illegal harm, abuse, exploitation or self-harm instructions, refuse briefly and redirect to safety.
Keep most replies under 140 words. `;
function crisisReply(text) {
 const s=text.toLowerCase();
 if (/(suicid|kill myself|end my life|self.?harm|hurt myself|want to die|overdose|not safe right now)/i.test(s)) {
  return "I'm really sorry things feel this heavy. You deserve immediate human support, and you don't have to handle this alone. If you might act on these thoughts or are in immediate danger, call your local emergency number now or go to the nearest emergency department. If you're in India, call 112 for emergency help or Tele-MANAS at 14416 for mental-health support. If possible, move near someone you trust and tell them plainly: “I'm not feeling safe alone right now.” I can stay with you while you think about the next safe step, but I'm not an emergency service.";
 }
 return null;
}
async function allowRequest(request, env) {
 if (!env.DB) return false;
 const ip=request.headers.get("CF-Connecting-IP")||"unknown";
 const ipHash=await sha256(ip+":"+String(env.RUBY_RATE_SALT||"freedom-public"));
 await env.DB.prepare("INSERT INTO public_request_limits (id,ip_hash,route) VALUES (?,?,?)").bind(randomHex(12),ipHash,"ruby").run();
 const row=await env.DB.prepare("SELECT COUNT(*) AS total FROM public_request_limits WHERE ip_hash=? AND route='ruby' AND created_at > datetime('now','-10 minutes')").bind(ipHash).first();
 await env.DB.prepare("DELETE FROM public_request_limits WHERE created_at < datetime('now','-1 day')").run();
 return Number(row?.total||0)<=12;
}
export async function onRequestPost({request,env}) {
 if(!secureHeaders(request)) return json({error:"Request origin could not be verified."},403);
 let body; try{body=await request.json()}catch{return json({error:"Please send a valid message."},400)}
 const message=String(body.message||"").trim();
 if(!message||message.length>1200)return json({error:"Messages must be between 1 and 1,200 characters."},400);
 const safety=crisisReply(message);
 if(safety)return json({reply:safety,source:"safety-guidance"});
 if(!env.AI)return json({error:"Ruby is being connected. Please try again later."},503);
 try {
  if(!await allowRequest(request,env))return json({error:"Ruby is taking a short breather. Please try again in a few minutes."},429);
  const history=Array.isArray(body.history)?body.history.slice(-6).map(item=>({role:item?.role==="assistant"?"assistant":"user",content:String(item?.content||"").slice(0,1200)})).filter(item=>item.content):[];
  if(history.length&&history[history.length-1].role==="user"&&history[history.length-1].content===message)history.pop();
  const messages=[{role:"system",content:SYSTEM},...history,{role:"user",content:message}];
  const result=await env.AI.run(MODEL,{messages,max_tokens:420,temperature:0.45});
  const reply=String(result?.response||result?.result?.response||"").trim();
  if(!reply)throw new Error("Empty AI response");
  return json({reply,source:"ruby"});
 } catch(error) {
  return json({error:"Ruby couldn't respond just now. Please try again shortly, or use the Immediate Help page if you need urgent support."},503);
 }
}
