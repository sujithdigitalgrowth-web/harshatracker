import { db, ready, isAuthed, readBody, send, KINDS } from "./_lib.js";

const MAX_OPS = 1000;
const MAX_ITEM = 100_000; // bytes of JSON per item

export default async function handler(req, res) {
  if (!isAuthed(req)) return send(res, 401, { error: "Sign in first." });
  try {
    await ready();
    const sql = db();

    if (req.method === "GET") {
      const rows = await sql`select kind, data from items order by updated_at`;
      const out = Object.fromEntries(KINDS.map((k) => [k, []]));
      for (const r of rows) if (out[r.kind]) out[r.kind].push(r.data);
      return send(res, 200, out);
    }

    if (req.method === "POST") {
      // The page sends what changed since its last save: [{op:"put"|"del", kind, id, data?}]
      const ops = readBody(req).ops;
      if (!Array.isArray(ops) || ops.length > MAX_OPS) return send(res, 400, { error: "Bad request" });
      const queries = [];
      for (const o of ops) {
        if (!KINDS.includes(o?.kind) || typeof o.id !== "string" || !o.id || o.id.length > 100) {
          return send(res, 400, { error: "Bad item" });
        }
        if (o.op === "put") {
          if (!o.data || typeof o.data !== "object" || o.data.id !== o.id) return send(res, 400, { error: "Bad item" });
          const json = JSON.stringify(o.data);
          if (json.length > MAX_ITEM) return send(res, 413, { error: "That item is too large to save." });
          queries.push(sql`insert into items (kind, id, data, updated_at)
            values (${o.kind}, ${o.id}, ${json}::jsonb, now())
            on conflict (kind, id) do update set data = excluded.data, updated_at = now()`);
        } else if (o.op === "del") {
          queries.push(sql`delete from items where kind = ${o.kind} and id = ${o.id}`);
        } else {
          return send(res, 400, { error: "Bad op" });
        }
      }
      if (queries.length) await sql.transaction(queries);
      return send(res, 200, { ok: true, saved: queries.length });
    }

    return send(res, 405, { error: "Method not allowed" });
  } catch (e) {
    console.error(e);
    return send(res, 500, { error: "The database didn't respond. Try again in a moment." });
  }
}
