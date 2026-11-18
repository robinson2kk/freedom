import {json,currentUser} from "../_lib.js";
async function admin(request,env){const u=await currentUser(request,env),email=String(env.FREEDOM_ADMIN_EMAIL||"").trim().toLowerCase();return u&&email&&u.email.toLowerCase()===email?u:null}
export async function onRequestGet({request,env}){
 const u=await admin(request,env);if(!u)return json({error:"Not authorised."},403);
 const status=new URL(request.url).searchParams.get("status")||"pending";
 if(!["pending","reviewing","completed","declined","all"].includes(status))return json({error:"Invalid status."},400);
 const sql="SELECT id,full_name,email,reason,status,submitted_at,reviewed_by,reviewed_at,admin_notes FROM professional_withdrawal_requests "+(status==="all"?"":"WHERE status=? ")+"ORDER BY submitted_at DESC LIMIT 200";
 const r=status==="all"?await env.DB.prepare(sql).all():await env.DB.prepare(sql).bind(status).all();
 return json({requests:r.results||[]});
}
