import {json,currentUser} from "../_lib.js";
async function isAdmin(request,env){const u=await currentUser(request,env),email=String(env.FREEDOM_ADMIN_EMAIL||"").trim().toLowerCase();return !!(u&&email&&u.email.toLowerCase()===email)}
export async function onRequestGet({request,env}){
 if(!await isAdmin(request,env))return json({error:"Not authorised."},403);
 if(!env.PROFESSIONAL_DOCS)return json({error:"Document storage is not configured."},503);
 const url=new URL(request.url),id=url.searchParams.get("id")||"",key=url.searchParams.get("key")||"";
 if(!/^[a-f0-9]{32}$/i.test(id)||!key.startsWith("applications/"+id+"/")||key.includes(".."))return json({error:"Invalid document reference."},400);
 const obj=await env.PROFESSIONAL_DOCS.get(key);if(!obj)return json({error:"Document not found."},404);
 const name=String(obj.customMetadata?.originalName||"supporting-document").replace(/[^a-zA-Z0-9._-]/g,"_");
 return new Response(obj.body,{headers:{"Content-Type":obj.httpMetadata?.contentType||"application/octet-stream","Content-Disposition":'attachment; filename="'+name+'"',"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
}