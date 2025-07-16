import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";

const PIXEL_ID = "756567727044969";
const ACCESS_TOKEN = "EAAQfmxkTTZCcBPJ9ybiI3sduBGUZBBWqMZCXppJxK2evHgiJXiZB0HCK5qZAt9AAuutVGDM5xw0gGA10HUG6eZAjRGIfMj3QdCMZAwbdY5lGUQXlIuIRX6ZCPLV8CmysiNZCpsDf0HApMI6GeMNzLP5Bf7QLOig1CkUrOGpFPaTXV1q35f8QaMbm7IBVHFsI29AZDZD";
const META_URL = `https://graph.facebook.com/v19.0/${PIXEL_ID}/events`;

function hashSHA256(value: string): string {
  return crypto.createHash("sha256").update(value.toLowerCase().trim()).digest("hex");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  try {
    if (!req.body || !req.body.data || !Array.isArray(req.body.data)) {
      console.log("❌ Payload inválido:", req.body);
      return res.status(400).json({ error: "Payload inválido - campo 'data' deve ser um array" });
    }

    const { session_id, email, phone, first_name, last_name, fbp, fbc } = req.body;

    const userData = {
      em: email ? hashSHA256(email) : undefined,
      ph: phone ? hashSHA256(phone) : undefined,
      fn: first_name ? hashSHA256(first_name) : undefined,
      ln: last_name ? hashSHA256(last_name) : undefined,
      external_id: session_id ? hashSHA256(session_id) : undefined,
      client_ip_address: Array.isArray(req.headers["x-forwarded-for"])
        ? req.headers["x-forwarded-for"][0]
        : typeof req.headers["x-forwarded-for"] === "string"
          ? req.headers["x-forwarded-for"].split(",")[0].trim()
          : req.socket?.remoteAddress || undefined,
      client_user_agent: req.headers["user-agent"] || undefined,
      fbp: fbp || undefined,
      fbc: fbc || undefined,
    };

    const enhancedPayload = {
      data: req.body.data.map((event: any) => ({
        ...event,
        event_source_url:
          event.event_source_url ||
          req.headers.referer ||
          req.headers.origin ||
          "https://www.digitalpaisagismo.site",
        action_source: "website",
        event_id: event.event_id || `${Date.now()}-${Math.random()}`,
        event_time: event.event_time || Math.floor(Date.now() / 1000),
        user_data: userData
      }))
    };

    console.log("🔄 Enviando evento para Meta...");
    const fbResponse = await fetch(`${META_URL}?access_token=${ACCESS_TOKEN}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(enhancedPayload)
    });

    const result = await fbResponse.json();
    console.log("✅ Resposta da Meta:", result);
    res.status(fbResponse.status).json(result);
  } catch (err) {
    console.error("❌ Erro interno:", err);
    res.status(500).json({ error: "Erro interno no servidor CAPI." });
  }
}
 
