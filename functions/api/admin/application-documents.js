import {json,currentUser} from "../_lib.js";
async function isAdmin(request,env){const u=await currentUser(request,env),email=String(env.FREEDOM_ADMIN_EMAIL||"").trim().toLowerCase();return !!(u&&email&&u.email.toLowerCase()===email)}
export async function onRequestGet({request,env}){
 if(!await isAdmin(request,env))return json({error:"Not authorised."},403);
 if(!env.PROFESSIONAL_DOCS)return json({error:"Document storage is not configured."},503);
 const id=new URL(request.url).searchParams.get("id")||"";
 if(!/^[a-f0-9]{32}$/i.test(id))return json({error:"Invalid application reference."},400);
 const result=await env.PROFESSIONAL_DOCS.list({prefix:"applications/"+id+"/",limit:10});
 return json({documents:(result.objects||[]).map(o=>({key:o.key,name:o.customMetadata?.originalName||o.key.split("/").pop(),size:o.size}))});
}