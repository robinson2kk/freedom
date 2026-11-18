import {json,currentUser,secureHeaders} from "../../_lib.js";
async function admin(request,env){const u=await currentUser(request,env),email=String(env.FREEDOM_ADMIN_EMAIL||"").trim().toLowerCase();return u&&email&&u.email.toLowerCase()===email?u:null}
export async function onRequestPatch({request,env,params}){
 if(!secureHeaders(request))return json({error:"Request origin could not be verified."},403);
 const u=await admin(request,env);if(!u)return json({error:"Not authorised."},403);
 let b;try{b=await request.json()}catch{return json({error:"Invalid request."},400)}
 const id=String(params.id||""),status=String(b.status||""),notes=String(b.adminNotes||"").trim().slice(0,1000);
 if(!["reviewing","declined","completed"].includes(status))return json({error:"Choose a valid request status."},400);
 const item=await env.DB.prepare("SELECT id,email FROM professional_withdrawal_requests WHERE id=?").bind(id).first();
 if(!item)return json({error:"Request not found."},404);
 if(status==="completed"){
  if(b.identityConfirmed!==true)return json({error:"Confirm that you verified the applicant through their original application email before completing deletion."},400);
  await env.DB.batch([
   env.DB.prepare("DELETE FROM professional_applications WHERE lower(email)=?").bind(item.email.toLowerCase()),
   env.DB.prepare("UPDATE professional_withdrawal_requests SET status='completed',reviewed_by=?,reviewed_at=datetime('now'),admin_notes=?,full_name='Removed on request',email=?,reason=NULL WHERE id=?").bind(u.email,notes,"removed+"+id+"@invalid.local",id)
  ]);
 }else{
  await env.DB.prepare("UPDATE professional_withdrawal_requests SET status=?,reviewed_by=?,reviewed_at=datetime('now'),admin_notes=? WHERE id=?").bind(status,u.email,notes,id).run();
 }
 return json({ok:true,status});
}
