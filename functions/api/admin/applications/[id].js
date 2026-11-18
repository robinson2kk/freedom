import { json, currentUser, secureHeaders } from "../_lib.js";
async function adminUser(request,env){
 const user=await currentUser(request,env);
 const allowed=String(env.FREEDOM_ADMIN_EMAIL||"").trim().toLowerCase();
 return user && allowed && user.email.toLowerCase()===allowed ? user : null;
}
export async function onRequestPatch({request,env,params}){
 if(!secureHeaders(request))return json({error:"Request origin could not be verified."},403);
 const admin=await adminUser(request,env);
 if(!admin)return json({error:"Not authorised."},403);
 let body;try{body=await request.json()}catch{return json({error:"Invalid request."},400)}
 const status=String(body.status||"");
 if(!["pending","reviewing","verified","rejected"].includes(status))return json({error:"Choose a valid review status."},400);
 const id=String(params.id||"");
 const result=await env.DB.prepare("UPDATE professional_applications SET status=? WHERE id=?").bind(status,id).run();
 if(!result.meta?.changes)return json({error:"Application not found."},404);
 return json({ok:true,status});
}