import {json} from "./_lib.js";
export async function onRequestGet({env}){
 const r=await env.DB.prepare("SELECT id,full_name,applicant_type,qualifications,support_areas,languages,location,service_mode,service_type,bio,public_contact_method,phone,email,session_fee,verification_expires_at FROM professional_applications WHERE status='verified' AND public_listing_consent=1 ORDER BY verified_at DESC LIMIT 100").all();
 const profiles=(r.results||[]).filter(p=>!p.verification_expires_at||p.verification_expires_at>=new Date().toISOString().slice(0,10)).map(p=>({id:p.id,name:p.full_name,category:p.applicant_type,qualifications:p.qualifications,areas:p.support_areas,languages:p.languages,location:p.location,serviceMode:p.service_mode,serviceType:p.service_type,bio:p.bio,contactMethod:p.public_contact_method,contact:p.public_contact_method==="phone"?p.phone:p.email,sessionFee:p.session_fee}));
 return json({profiles});
}