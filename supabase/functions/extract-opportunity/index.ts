// Sergi / açık çağrı duyurusundan yapılandırılmış fırsat kaydı çıkarır.
// Girdi: { text?, url?, pdf_base64? }  ·  Anahtar yalnız sunucuda: ANTHROPIC_API_KEY
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const MODEL = "claude-sonnet-5-5";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const DATE_KINDS = ["app_open", "deadline", "announcement", "delivery", "install", "opening", "closing"];
const TOOL = {
  name: "save_opportunity",
  description: "Saves the opportunity information extracted from an announcement.",
  input_schema: {
    type: "object",
    properties: {
      title: { type: "string", description: "Event / exhibition / call name, in the language of the source" },
      kind: { type: "string", enum: ["exhibition", "fair", "open_call", "competition", "residency", "gallery", "program", "event", "grant"] },
      organization: { type: ["string", "null"] }, gallery: { type: ["string", "null"] },
      city: { type: ["string", "null"] }, country: { type: ["string", "null"] },
      fee_amount: { type: ["number", "null"] }, fee_currency: { type: ["string", "null"], enum: ["TRY", "USD", "EUR", "GBP", null] },
      fee_note: { type: ["string", "null"], description: "Description of the fee (e.g. 'free', 'per artwork')" },
      requirements: { type: ["string", "null"], description: "Participation requirements, English summary" },
      artwork_requirements: { type: ["string", "null"], description: "Artwork requirements (size, technique, quantity), English summary" },
      required_documents: { type: "array", items: { type: "string" }, description: "Required documents, with short English names" },
      application_url: { type: ["string", "null"] },
      contact: { type: "object", properties: { name: { type: ["string", "null"] }, email: { type: ["string", "null"] }, phone: { type: ["string", "null"] } } },
      dates: {
        type: "array",
        items: {
          type: "object",
          properties: {
            kind: { type: "string", enum: DATE_KINDS },
            date: { type: "string", description: "YYYY-MM-DD" },
            time: { type: ["string", "null"], description: "Time and time zone if given, as in the source" },
            certainty: { type: "string", enum: ["confirmed", "uncertain", "conflicting"] },
            evidence: { type: "string", description: "Verbatim quote of the sentence containing the date" },
          },
          required: ["kind", "date", "certainty", "evidence"],
        },
      },
      suggested_tasks: {
        type: "array",
        items: { type: "object", properties: { title: { type: "string" }, days_before_deadline: { type: "integer" }, reason: { type: "string" } }, required: ["title", "days_before_deadline"] },
        description: "Preparation tasks based on the requirements, in English",
      },
      warnings: { type: "array", items: { type: "string" }, description: "Unclear, missing or conflicting information, in English" },
      confidence: { type: "object", additionalProperties: { type: "string", enum: ["high", "medium", "low"] }, description: "Field name → confidence" },
    },
    required: ["title", "kind", "dates", "required_documents", "warnings", "suggested_tasks"],
  },
};

function htmlToText(html: string) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|li|h\d|tr)>/gi, "\n").replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Only POST is supported." }, 405);
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) return json({ error: "AI key isn't set. Add ANTHROPIC_API_KEY to the Edge Function secrets in the Supabase dashboard." }, 503);

  let body: { text?: string; url?: string; pdf_base64?: string };
  try { body = await req.json(); } catch { return json({ error: "Invalid request body." }, 400); }

  let sourceText = (body.text ?? "").trim();
  if (body.url) {
    let u: URL;
    try { u = new URL(body.url); } catch { return json({ error: "Invalid link." }, 400); }
    if (!["http:", "https:"].includes(u.protocol)) return json({ error: "Only http/https links are supported." }, 400);
    if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|0\.|\[?::1\]?$|metadata)/i.test(u.hostname)) return json({ error: "This address isn't supported." }, 400);
    try {
      const r = await fetch(u, { headers: { "User-Agent": "Mozilla/5.0 (compatible; JournalBot/1.0)", Accept: "text/html,application/xhtml+xml" }, redirect: "follow", signal: AbortSignal.timeout(15000) });
      if (!r.ok) return json({ error: `Couldn't open the page (HTTP ${r.status}). Try copying and pasting the text.` }, 422);
      const ct = r.headers.get("content-type") ?? "";
      if (ct.includes("application/pdf")) {
        const buf = new Uint8Array(await r.arrayBuffer());
        let bin = ""; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
        body.pdf_base64 = btoa(bin);
      } else {
        sourceText = htmlToText(await r.text()).slice(0, 80000);
        if (sourceText.length < 200) return json({ error: "Couldn't read enough text from the page (it may require sign-in or load its content with JavaScript). Try pasting the text." }, 422);
      }
    } catch (e) { return json({ error: `Couldn't read the page: ${(e as Error).message}` }, 422); }
  }
  if (!sourceText && !body.pdf_base64) return json({ error: "Text, a PDF or a link is required." }, 400);
  if (body.pdf_base64 && body.pdf_base64.length > 30_000_000) return json({ error: "PDF is too large (max ~20 MB)." }, 413);

  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Istanbul" });
  const system = `You are an artist's assistant. You analyze announcements for exhibitions, art fairs, open calls, competitions, residencies and gallery applications and turn them into structured records.
Rules:
- Extract only what the source says. If information is missing, leave null or an empty list. NEVER guess or invent.
- Today is ${today} (Europe/Istanbul). Place dates with no year in the most plausible year, but set certainty="uncertain" and note it in warnings.
- If dates in the source contradict each other, set certainty="conflicting" and give both values in warnings.
- Don't invent dates for vague phrases like "end of October" or "spring"; put them in warnings. If there is no exact day, don't add it to dates.
- For every date, quote the sentence from the source verbatim in the evidence field.
- If a time zone is given, write it in the time field (e.g. "23:59 CET").
- required_documents: CV, biography, artist statement, portfolio, artwork images, artwork descriptions, application form, ID, etc., with short English names.
- suggested_tasks: preparation tasks planned backwards from the requirements (in English). days_before_deadline says how many days before the final deadline it should be done. For example "Pay the application fee" if there is a fee, "Plan the artwork delivery" if there is artwork delivery, "Prepare the exhibition promotion" if there is an exhibition opening.
- warnings and summaries should be in English; title stays in the language of the source.
- confidence: high/medium/low for the title, dates, fee, requirements and contact fields.`;

  const content: unknown[] = [];
  if (body.pdf_base64) content.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: body.pdf_base64 } });
  content.push({ type: "text", text: sourceText ? `Announcement text:\n\n${sourceText}` : "Analyze the attached PDF announcement." });

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, max_tokens: 4096, system, tools: [TOOL], tool_choice: { type: "tool", name: TOOL.name }, messages: [{ role: "user", content }] }),
  });
  if (!r.ok) {
    const t = await r.text();
    const msg = r.status === 401 ? "AI key is invalid." : r.status === 429 ? "The AI service is busy right now, try again shortly." : `The AI service returned an error (${r.status}).`;
    console.error("anthropic", r.status, t.slice(0, 500));
    return json({ error: msg }, 502);
  }
  const out = await r.json();
  const tool = (out.content ?? []).find((c: { type: string }) => c.type === "tool_use");
  if (!tool) return json({ error: "Couldn't extract structured information from the announcement." }, 422);
  const data = tool.input;
  // Güvenlik: geçersiz tarihleri ele, uyar
  data.dates = (data.dates ?? []).filter((d: { date: string; kind: string }) => {
    const ok = /^\d{4}-\d{2}-\d{2}$/.test(d.date) && !isNaN(Date.parse(d.date)) && DATE_KINDS.includes(d.kind);
    if (!ok) (data.warnings ??= []).push(`Skipped an unreadable date: ${d.date}`);
    return ok;
  });
  return json({ data, model: MODEL, source_text: sourceText || null });
});
