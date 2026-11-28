import { json, secureHeaders, passwordHash, sha256, randomHex, cookie } from "../_lib.js";
export async function onRequestPost({ request, env }) {
  if (!secureHeaders(request)) return json({ error: "Request origin could not be verified." }, 403);
  let body;
  try { body = await request.json(); } catch { return json({ error: "Please submit valid form data." }, 400); }
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  if (!email || email.length > 254 || !password || password.length > 128) return json({ error: "Check your email and password." }, 400);
  await env.DB.prepare("DELETE FROM auth_attempts WHERE attempted_at < datetime('now','-2 days')").run();
  const rawIp = request.headers.get("CF-Connecting-IP") || "";
  const ipHash = rawIp ? await sha256(rawIp) : null;
  const limits = await env.DB.prepare("SELECT SUM(CASE WHEN email_key = ? AND (? = '' OR ip_hash = ?) THEN 1 ELSE 0 END) AS pair_count, SUM(CASE WHEN ip_hash = ? THEN 1 ELSE 0 END) AS ip_count FROM auth_attempts WHERE action = 'login' AND attempted_at > datetime('now','-1 hour')").bind(email, ipHash || "", ipHash || "", ipHash || "").first();
  if ((limits?.pair_count || 0) >= 10 || (ipHash && (limits?.ip_count || 0) >= 30)) return json({ error: "Too many sign-in attempts. Please wait before trying again." }, 429);
  const user = await env.DB.prepare("SELECT id,email,password_hash,password_salt FROM users WHERE email = ?").bind(email).first();
  if (!user || await passwordHash(password, user.password_salt) !== user.password_hash) {
    await env.DB.prepare("INSERT INTO auth_attempts (id,email_key,ip_hash,action) VALUES (?,?,?,?)").bind(randomHex(16),email,ipHash,"login").run();
    return json({ error: "Email or password is incorrect." }, 401);
  }
  await env.DB.prepare("DELETE FROM auth_attempts WHERE email_key = ? AND action = 'login'").bind(email).run();
  const token = randomHex(32);
  const expires = new Date(Date.now() + 30 * 86400000).toISOString().replace("T"," ").slice(0,19);
  await env.DB.prepare("INSERT INTO sessions (id,user_id,token_hash,expires_at) VALUES (?,?,?,?)").bind(randomHex(16),user.id,await sha256(token),expires).run();
  return json({ user: { id: user.id, email: user.email } }, 200, { "Set-Cookie": cookie(token, 30 * 86400) });
}
