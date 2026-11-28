import { json, currentUser, secureHeaders, randomHex } from "./_lib.js";

function missingReflectionColumns(error) {
  const message = String(error?.message || error || "");
  return /no such column:\s*(?:trigger_context|coping_action)/i.test(message)
    || /table\s+recovery_entries\s+has no column named\s+(?:trigger_context|coping_action)/i.test(message);
}
export async function onRequestGet({ request, env }) {
  const user = await currentUser(request, env);
  if (!user) return json({ error: "Please sign in." }, 401);
  let results = [];
  let hasReflections = true;
  try {
    const rows = await env.DB.prepare("SELECT id,category,event_type,intensity,trigger_context,coping_action,log_date,updated_at FROM recovery_entries WHERE user_id = ? ORDER BY log_date DESC LIMIT 200").bind(user.id).all();
    results = rows.results || [];
  } catch (error) {
    if (!missingReflectionColumns(error)) throw error;
    hasReflections = false;
    const rows = await env.DB.prepare("SELECT id,category,event_type,intensity,log_date,updated_at FROM recovery_entries WHERE user_id = ? ORDER BY log_date DESC LIMIT 200").bind(user.id).all();
    results = rows.results || [];
  }
  return json({ entries: results, reflections_enabled: hasReflections });
}
export async function onRequestPost({ request, env }) {
  if (!secureHeaders(request)) return json({ error: "Request origin could not be verified." }, 403);
  const user = await currentUser(request, env);
  if (!user) return json({ error: "Please sign in." }, 401);
  let body;
  try { body = await request.json(); } catch { return json({ error: "Invalid entry." }, 400); }
  const category = String(body.category || "");
  const eventType = String(body.event_type || "");
  const logDate = String(body.log_date || "");
  const intensity = body.intensity == null ? null : Number(body.intensity);
  const allowedCategories = ["pornography","compulsive-sexual-behaviour","smoking","alcohol","gambling","gaming","digital"];
  const allowedEvents = ["check-in","urge-managed","milestone","setback"];
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(logDate);
  let validDate = false;
  if (dateMatch) {
    const year = Number(dateMatch[1]), month = Number(dateMatch[2]), day = Number(dateMatch[3]);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    validDate = parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
    const latestAllowed = new Date();
    latestAllowed.setUTCDate(latestAllowed.getUTCDate() + 1);
    if (parsed > latestAllowed) validDate = false;
  }
  if (!allowedCategories.includes(category) || !allowedEvents.includes(eventType) || !validDate || (intensity !== null && (!Number.isInteger(intensity) || intensity < 1 || intensity > 10))) return json({ error: "Please check the entry details." }, 400);
  const id = String(body.id || randomHex(16)).slice(0,80);
  const triggerContext = String(body.trigger_context || "");
  const copingAction = String(body.coping_action || "");
  const allowedTriggers = ["","stress","boredom","loneliness","tiredness","social","routine","cue","unclear"];
  const allowedCoping = ["","walk","breathing","contact","delay","device","activity","professional","other"];
  if (!allowedTriggers.includes(triggerContext) || !allowedCoping.includes(copingAction)) return json({ error: "Please choose a valid reflection option." }, 400);
  let hasReflections = true;
  try {
    await env.DB.prepare("INSERT INTO recovery_entries (id,user_id,category,event_type,intensity,trigger_context,coping_action,log_date) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(user_id,id) DO UPDATE SET category=excluded.category,event_type=excluded.event_type,intensity=excluded.intensity,trigger_context=excluded.trigger_context,coping_action=excluded.coping_action,log_date=excluded.log_date,updated_at=datetime('now')").bind(id,user.id,category,eventType,intensity,triggerContext || null,copingAction || null,logDate).run();
  } catch (error) {
    if (!missingReflectionColumns(error)) throw error;
    hasReflections = false;
    await env.DB.prepare("INSERT INTO recovery_entries (id,user_id,category,event_type,intensity,log_date) VALUES (?,?,?,?,?,?) ON CONFLICT(user_id,id) DO UPDATE SET category=excluded.category,event_type=excluded.event_type,intensity=excluded.intensity,log_date=excluded.log_date,updated_at=datetime('now')").bind(id,user.id,category,eventType,intensity,logDate).run();
  }
  return json({ ok: true, id, reflection_saved: hasReflections });
}
export async function onRequestDelete({ request, env }) {
  if (!secureHeaders(request)) return json({ error: "Request origin could not be verified." }, 403);
  const user = await currentUser(request, env);
  if (!user) return json({ error: "Please sign in." }, 401);
  let body;
  try { body = await request.json(); } catch { return json({ error: "Invalid request." }, 400); }
  if (body.id) await env.DB.prepare("DELETE FROM recovery_entries WHERE user_id = ? AND id = ?").bind(user.id,String(body.id).slice(0,80)).run();
  else await env.DB.prepare("DELETE FROM recovery_entries WHERE user_id = ?").bind(user.id).run();
  return json({ ok: true });
}
