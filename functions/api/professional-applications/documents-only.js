import { json, secureHeaders, randomHex, sha256 } from "../_lib.js";
const clean=(v,max=500)=>String(v??"").trim().slice(0,max);
export async function onRequestPost({request,env}){
 if(!secureHeaders(request))return json({error:"Request origin could not be verified."},403);
 const ip=request.headers.get("CF-Connecting-IP")||"unknown";
 const ipHash=await sha256(ip+":"+String(env.RUBY_RATE_SALT||"freedom-public"));
 await env.DB.prepare("INSERT INTO public_request_limits (id,ip_hash,route) VALUES (?,?,?)").bind(randomHex(12),ipHash,"professional-documents").run();
 const recent=await env.DB.prepare("SELECT COUNT(*) AS total FROM public_request_limits WHERE ip_hash=? AND route='professional-documents' AND created_at > datetime('now','-15 minutes')").bind(ipHash).first();
 if(Number(recent?.total||0)>8)return json({error:"Too many attempts. Please wait a little before trying again."},429);
 await env.DB.prepare("DELETE FROM public_request_limits WHERE created_at < datetime('now','-1 day')").run();
 let b;try{b=await request.json()}catch{return json({error:"Please check the form and try again."},400)}
 const id=clean(b.applicationId,64),email=clean(b.email,254).toLowerCase(),link=clean(b.supportingDocumentsUrl,500);
 if(!id||!email||!link)return json({error:"Complete all three fields."},400);
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return json({error:"Enter the email address used in your original application."},400);
 let u;try{u=new URL(link)}catch{return json({error:"Enter a valid Google Drive folder link."},400)}
 if(u.protocol!=="https:"||!["drive.google.com","docs.google.com"].includes(u.hostname.toLowerCase()))return json({error:"Please provide a Google Drive link."},400);
 const row=await env.DB.prepare("SELECT id FROM professional_applications WHERE id=? AND lower(email)=?").bind(id,email).first();
 if(!row)return json({error:"We could not match that application reference and email. Check both details or contact FREEDOM."},404);
 await env.DB.prepare("UPDATE professional_applications SET supporting_documents_url=? WHERE id=?").bind(link,id).run();
 return json({ok:true,message:"Your supporting documents link has been received. Thank you."});
}
