import { json, currentUser, cookie, getCookie, sha256, secureHeaders } from "../_lib.js";
export async function onRequestGet({ request, env }) {
  const user = await currentUser(request, env);
  return json({ user: user ? { id: user.id, email: user.email } : null });
}
export async function onRequestDelete({ request, env }) {
  if (!secureHeaders(request)) return json({ error: "Request origin could not be verified." }, 403);
  const token = getCookie(request, "freedom_session");
  if (token) await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256(token)).run();
  return json({ ok: true }, 200, { "Set-Cookie": cookie("", 0) });
}
