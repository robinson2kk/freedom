import { json, currentUser, secureHeaders } from "../_lib.js";

export async function onRequestGet({ request, env }) {
  const user = await currentUser(request, env);
  if (!user) return json({ error: "Please sign in." }, 401);
  const profile = await env.DB.prepare("SELECT display_name, mobile_number FROM users WHERE id = ?").bind(user.id).first();
  return json({ profile: { name: profile?.display_name || "", mobile: profile?.mobile_number || "" } });
}

export async function onRequestPut({ request, env }) {
  if (!secureHeaders(request)) return json({ error: "Request origin could not be verified." }, 403);
  const user = await currentUser(request, env);
  if (!user) return json({ error: "Please sign in." }, 401);
  let body;
  try { body = await request.json(); } catch { return json({ error: "Invalid profile details." }, 400); }
  const name = String(body.name || "").trim();
  const mobile = String(body.mobile || "").trim();
  if (name.length > 80) return json({ error: "Name must be 80 characters or fewer." }, 400);
  if (mobile && !/^\+?[0-9 ()-]{7,20}$/.test(mobile)) return json({ error: "Enter a valid mobile number, including country code if needed." }, 400);
  await env.DB.prepare("UPDATE users SET display_name = ?, mobile_number = ? WHERE id = ?").bind(name || null, mobile || null, user.id).run();
  return json({ ok: true, profile: { name, mobile } });
}
