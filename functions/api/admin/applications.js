import { json, currentUser } from "../_lib.js";
async function adminUser(request,env){
 const user=await currentUser(request,env);
 const allowed=String(env.FREEDOM_ADMIN_EMAIL||"").trim().toLowerCase();
 return user && allowed && user.email.toLowerCase()===allowed ? user : null;
}
export async function onRequestGet({request,env}){
 const admin=await adminUser(request,env);
 if(!admin)return json({error:"Not authorised."},403);
 const url=new URL(request.url), status=url.searchParams.get("status")||"all";
 const allowed=["all","pending","reviewing","verified","rejected"];
 if(!allowed.includes(status))return json({error:"Invalid status filter."},400);
 const query=status==="all"
 ? "SELECT id,full_name,email,phone,applicant_type,qualifications,registration_body,registration_number,experience_years,support_areas,languages,location,service_mode,availability,service_type,bio,status,submitted_at FROM professional_applications ORDER BY submitted_at DESC LIMIT 200"
 : "SELECT id,full_name,email,phone,applicant_type,qualifications,registration_body,registration_number,experience_years,support_areas,languages,location,service_mode,availability,service_type,bio,status,submitted_at FROM professional_applications WHERE status=? ORDER BY submitted_at DESC LIMIT 200";
 const result=status==="all"?await env.DB.prepare(query).all():await env.DB.prepare(query).bind(status).all();
 return json({applications:result.results||[]});
}