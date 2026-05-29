const CUSTOMER_FIELDS = new Set([
  "nombre",
  "empresa",
  "pais",
  "codigo_pais",
  "telefono",
  "correo"
]);

const FIELD_LABELS = {
  tipo_solicitud: "Tipo de solicitud",
  nombre: "Nombre",
  empresa: "Empresa",
  pais: "País",
  codigo_pais: "Código de país",
  telefono: "Teléfono",
  correo: "Correo electrónico",
  unidad: "Unidad",
  marcas_sugeridas: "Marcas sugeridas",
  anio_sugerido: "Año sugerido",
  tipo_motor: "Tipo de motor",
  tipo_transmision: "Tipo de transmisión",
  pais_destino: "País de destino",
  comentarios_unidades: "Comentarios",
  nombre_repuesto: "Nombre de repuesto",
  numero_repuesto: "Número de repuesto",
  vin_vehiculo: "VIN del vehículo",
  anio_vehiculo: "Año del vehículo",
  numero_motor: "Número de motor",
  comentarios_repuestos: "Comentarios"
};

const REQUEST_REQUIRED_FIELDS = {
  "Solicitud de unidades": [
    "tipo_solicitud",
    "nombre",
    "pais",
    "codigo_pais",
    "telefono",
    "correo",
    "unidad",
    "marcas_sugeridas",
    "anio_sugerido",
    "tipo_motor",
    "tipo_transmision",
    "pais_destino"
  ],
  "Solicitud de repuestos": [
    "tipo_solicitud",
    "nombre",
    "pais",
    "codigo_pais",
    "telefono",
    "correo",
    "nombre_repuesto",
    "numero_repuesto",
    "vin_vehiculo",
    "anio_vehiculo",
    "numero_motor"
  ]
};

const SMALL_ATTACHMENT_LIMIT_BYTES = 4 * 1024 * 1024;
const TOTAL_ATTACHMENT_LIMIT_BYTES = 10 * 1024 * 1024;
const MAX_ATTACHMENTS = 5;

function jsonResponse(body, status = 200) {
  return Response.json(body, { status });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalizeLabel(name) {
  return FIELD_LABELS[name] || name.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizeFromEmail(value) {
  const fallback = "Panacamión <pedidos@panacamion.com>";
  const from = String(value || fallback).trim();
  if (from.includes("<") && from.includes(">")) return from;

  const emailMatch = from.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  if (!emailMatch) return fallback;

  const name = from.replace(emailMatch[0], "").trim() || "Panacamión";
  return `${name} <${emailMatch[0]}>`;
}

function splitEmails(value) {
  return String(value || "")
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);
}

function buildRows(entries) {
  if (!entries.length) {
    return '<tr><td style="padding:12px;color:#697586;">Sin información adicional.</td></tr>';
  }

  return entries
    .map(([key, value]) => `
      <tr>
        <th style="width:38%;padding:12px;border-bottom:1px solid #E4E8EE;color:#1B2A3A;text-align:left;font-size:13px;">${escapeHtml(normalizeLabel(key))}</th>
        <td style="padding:12px;border-bottom:1px solid #E4E8EE;color:#0E1722;font-size:14px;">${escapeHtml(value)}</td>
      </tr>
    `)
    .join("");
}

function buildSection(title, rows) {
  return `
    <h2 style="margin:26px 0 10px;color:#1B2A3A;font-size:18px;line-height:1.2;">${escapeHtml(title)}</h2>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;border:1px solid #E4E8EE;border-radius:8px;overflow:hidden;background:#FFFFFF;">
      ${rows}
    </table>
  `;
}

function buildInternalEmail({ fields, files, attachedFiles, skippedFiles, timestamp }) {
  const requestType = fields.tipo_solicitud || "No especificado";
  const customerEntries = Object.entries(fields).filter(([key, value]) => CUSTOMER_FIELDS.has(key) && value);
  const detailEntries = Object.entries(fields).filter(([key, value]) => !CUSTOMER_FIELDS.has(key) && key !== "tipo_solicitud" && value);

  const fileItems = files.length
    ? files.map((file) => `<li>${escapeHtml(file.name)} (${Math.round(file.size / 1024)} KB)</li>`).join("")
    : "<li>No se adjuntaron archivos.</li>";

  const skippedNote = skippedFiles.length
    ? `<p style="margin:10px 0 0;color:#697586;font-size:13px;">Algunos archivos no fueron adjuntados al correo por límite de seguridad: ${escapeHtml(skippedFiles.map((file) => file.name).join(", "))}</p>`
    : "";

  return `
    <div style="margin:0;padding:0;background:#F4F6F8;font-family:Arial,Helvetica,sans-serif;">
      <div style="max-width:760px;margin:0 auto;padding:28px 18px;">
        <div style="background:#FFFFFF;border-radius:8px;overflow:hidden;border:1px solid #E4E8EE;">
          <div style="height:5px;background:#FF003C;"></div>
          <div style="padding:26px;">
            <p style="margin:0 0 8px;color:#FF003C;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">Panacamión</p>
            <h1 style="margin:0;color:#1B2A3A;font-size:26px;line-height:1.15;">Nueva solicitud recibida</h1>
            <p style="margin:12px 0 0;color:#697586;">Se recibió una nueva solicitud desde el formulario web.</p>
            ${buildSection("Tipo de solicitud", buildRows([["tipo_solicitud", requestType]]))}
            ${buildSection("Información del cliente", buildRows(customerEntries))}
            ${buildSection("Detalles de la solicitud", buildRows(detailEntries))}
            <h2 style="margin:26px 0 10px;color:#1B2A3A;font-size:18px;line-height:1.2;">Archivos adjuntos</h2>
            <div style="padding:14px 18px;border:1px solid #E4E8EE;border-radius:8px;background:#FFFFFF;color:#0E1722;font-size:14px;">
              <ul style="margin:0;padding-left:20px;">${fileItems}</ul>
              <p style="margin:10px 0 0;color:#697586;font-size:13px;">Archivos incluidos como adjuntos pequeños: ${attachedFiles.length}.</p>
              ${skippedNote}
            </div>
            ${buildSection("Fecha y hora", buildRows([["timestamp", timestamp]]))}
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
            <p>Se ha recibido una nueva solicitud en el sistema de Panacamión.</p>
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
      <div style="display:none;max-height:0;overflow:hidden;">Hemos recibido su solicitud en Panacamión.</div>
      <div style="max-width:680px;margin:0 auto;padding:28px 16px;">
        <div style="background:#FFFFFF;border:1px solid #E4E8EE;border-radius:8px;overflow:hidden;box-shadow:0 18px 46px rgba(14,23,34,0.08);">
          <div style="padding:24px 26px;background:#1B2A3A;text-align:left;">
            <img src="https://panacamion-site.vercel.app/panacamion-logo-no-bg.png" width="240" alt="Panacamión" style="display:block;width:240px;max-width:82%;height:auto;border:0;outline:none;text-decoration:none;" />
          </div>
          <div style="height:4px;background:#FF003C;"></div>
          <div style="padding:30px 26px;font-size:16px;line-height:1.6;">
            <p style="margin-top:0;">Hola,</p>
            <p>Gracias por su interés en Panacamión.</p>
            <p>Hemos recibido su solicitud y nuestro equipo comenzará a revisar las opciones disponibles según el tipo de unidad, repuesto o configuración solicitada.</p>
            <p>Nos comunicaremos con usted dentro de las próximas 24 a 48 horas hábiles para brindarle seguimiento.</p>
            <p>Gracias por confiar en Panacamión International S.A.</p>
            <p style="margin-bottom:0;">Saludos,<br><strong>Panacamión International S.A.</strong><br>Soluciones comerciales para trabajo pesado.</p>
          </div>
          <div style="padding:22px 26px;background:#F8FAFC;border-top:1px solid #E4E8EE;color:#697586;font-size:14px;line-height:1.5;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
              <tr>
                <td style="padding:0 0 10px;color:#1B2A3A;font-size:15px;font-weight:700;">Panacamión International S.A.</td>
              </tr>
              <tr>
                <td style="padding:0;color:#697586;">
                  <a href="https://www.instagram.com/panacamion/" style="display:inline-block;color:#FF003C;text-decoration:none;font-weight:700;">
                    <span style="display:inline-block;width:18px;height:18px;margin-right:6px;border:2px solid #FF003C;border-radius:5px;vertical-align:-5px;box-sizing:border-box;">
                      <span style="display:block;width:6px;height:6px;margin:4px auto 0;border:2px solid #FF003C;border-radius:50%;box-sizing:border-box;"></span>
                    </span>@panacamion
                  </a>
                  <span style="display:inline-block;margin:0 10px;color:#C5CBD3;">|</span>
                  <a href="https://www.panacamion.com" style="color:#1B2A3A;text-decoration:none;font-weight:700;">www.panacamion.com</a>
                </td>
              </tr>
            </table>
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
    const errorBody = await response.text();
    throw new Error(`Resend rejected email request (${response.status}): ${errorBody.slice(0, 240)}`);
  }

  return response.json();
}

async function getAttachments(files) {
  const attachments = [];
  const skippedFiles = [];
  let totalBytes = 0;

  for (const file of files.slice(0, MAX_ATTACHMENTS)) {
    if (!file.size || file.size > SMALL_ATTACHMENT_LIMIT_BYTES || totalBytes + file.size > TOTAL_ATTACHMENT_LIMIT_BYTES) {
      skippedFiles.push(file);
      continue;
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    totalBytes += file.size;
    attachments.push({
      filename: file.name || "archivo-adjunto",
      content: buffer.toString("base64")
    });
  }

  if (files.length > MAX_ATTACHMENTS) {
    skippedFiles.push(...files.slice(MAX_ATTACHMENTS));
  }

  // Phase 1 keeps only small files as email attachments. Larger files should later
  // move to Supabase Storage, S3, or Vercel Blob and be emailed as secure links.
  return { attachments, skippedFiles };
}

export async function POST(request) {
  const apiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.PANACAMION_TO_EMAIL || "pedidos@panacamion.com";
  const alertEmails = splitEmails(process.env.PANACAMION_ALERT_EMAILS || "info@panacamion.com,salinas.javier@panacamion.com");
  const fromEmail = normalizeFromEmail(process.env.PANACAMION_FROM_EMAIL);

  if (!apiKey) {
    return jsonResponse({ ok: false, message: "El servicio de formulario no está configurado." }, 500);
  }

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return jsonResponse({ ok: false, message: "No pudimos leer la solicitud enviada." }, 400);
  }

  const fields = {};
  const files = [];

  for (const [key, value] of formData.entries()) {
    if (value instanceof File) {
      if (value.name && value.size > 0) files.push(value);
      continue;
    }

    const trimmed = String(value || "").trim();
    if (!trimmed) continue;

    if (fields[key]) fields[key] = `${fields[key]}, ${trimmed}`;
    else fields[key] = trimmed;
  }

  const requestType = fields.tipo_solicitud;
  const requiredFields = REQUEST_REQUIRED_FIELDS[requestType] || ["tipo_solicitud", "nombre", "pais", "codigo_pais", "telefono", "correo"];
  const missingFields = requiredFields.filter((field) => !fields[field]);

  if (!fields.correo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.correo)) {
    missingFields.push("correo");
  }

  if (!files.length) {
    missingFields.push("attachments");
  }

  if (!requestType || missingFields.length) {
    return jsonResponse({
      ok: false,
      message: "Complete los campos requeridos antes de enviar la solicitud."
    }, 400);
  }

  const timestamp = new Intl.DateTimeFormat("es-PA", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "America/Panama"
  }).format(new Date());

  const { attachments, skippedFiles } = await getAttachments(files);

  try {
    await sendResendEmail({
      from: fromEmail,
      to: [toEmail],
      reply_to: fields.correo,
      subject: "Nueva solicitud recibida - Panacamión",
      html: buildInternalEmail({ fields, files, attachedFiles: attachments, skippedFiles, timestamp }),
      attachments
    }, apiKey);

    await sendResendEmail({
      from: fromEmail,
      to: alertEmails,
      subject: "Nueva solicitud recibida - Panacamión",
      html: buildAlertEmail()
    }, apiKey);

    await sendResendEmail({
      from: fromEmail,
      to: [fields.correo],
      subject: "Hemos recibido su solicitud - Panacamión",
      html: buildCustomerEmail()
    }, apiKey);
  } catch (error) {
    console.error("Panacamion form email failed:", error.message);
    return jsonResponse({
      ok: false,
      message: "No pudimos enviar la solicitud en este momento. Por favor intente nuevamente o contáctenos por WhatsApp."
    }, 502);
  }

  return jsonResponse({ ok: true });
}

export function GET() {
  return jsonResponse({ ok: true, message: "Panacamión request endpoint is available." });
}
