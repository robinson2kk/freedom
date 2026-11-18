import {json,randomHex,secureHeaders} from "./_lib.js";
const clean=(v,n=300)=>String(v??"").trim().slice(0,n);
export async function onRequestPost({request,env}){
 if(!secureHeaders(request))return json({error:"Request origin could not be verified."},403);
 let b;try{b=await request.json()}catch{return json({error:"Please check the form."},400)}
 if(clean(b.website,200))return json({ok:true,message:"If an application matches those details, the request has been recorded for manual review."});
 const name=clean(b.fullName,100),email=clean(b.email,254).toLowerCase(),reason=clean(b.reason,1000);
 if(!name||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return json({error:"Enter your full name and a valid application email address."},400);
 const recent=await env.DB.prepare("SELECT COUNT(*) AS n FROM professional_withdrawal_requests WHERE email=? AND submitted_at>datetime('now','-1 day')").bind(email).first();
 if((recent?.n||0)>=3)return json({error:"Too many requests today. Please try again tomorrow."},429);
 const exists=await env.DB.prepare("SELECT id FROM professional_applications WHERE lower(email)=? LIMIT 1").bind(email).first();
 if(exists)await env.DB.prepare("INSERT INTO professional_withdrawal_requests(id,full_name,email,reason) VALUES(?,?,?,?)").bind(randomHex(16),name,email,reason||null).run();
 return json({ok:true,message:"If an application matches those details, the request has been recorded for manual review. We may contact you at the application email to confirm ownership before making changes."},202);
}
