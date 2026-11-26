import { json, secureHeaders } from "../_lib.js";
const clean=(v,max=500)=>String(v??"").trim().slice(0,max);
export async function onRequestPost({request,env}){
 if(!secureHeaders(request))return json({error:"Request origin could not be verified."},403);
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
