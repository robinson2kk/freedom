import { json, currentUser, getCookie, sha256, secureHeaders } from "../_lib.js";

export async function onRequestGet({ request, env }) {
  const user = await currentUser(request, env);
  if (!user) return json({ error: "Please sign in to view your sessions." }, 401);
  const token = getCookie(request, "freedom_session");
  const currentHash = token ? await sha256(token) : "";
  const result = await env.DB.prepare(
    "SELECT id, created_at, expires_at, token_hash FROM sessions WHERE user_id = ? AND expires_at > datetime('now') ORDER BY created_at DESC"
  ).bind(user.id).all();
  return json({
    sessions: (result.results || []).map(row => ({
      id: row.id,
      created_at: row.created_at,
      expires_at: row.expires_at,
      current: row.token_hash === currentHash
    }))
  });
}

export async function onRequestDelete({ request, env }) {
  if (!secureHeaders(request)) return json({ error: "Request origin could not be verified." }, 403);
  const user = await currentUser(request, env);
  if (!user) return json({ error: "Please sign in to manage sessions." }, 401);
  let body;
  try { body = await request.json(); } catch { return json({ error: "Please select a session." }, 400); }
  const id = String(body.id || "");
  if (!/^[a-f0-9]{32}$/.test(id)) return json({ error: "Invalid session." }, 400);
  const token = getCookie(request, "freedom_session");
  const currentHash = token ? await sha256(token) : "";
  const selected = await env.DB.prepare("SELECT token_hash FROM sessions WHERE id = ? AND user_id = ?").bind(id, user.id).first();
  if (!selected) return json({ error: "That session could not be found." }, 404);
  const revokedCurrent = selected.token_hash === currentHash;
  await env.DB.prepare("DELETE FROM sessions WHERE id = ? AND user_id = ?").bind(id, user.id).run();
  return json({ ok: true, revokedCurrent }, 200, revokedCurrent ? { "Set-Cookie": "freedom_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0" } : {});
}
