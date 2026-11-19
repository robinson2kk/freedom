import { json, currentUser, secureHeaders } from "../../../_lib.js";

export async function onRequestPost({ request, env, params }) {
  if (!secureHeaders(request)) return json({ error: "Request origin could not be verified." }, 403);
  const admin = await currentUser(request, env);
  const allowed = String(env.FREEDOM_ADMIN_EMAIL || "").trim().toLowerCase();
  if (!admin || !allowed || admin.email.toLowerCase() !== allowed) return json({ error: "Not authorised." }, 403);
  let body; try { body = await request.json(); } catch { return json({ error: "Invalid request." }, 400); }
  if (body.confirmEmailOwnership !== true) return json({ error: "Confirm that the applicant's email ownership was manually verified." }, 400);
  const id = String(params.id || "");
  const app = await env.DB.prepare("SELECT id,email,status FROM professional_applications WHERE id=?").bind(id).first();
  if (!app) return json({ error: "Application not found." }, 404);
  if (app.status !== "verified") return json({ error: "Only approved applications can be linked." }, 400);
  const user = await env.DB.prepare("SELECT id FROM users WHERE lower(email)=lower(?) LIMIT 1").bind(app.email).first();
  if (!user) return json({ error: "No FREEDOM account exists for the application email yet. Ask the applicant to create an account first." }, 404);
  await env.DB.prepare("UPDATE professional_applications SET linked_user_id=? WHERE id=?").bind(user.id,id).run();
  await env.DB.prepare("INSERT INTO marketplace_audit_log(id,actor_user_id,actor_role,action,entity_type,entity_id,metadata_json) VALUES(lower(hex(randomblob(16))),?,'admin','provider_account_linked','professional_application',?,?)").bind(admin.id,id,JSON.stringify({linkedUserId:user.id,manualEmailOwnershipConfirmed:true})).run();
  return json({ok:true,message:"Account linked. The professional can now sign in to the FREEDOM dashboard."});
}
