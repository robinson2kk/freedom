import { json, currentUser, secureHeaders } from "../_lib.js";
async function adminUser(request,env){const user=await currentUser(request,env);const allowed=String(env.FREEDOM_ADMIN_EMAIL||"").trim().toLowerCase();return user&&allowed&&user.email.toLowerCase()===allowed?user:null}
export async function onRequestGet({request,env}) {
 const admin=await adminUser(request,env);if(!admin)return json({error:"Not authorised."},403);
 const url=new URL(request.url),status=url.searchParams.get("status")||"open";
 if(!["open","reviewed","archived","all"].includes(status))return json({error:"Invalid status."},400);
 const sql="SELECT id,rating,feedback_type,message,contact_email,page_path,status,created_at FROM website_feedback"+(status==="all"?"":" WHERE status=?")+" ORDER BY created_at DESC LIMIT 250";
 const result=status==="all"?await env.DB.prepare(sql).all():await env.DB.prepare(sql).bind(status).all();
 return json({feedback:result.results||[]});
}
export async function onRequestPost({request,env}) {
 if(!secureHeaders(request))return json({error:"Request origin could not be verified."},403);
 const admin=await adminUser(request,env);if(!admin)return json({error:"Not authorised."},403);
 let body;try{body=await request.json()}catch{return json({error:"Invalid request."},400)}
 const status=String(body.status||"");const id=String(body.id||"");
 if(!id||!["reviewed","archived","open"].includes(status))return json({error:"Invalid update."},400);
 const result=await env.DB.prepare("UPDATE website_feedback SET status=? WHERE id=?").bind(status,id).run();
 return json({ok:true,changes:result.meta?.changes||0});
}
