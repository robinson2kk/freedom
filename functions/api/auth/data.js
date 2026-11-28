import { json, currentUser, secureHeaders } from "../_lib.js";

export async function onRequestGet({ request, env }) {
  const user = await currentUser(request, env);
  if (!user) return json({ error: "Please sign in." }, 401);

  const profile = await env.DB.prepare(
    "SELECT display_name, mobile_number, created_at FROM users WHERE id = ?"
  ).bind(user.id).first();

  let checkins = [];
  try {
    const rows = await env.DB.prepare(
      "SELECT id, category, event_type, intensity, trigger_context, coping_action, log_date, updated_at FROM recovery_entries WHERE user_id = ? ORDER BY log_date DESC"
    ).bind(user.id).all();
    checkins = rows.results || [];
  } catch (error) {
    const detail = String(error?.message || error || "");
    if (!/no such column:\s*(?:trigger_context|coping_action)/i.test(detail)
      && !/table\s+recovery_entries\s+has no column named\s+(?:trigger_context|coping_action)/i.test(detail)) throw error;
    const rows = await env.DB.prepare(
      "SELECT id, category, event_type, intensity, log_date, updated_at FROM recovery_entries WHERE user_id = ? ORDER BY log_date DESC"
    ).bind(user.id).all();
    checkins = rows.results || [];
  }

  const progress = await env.DB.prepare(
    "SELECT category, progress_status, share_publicly, created_at, updated_at FROM community_progress_reports WHERE user_id = ? ORDER BY category"
  ).bind(user.id).all();
  const messages = await env.DB.prepare(
    "SELECT id, display_name, message, status, created_at FROM community_chat_messages WHERE user_id = ? ORDER BY created_at DESC"
  ).bind(user.id).all();
  const submittedReports = await env.DB.prepare(
    "SELECT id, message_id, reason, status, created_at FROM community_chat_reports WHERE reporter_user_id = ? ORDER BY created_at DESC"
  ).bind(user.id).all();

  return json({
    exported_at: new Date().toISOString(),
    account: {
      email: user.email,
      name: profile?.display_name || "",
      mobile: profile?.mobile_number || "",
      created_at: profile?.created_at || null
    },
    checkins,
    community_progress_reports: progress.results || [],
    community_messages: messages.results || [],
    community_reports_submitted: submittedReports.results || []
  }, 200, { "cache-control": "no-store" });
}

export async function onRequestDelete({ request, env }) {
  if (!secureHeaders(request)) return json({ error: "Request origin could not be verified." }, 403);
  const user = await currentUser(request, env);
  if (!user) return json({ error: "Please sign in." }, 401);

  let body;
  try { body = await request.json(); } catch { return json({ error: "Invalid request." }, 400); }
  const password = String(body.password || "");
  if (!password || password.length > 128) {
    return json({ error: "Enter your current password to confirm deletion." }, 400);
  }

  const { passwordHash } = await import("../_lib.js");
  const row = await env.DB.prepare(
    "SELECT password_hash, password_salt FROM users WHERE id = ?"
  ).bind(user.id).first();
  if (!row || await passwordHash(password, row.password_salt) !== row.password_hash) {
    return json({ error: "Password is incorrect. Your account was not deleted." }, 401);
  }

  // User-owned records reference users with ON DELETE CASCADE.
  // Remove email-keyed authentication throttling before deleting the user.
  await env.DB.prepare("DELETE FROM auth_attempts WHERE email_key = ?")
    .bind(user.email.toLowerCase()).run();
  await env.DB.prepare("DELETE FROM users WHERE id = ?").bind(user.id).run();

  return json({ ok: true }, 200, {
    "Set-Cookie": "freedom_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0",
    "cache-control": "no-store"
  });
}
