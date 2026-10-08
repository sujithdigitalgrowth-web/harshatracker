import { neon } from "@neondatabase/serverless";
import crypto from "node:crypto";

// Everything the dashboard stores, one row per item: (kind, id) -> JSON.
export const KINDS = ["agencies", "clients", "updates", "deadlines", "links", "logins"];

let _sql = null;
let _ready = null;

export function db() {
  if (!_sql) {
    const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    _sql = neon(url);
  }
  return _sql;
}

// Creates the table on the first request of each cold start; cheap after that.
export function ready() {
  if (!_ready) {
    _ready = db()`create table if not exists items (
      kind text not null,
      id text not null,
      data jsonb not null,
      updated_at timestamptz not null default now(),
      primary key (kind, id)
    )`.catch((e) => { _ready = null; throw e; });
  }
  return _ready;
}

/* ---------- single-user login: one password in APP_PASSWORD, a signed cookie after ---------- */
const COOKIE = "ht_session";
const DAYS = 30;

// Changing APP_PASSWORD (or SESSION_SECRET) signs every device out.
function key() {
  const p = (process.env.APP_PASSWORD || "").trim();
  if (!p) return null;
  return crypto.createHash("sha256").update(`ht-session:${p}:${process.env.SESSION_SECRET || ""}`).digest();
}
const sign = (exp, k) => crypto.createHmac("sha256", k).update(String(exp)).digest("base64url");

export function sessionCookie() {
  const exp = Date.now() + DAYS * 864e5;
  return `${COOKIE}=${exp}.${sign(exp, key())}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${DAYS * 86400}`;
}
export const clearCookie = () => `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;

export function isAuthed(req) {
  const k = key();
  if (!k) return false;
  const m = (req.headers.cookie || "").match(/(?:^|;\s*)ht_session=([^;]+)/);
  if (!m) return false;
  const [exp, sig] = m[1].split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const good = sign(exp, k);
  return good.length === sig.length && crypto.timingSafeEqual(Buffer.from(good), Buffer.from(sig));
}

// Trimmed on both sides: a space or line break pasted into Vercel shouldn't lock you out.
export function passwordOk(input) {
  const p = (process.env.APP_PASSWORD || "").trim();
  const h = (s) => crypto.createHash("sha256").update(String(s ?? "")).digest();
  return p.length > 0 && crypto.timingSafeEqual(h(String(input ?? "").trim()), h(p));
}

export function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  try { return JSON.parse(req.body || "{}"); } catch { return {}; }
}

export function send(res, status, body) {
  res.setHeader("Cache-Control", "no-store");
  res.status(status).json(body);
}
