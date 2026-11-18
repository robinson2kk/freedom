import { json, currentUser, secureHeaders } from "../_lib.js";
export async function onRequestGet({ request, env }) {
  const user = await currentUser(request, env);
  if (!user) return json({ error: "Please sign in." }, 401);
  const profile = await env.DB.prepare("SELECT display_name, mobile_number, created_at FROM users WHERE id = ?").bind(user.id).first();
  const { results } = await env.DB.prepare("SELECT id, category, event_type, intensity, log_date, updated_at FROM recovery_entries WHERE user_id = ? ORDER BY log_date DESC").bind(user.id).all();
  return json({ exported_at: new Date().toISOString(), account: { email: user.email, name: profile?.display_name || "", mobile: profile?.mobile_number || "", created_at: profile?.created_at || null }, checkins: results || [] });
}
export async function onRequestDelete({ request, env }) {
  if (!secureHeaders(request)) return json({ error: "Request origin could not be verified." }, 403);
  const user = await currentUser(request, env);
  if (!user) return json({ error: "Please sign in." }, 401);
  let body;
  try { body = await request.json(); } catch { return json({ error: "Invalid request." }, 400); }
  const password = String(body.password || "");
  if (!password || password.length > 128) return json({ error: "Enter your current password to confirm deletion." }, 400);
  const { passwordHash } = await import("../_lib.js");
  const row = await env.DB.prepare("SELECT password_hash, password_salt FROM users WHERE id = ?").bind(user.id).first();
  if (!row || await passwordHash(password, row.password_salt) !== row.password_hash) return json({ error: "Password is incorrect. Your account was not deleted." }, 401);
  await env.DB.prepare("DELETE FROM users WHERE id = ?").bind(user.id).run();
  return json({ ok: true }, 200, { "Set-Cookie": "freedom_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0" });
}
