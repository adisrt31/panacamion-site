const FIELD_LABELS = {
  nombre_completo: "Nombre completo",
  empresa: "Empresa",
  telefono: "Teléfono",
  correo: "Correo electrónico",
  pais: "País",
  comentarios: "Comentarios"
};

const REQUIRED_FIELDS = ["nombre_completo", "telefono", "correo", "pais"];
const MAX_FIELD_LENGTH = 1200;
const MAX_TOTAL_FIELD_LENGTH = 5000;
const HONEYPOT_FIELDS = new Set(["website", "company_website", "url"]);
const EMAIL_PATTERN = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const PHONE_PATTERN = /^[0-9+()\-\s.]{7,24}$/;
const SUSPICIOUS_INPUT_PATTERN = /<\s*script|javascript:|data:text\/html|onerror\s*=|onload\s*=|bcc:|cc:/i;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;
const rateLimitStore = globalThis.__panacamionTratoRateLimit || new Map();
globalThis.__panacamionTratoRateLimit = rateLimitStore;

function jsonResponse(body, status = 200) {
  return Response.json(body, { status });
}

function safeHeaders() {
  return {
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  };
}

function safeJsonResponse(body, status = 200) {
  return Response.json(body, { status, headers: safeHeaders() });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function splitEmails(value) {
  return String(value || "")
    .split(",")
    .map((email) => email.replace(/[\r\n]/g, "").trim())
    .filter((email) => EMAIL_PATTERN.test(email))
    .filter(Boolean);
}

function normalizeFromEmail(value) {
  const fallback = "Panacamión <pedidos@panacamion.com>";
  const from = String(value || fallback).replace(/[\r\n]/g, "").trim();
  if (from.includes("<") && from.includes(">")) return from;

  const emailMatch = from.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  if (!emailMatch) return fallback;

  const name = from.replace(emailMatch[0], "").trim() || "Panacamión";
  return `${name} <${emailMatch[0]}>`;
}

function sanitizeFieldValue(value) {
  return String(value || "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_FIELD_LENGTH);
}

function isValidEmail(value) {
  const email = String(value || "").trim();
  return email.length <= 254 && EMAIL_PATTERN.test(email);
}

function isValidPhone(value) {
  return PHONE_PATTERN.test(String(value || "").trim());
}

function hasSuspiciousInput(fields) {
  return Object.values(fields).some((value) => SUSPICIOUS_INPUT_PATTERN.test(String(value || "")));
}

function logEmailError(context, error) {
  console.error(context, {
    message: error?.message || "Unknown email failure",
    name: error?.name || "Error"
  });
}

function getClientKey(request) {
  const forwardedFor = request.headers.get("x-forwarded-for") || "";
  const realIp = request.headers.get("x-real-ip") || "";
  return (forwardedFor.split(",")[0] || realIp || "unknown").trim();
}

function isRateLimited(request) {
  const now = Date.now();
  const key = getClientKey(request);
  const current = rateLimitStore.get(key) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };

  if (current.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  current.count += 1;
  rateLimitStore.set(key, current);
  return current.count > RATE_LIMIT_MAX_REQUESTS;
}

function buildRows(fields) {
  return Object.entries(FIELD_LABELS)
    .filter(([key]) => fields[key])
    .map(([key, label]) => `
      <tr>
        <th style="width:36%;padding:12px;border-bottom:1px solid #E4E8EE;color:#1B2A3A;text-align:left;font-size:13px;">${escapeHtml(label)}</th>
        <td style="padding:12px;border-bottom:1px solid #E4E8EE;color:#0E1722;font-size:14px;">${escapeHtml(fields[key])}</td>
      </tr>
    `)
    .join("");
}

function buildLeadEmail(fields, timestamp) {
  return `
    <div style="margin:0;padding:0;background:#F4F6F8;font-family:Arial,Helvetica,sans-serif;">
      <div style="max-width:720px;margin:0 auto;padding:28px 18px;">
        <div style="background:#FFFFFF;border-radius:8px;overflow:hidden;border:1px solid #E4E8EE;">
          <div style="height:5px;background:#FF003C;"></div>
          <div style="padding:26px;">
            <p style="margin:0 0 8px;color:#FF003C;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">Panacamión</p>
            <h1 style="margin:0;color:#1B2A3A;font-size:26px;line-height:1.15;">Nueva solicitud Programa Trato Hecho</h1>
            <p style="margin:12px 0 0;color:#697586;">Se recibió una nueva solicitud desde el formulario Trato Hecho.</p>
            <h2 style="margin:26px 0 10px;color:#1B2A3A;font-size:18px;line-height:1.2;">Datos del cliente</h2>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;border:1px solid #E4E8EE;border-radius:8px;overflow:hidden;background:#FFFFFF;">
              ${buildRows(fields)}
            </table>
            <h2 style="margin:26px 0 10px;color:#1B2A3A;font-size:18px;line-height:1.2;">Fecha y hora</h2>
            <p style="margin:0;color:#0E1722;font-size:14px;">${escapeHtml(timestamp)}</p>
          </div>
        </div>
      </div>
    </div>
  `;
}

function buildAlertEmail() {
  return `
    <div style="margin:0;padding:0;background:#F4F6F8;font-family:Arial,Helvetica,sans-serif;">
      <div style="max-width:620px;margin:0 auto;padding:28px 18px;">
        <div style="background:#FFFFFF;border-radius:8px;overflow:hidden;border:1px solid #E4E8EE;">
          <div style="height:5px;background:#FF003C;"></div>
          <div style="padding:26px;color:#1B2A3A;">
            <p>Hola,</p>
            <p>Se ha recibido una nueva solicitud del Programa Trato Hecho.</p>
            <p>Por favor revise la bandeja de pedidos (pedidos@panacamion.com) para consultar los detalles y dar seguimiento al cliente.</p>
            <p style="margin-bottom:0;color:#697586;">Este es un mensaje automático.</p>
          </div>
        </div>
      </div>
    </div>
  `;
}

function buildCustomerEmail() {
  return `
    <div style="margin:0;padding:0;background:#F4F6F8;font-family:Arial,Helvetica,sans-serif;color:#1B2A3A;">
      <div style="display:none;max-height:0;overflow:hidden;">Hemos recibido su solicitud Trato Hecho en Panacamión.</div>
      <div style="max-width:680px;margin:0 auto;padding:28px 16px;">
        <div style="background:#FFFFFF;border:1px solid #E4E8EE;border-radius:8px;overflow:hidden;box-shadow:0 18px 46px rgba(14,23,34,0.08);">
          <div style="padding:24px 26px;background:#1B2A3A;text-align:left;">
            <div style="display:inline-block;padding:12px 16px;background:#FFFFFF;border-radius:8px;">
              <img src="https://panacamion-site.vercel.app/panacamion-logo-no-bg.png" width="240" alt="Panacamión" style="display:block;width:240px;max-width:100%;height:auto;border:0;outline:none;text-decoration:none;" />
            </div>
          </div>
          <div style="height:4px;background:#FF003C;"></div>
          <div style="padding:30px 26px;font-size:16px;line-height:1.6;">
            <p style="margin-top:0;">Hola,</p>
            <p>Gracias por su interés en el Programa Trato Hecho. Hemos recibido su solicitud y un representante de Panacamión se pondrá en contacto con usted pronto para brindarle seguimiento.</p>
            <p style="margin-bottom:0;">Saludos,<br><span style="display:inline-block;line-height:1.25;"><strong>Panacamión International S.A.</strong><br>Importación comercial con enfoque operativo.</span></p>
          </div>
        </div>
      </div>
    </div>
  `;
}

async function sendResendEmail(payload, apiKey) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Resend rejected email request (${response.status})`);
  }

  return response.json();
}

export async function POST(request) {
  const apiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.PANACAMION_TO_EMAIL || "pedidos@panacamion.com";
  const alertEmails = splitEmails(process.env.PANACAMION_ALERT_EMAILS || "info@panacamion.com,salinas.javier@panacamion.com");
  const fromEmail = normalizeFromEmail(process.env.PANACAMION_FROM_EMAIL);

  if (!apiKey) {
    return safeJsonResponse({ ok: false, message: "El servicio de formulario no está configurado." }, 500);
  }

  if (!isValidEmail(toEmail) || !alertEmails.length) {
    return safeJsonResponse({ ok: false, message: "El servicio de formulario no está configurado correctamente." }, 500);
  }

  if (isRateLimited(request)) {
    return safeJsonResponse({
      ok: false,
      message: "Hemos recibido varias solicitudes en poco tiempo. Por favor intente nuevamente más tarde."
    }, 429);
  }

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return safeJsonResponse({ ok: false, message: "No pudimos leer la solicitud enviada." }, 400);
  }

  const fields = {};
  let totalFieldLength = 0;
  for (const [key, value] of formData.entries()) {
    const trimmed = sanitizeFieldValue(value);
    if (trimmed) fields[key] = trimmed;
    if (trimmed && HONEYPOT_FIELDS.has(key)) {
      return safeJsonResponse({ ok: true });
    }
    totalFieldLength += trimmed.length;
    if (totalFieldLength > MAX_TOTAL_FIELD_LENGTH) {
      return safeJsonResponse({
        ok: false,
        message: "La solicitud contiene demasiado texto. Por favor reduzca el contenido e intente nuevamente."
      }, 400);
    }
  }

  const missingFields = REQUIRED_FIELDS.filter((field) => !fields[field]);
  if (!isValidEmail(fields.correo)) {
    missingFields.push("correo");
  }
  if (fields.telefono && !isValidPhone(fields.telefono)) {
    missingFields.push("telefono");
  }

  if (hasSuspiciousInput(fields)) {
    return safeJsonResponse({
      ok: false,
      message: "No pudimos procesar la solicitud. Revise la información e intente nuevamente."
    }, 400);
  }

  if (missingFields.length) {
    return safeJsonResponse({
      ok: false,
      message: "Complete los campos requeridos antes de enviar la solicitud."
    }, 400);
  }

  const timestamp = new Intl.DateTimeFormat("es-PA", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "America/Panama"
  }).format(new Date());

  try {
    await sendResendEmail({
      from: fromEmail,
      to: [toEmail],
      reply_to: fields.correo,
      subject: "Nueva solicitud Programa Trato Hecho - Panacamión",
      html: buildLeadEmail(fields, timestamp)
    }, apiKey);

    await Promise.all(alertEmails.map((email) => sendResendEmail({
      from: fromEmail,
      to: [email],
      subject: "Alerta: nueva solicitud Trato Hecho",
      html: buildAlertEmail()
    }, apiKey)));

    await sendResendEmail({
      from: fromEmail,
      to: [fields.correo],
      subject: "Hemos recibido su solicitud Trato Hecho - Panacamión",
      html: buildCustomerEmail()
    }, apiKey);
  } catch (error) {
    logEmailError("Panacamion Trato Hecho email failed", error);
    return safeJsonResponse({
      ok: false,
      message: "No pudimos enviar su solicitud en este momento. Por favor intente nuevamente o contáctenos por WhatsApp."
    }, 502);
  }

  return safeJsonResponse({ ok: true });
}

export function GET() {
  return safeJsonResponse({ ok: true, message: "Panacamión Trato Hecho endpoint is available." });
}
