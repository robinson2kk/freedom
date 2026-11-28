import { json, secureHeaders, randomHex, passwordHash, sha256, cookie } from "../_lib.js";
export async function onRequestPost({ request, env }) {
  if (!secureHeaders(request)) return json({ error: "Request origin could not be verified." }, 403);
  let body;
  try { body = await request.json(); } catch { return json({ error: "Please submit valid form data." }, 400); }
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return json({ error: "Enter a valid email address." }, 400);
  if (password.length < 12 || password.length > 128) return json({ error: "Use a password between 12 and 128 characters." }, 400);
  await env.DB.prepare("DELETE FROM auth_attempts WHERE attempted_at < datetime('now','-2 days')").run();
  const rawIp = request.headers.get("CF-Connecting-IP") || "";
  const ipHash = rawIp ? await sha256(rawIp) : null;
  const limits = await env.DB.prepare("SELECT SUM(CASE WHEN email_key = ? AND (? = '' OR ip_hash = ?) THEN 1 ELSE 0 END) AS pair_count, SUM(CASE WHEN ip_hash = ? THEN 1 ELSE 0 END) AS ip_count FROM auth_attempts WHERE attempted_at > datetime('now','-1 hour')").bind(email, ipHash || "", ipHash || "", ipHash || "").first();
  if ((limits?.pair_count || 0) >= 5 || (ipHash && (limits?.ip_count || 0) >= 20)) return json({ error: "Too many account creation attempts. Please wait before trying again." }, 429);
  await env.DB.prepare("INSERT INTO auth_attempts (id,email_key,ip_hash) VALUES (?,?,?)").bind(randomHex(16),email,ipHash).run();
  const salt = randomHex(16);
  const hash = await passwordHash(password, salt);
  const userId = randomHex(16);
  try {
    await env.DB.prepare("INSERT INTO users (id,email,password_hash,password_salt) VALUES (?,?,?,?)").bind(userId,email,hash,salt).run();
  } catch (e) {
    if (String(e).includes("UNIQUE")) return json({ error: "An account with this email may already exist. Try signing in." }, 409);
    throw e;
  }
  const token = randomHex(32);
  const expires = new Date(Date.now() + 30 * 86400000).toISOString().replace("T"," ").slice(0,19);
  await env.DB.prepare("INSERT INTO sessions (id,user_id,token_hash,expires_at) VALUES (?,?,?,?)").bind(randomHex(16),userId,await sha256(token),expires).run();
  return json({ user: { id: userId, email } }, 201, { "Set-Cookie": cookie(token, 30 * 86400) });
}
