import {json,currentUser,secureHeaders} from "../../_lib.js";
async function adminUser(request,env){const u=await currentUser(request,env),allowed=String(env.FREEDOM_ADMIN_EMAIL||"").trim().toLowerCase();return u&&allowed&&u.email.toLowerCase()===allowed?u:null}
export async function onRequestPatch({request,env,params}){
 if(!secureHeaders(request))return json({error:"Request origin could not be verified."},403);
 const admin=await adminUser(request,env);if(!admin)return json({error:"Not authorised."},403);
 let b;try{b=await request.json()}catch{return json({error:"Invalid request."},400)}
 const status=String(b.status||"");if(!["pending","reviewing","verified","rejected"].includes(status))return json({error:"Choose a valid review status."},400);
 const id=String(params.id||"");
 if(status==="verified"){
  const source=String(b.verificationSource||"").trim().slice(0,300),notes=String(b.verificationNotes||"").trim().slice(0,1000),expiry=String(b.verificationExpiresAt||"").trim();
  if(!source||!notes)return json({error:"Record the official registry/issuing source and what you checked before verifying."},400);
  if(expiry&&!/^\\d{4}-\\d{2}-\\d{2}$/.test(expiry))return json({error:"Expiry date must use YYYY-MM-DD."},400);
  const r=await env.DB.prepare("UPDATE professional_applications SET status='verified',verification_source=?,verification_notes=?,verified_by=?,verified_at=datetime('now'),verification_expires_at=? WHERE id=?").bind(source,notes,admin.email,expiry||null,id).run();if(!r.meta?.changes)return json({error:"Application not found."},404);
 }else{const r=await env.DB.prepare("UPDATE professional_applications SET status=?,verified_by=NULL,verified_at=NULL,verification_source=NULL,verification_notes=NULL,verification_expires_at=NULL WHERE id=?").bind(status,id).run();if(!r.meta?.changes)return json({error:"Application not found."},404)}
 return json({ok:true,status});
}