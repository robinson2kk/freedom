import { json, secureHeaders, randomHex, sha256, currentUser } from "./_lib.js";
export async function onRequestPost({request,env}) {
 if(!secureHeaders(request)) return json({error:"Request origin could not be verified."},403);
 let body; try{body=await request.json()}catch{return json({error:"Please check the form and try again."},400)}
 const rating=Number(body.rating),type=String(body.feedback_type||""),message=String(body.message||"").trim();
 const email=String(body.contact_email||"").trim().slice(0,254),page=String(body.page_path||"").slice(0,160);
 const allowed=["website","recovery-tools","ruby-ai","bug-report","suggestion","other"];
 if(!Number.isInteger(rating)||rating<1||rating>5||!allowed.includes(type)||message.length<10||message.length>1500)return json({error:"Please choose a rating and category, and write 10–1,500 characters."},400);
 if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return json({error:"Please enter a valid email address or leave it blank."},400);
 try {
  if(!env.DB)throw new Error("Database unavailable");
  const ip=request.headers.get("CF-Connecting-IP")||"unknown";
  const ipHash=await sha256(ip+":"+String(env.FEEDBACK_RATE_SALT||"freedom-feedback"));
  await env.DB.prepare("INSERT INTO public_request_limits(id,ip_hash,route) VALUES(?,?,?)").bind(randomHex(12),ipHash,"feedback").run();
  const count=await env.DB.prepare("SELECT COUNT(*) AS total FROM public_request_limits WHERE ip_hash=? AND route='feedback' AND created_at>datetime('now','-1 hour')").bind(ipHash).first();
  if(Number(count?.total||0)>5)return json({error:"Thanks for your interest. Please wait before sending more feedback."},429);
  const user=await currentUser(request,env);
  await env.DB.prepare("INSERT INTO website_feedback(id,user_id,rating,feedback_type,message,contact_email,page_path) VALUES(?,?,?,?,?,?,?)").bind(randomHex(16),user?.id||null,rating,type,message,email||null,page||null).run();
  return json({ok:true,message:"Thank you. Your feedback has been received."});
 } catch(error) {
  return json({error:"Feedback is temporarily unavailable while the service database is being prepared. Please try again later."},503);
 }
}
