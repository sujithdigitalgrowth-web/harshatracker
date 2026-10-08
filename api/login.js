import { sessionCookie, clearCookie, passwordOk, readBody, send } from "./_lib.js";

export default async function handler(req, res) {
  if (req.method === "DELETE") {
    res.setHeader("Set-Cookie", clearCookie());
    return send(res, 200, { ok: true });
  }
  if (req.method !== "POST") return send(res, 405, { error: "Method not allowed" });
  if (!process.env.APP_PASSWORD) {
    return send(res, 500, { error: "No password is set yet. Add APP_PASSWORD in Vercel → Settings → Environment Variables, then redeploy." });
  }
  if (!passwordOk(readBody(req).password)) {
    await new Promise((r) => setTimeout(r, 800)); // slows down guessing
    return send(res, 401, { error: "That password is wrong." });
  }
  res.setHeader("Set-Cookie", sessionCookie());
  return send(res, 200, { ok: true });
}
