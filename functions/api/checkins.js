import { json, currentUser, secureHeaders, randomHex } from "./_lib.js";
export async function onRequestGet({ request, env }) {
  const user = await currentUser(request, env);
  if (!user) return json({ error: "Please sign in." }, 401);
  const columns = await env.DB.prepare("PRAGMA table_info(recovery_entries)").all();
  const hasReflections = (columns.results || []).some(c => c.name === "trigger_context") && (columns.results || []).some(c => c.name === "coping_action");
  const fields = hasReflections ? "id,category,event_type,intensity,trigger_context,coping_action,log_date,updated_at" : "id,category,event_type,intensity,log_date,updated_at";
  const { results } = await env.DB.prepare("SELECT " + fields + " FROM recovery_entries WHERE user_id = ? ORDER BY log_date DESC LIMIT 200").bind(user.id).all();
  return json({ entries: results || [] });
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
  if (!allowedCategories.includes(category) || !allowedEvents.includes(eventType) || !/^\d{4}-\d{2}-\d{2}$/.test(logDate) || logDate > new Date().toISOString().slice(0,10) || (intensity !== null && (!Number.isInteger(intensity) || intensity < 1 || intensity > 10))) return json({ error: "Please check the entry details." }, 400);
  const id = String(body.id || randomHex(16)).slice(0,80);
  const triggerContext = String(body.trigger_context || "");
  const copingAction = String(body.coping_action || "");
  const allowedTriggers = ["","stress","boredom","loneliness","tiredness","social","routine","cue","unclear"];
  const allowedCoping = ["","walk","breathing","contact","delay","device","activity","professional","other"];
  if (!allowedTriggers.includes(triggerContext) || !allowedCoping.includes(copingAction)) return json({ error: "Please choose a valid reflection option." }, 400);
  const columns = await env.DB.prepare("PRAGMA table_info(recovery_entries)").all();
  const hasReflections = (columns.results || []).some(c => c.name === "trigger_context") && (columns.results || []).some(c => c.name === "coping_action");
  if (hasReflections) {
    await env.DB.prepare("INSERT INTO recovery_entries (id,user_id,category,event_type,intensity,trigger_context,coping_action,log_date) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(user_id,id) DO UPDATE SET category=excluded.category,event_type=excluded.event_type,intensity=excluded.intensity,trigger_context=excluded.trigger_context,coping_action=excluded.coping_action,log_date=excluded.log_date,updated_at=datetime('now')").bind(id,user.id,category,eventType,intensity,triggerContext || null,copingAction || null,logDate).run();
  } else {
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
