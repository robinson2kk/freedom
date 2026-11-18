import { json, randomHex, secureHeaders } from "./_lib.js";

const clean = (v, max = 500) => String(v ?? "").trim().slice(0, max);
export async function onRequestPost({ request, env }) {
  if (!secureHeaders(request)) return json({ error: "Request origin could not be verified." }, 403);
  let b;
  try { b = await request.json(); } catch { return json({ error: "Please check the form and try again." }, 400); }
  // Quiet honeypot for basic automated spam.
  if (clean(b.website, 200)) return json({ ok: true, message: "Application received." });
  const fullName=clean(b.fullName,100), email=clean(b.email,254).toLowerCase();
  const applicantType=clean(b.applicantType,40), supportAreas=clean(b.supportAreas,700);
  const serviceMode=clean(b.serviceMode,30), serviceType=clean(b.serviceType,40);
  if(!fullName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !applicantType || !supportAreas || !serviceMode || !serviceType)
    return json({error:"Please complete all required fields with a valid email."},400);
  if(!["professional","peer","volunteer"].includes(applicantType) || !["online","in-person","both"].includes(serviceMode) || !["volunteer","paid","education","combined"].includes(serviceType))
    return json({error:"Please select valid application options."},400);
  if(b.consentPrivacy!==true || b.consentVerification!==true)
    return json({error:"Please confirm the privacy notice and verification consent."},400);
  const recent=await env.DB.prepare("SELECT COUNT(*) AS n FROM professional_applications WHERE email = ? AND submitted_at > datetime('now','-1 day')").bind(email).first();
  if((recent?.n||0)>=3) return json({error:"We have received the maximum number of applications for this email today. Please try again tomorrow."},429);
  const years= b.experienceYears==="" || b.experienceYears==null ? null : Number(b.experienceYears);
  if(years!==null && (!Number.isInteger(years)||years<0||years>60)) return json({error:"Enter experience from 0 to 60 years."},400);
  const id=randomHex(16);
  await env.DB.prepare(`INSERT INTO professional_applications
  (id,full_name,email,phone,applicant_type,qualifications,registration_body,registration_number,experience_years,support_areas,languages,location,service_mode,availability,service_type,bio,consent_privacy,consent_verification)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,1)`)
  .bind(id,fullName,email,clean(b.phone,25)||null,applicantType,clean(b.qualifications,500)||null,clean(b.registrationBody,200)||null,clean(b.registrationNumber,100)||null,years,supportAreas,clean(b.languages,200)||null,clean(b.location,120)||null,serviceMode,clean(b.availability,200)||null,serviceType,clean(b.bio,700)||null).run();
  return json({ok:true,message:"Thank you. Your application has been received for manual review."},201);
}
