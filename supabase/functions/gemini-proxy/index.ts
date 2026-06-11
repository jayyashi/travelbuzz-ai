import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface FilePart {
  inlineData: { data: string; mimeType: string };
}

interface DocUrl {
  url: string;
  mimeType: string;
  originalExtension?: string;  // Track original file extension for conversion
}

// Extract text from .docx file (ZIP archive with XML)
// Since .docx is a ZIP file, we parse it to find document.xml and extract text
async function extractDocxText(buffer: ArrayBuffer): Promise<string> {
  try {
    // .docx files are ZIP archives - look for the document.xml within
    const uint8 = new Uint8Array(buffer);
    const text = new TextDecoder().decode(uint8);

    // Simple fallback: extract all text that looks like content
    // This is a basic extraction that looks for text tags in the XML
    const matches = text.match(/<w:t[^>]*>([^<]+)<\/w:t>/g) || [];
    const extractedText = matches
      .map(m => m.replace(/<w:t[^>]*>|<\/w:t>/g, ""))
      .filter(t => t.trim())
      .join(" ");

    if (extractedText.length > 0) {
      console.log(`[gemini-proxy] Extracted ${extractedText.length} chars from docx`);
      return extractedText;
    }

    // If structured extraction failed, try to extract any readable text
    const plainText = text
      .replace(/<[^>]+>/g, " ") // Remove XML tags
      .replace(/\s+/g, " ")      // Normalize whitespace
      .trim();

    return plainText.substring(0, 50000) || "[Empty document]"; // Limit to 50KB of text
  } catch (e) {
    console.warn("[gemini-proxy] Failed to extract docx text:", e);
    return "[Could not extract text from Word document]";
  }
}

async function urlToInlineData(url: string, mimeType: string, originalExtension?: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  let fetchUrl = url;
  const fetchHeaders: Record<string, string> = {};

  if (supabaseUrl && url.startsWith(supabaseUrl) && url.includes("/storage/v1/object/")) {
    // Rewrite /public/ path → authenticated path so private buckets work too
    fetchUrl = url.replace("/storage/v1/object/public/", "/storage/v1/object/");
    fetchHeaders["apikey"] = serviceKey;
    fetchHeaders["Authorization"] = `Bearer ${serviceKey}`;
  }

  console.log(`[gemini-proxy] downloading: ${fetchUrl.slice(0, 100)}`);
  const resp = await fetch(fetchUrl, { headers: fetchHeaders });
  const contentType = resp.headers.get("content-type") ?? "unknown";
  console.log(`[gemini-proxy] response: ${resp.status} | content-type: ${contentType}`);

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Failed to fetch document (HTTP ${resp.status}): ${body.slice(0, 200)}`);
  }

  const buffer = await resp.arrayBuffer();
  console.log(`[gemini-proxy] file size: ${buffer.byteLength} bytes, mime: ${mimeType}, ext: ${originalExtension}`);

  if (buffer.byteLength === 0) throw new Error("Downloaded document is empty (0 bytes)");

  // Handle .docx/.doc files - extract text instead of sending binary
  const isDocxFile = originalExtension === "docx" || originalExtension === "doc" ||
                     mimeType.includes("wordprocessingml") || mimeType === "application/msword";
  if (isDocxFile) {
    console.log("[gemini-proxy] Detected .docx/.doc file, extracting text...");
    const text = await extractDocxText(buffer);
    const textData = new TextEncoder().encode(text);
    return { mime_type: "text/plain", data: btoa(String.fromCharCode(...textData)) };
  }

  // For other file types, send as-is
  const uint8 = new Uint8Array(buffer);
  let binary = "";
  const chunk = 8192;
  for (let i = 0; i < uint8.length; i += chunk) {
    binary += String.fromCharCode(...uint8.subarray(i, i + chunk));
  }
  return { mime_type: mimeType, data: btoa(binary) };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set in Edge Function secrets");

    const { models, prompt, fileParts = [], documentUrls = [] }: {
      models: string[];
      prompt: string;
      fileParts?: FilePart[];
      documentUrls?: DocUrl[];
    } = await req.json();

    // Build parts: prompt text first
    const restParts: unknown[] = [{ text: prompt }];

    // Inline base64 parts (legacy / small files)
    for (const p of fileParts) {
      restParts.push({ inline_data: { mime_type: p.inlineData.mimeType, data: p.inlineData.data } });
    }

    // Download files server-side from URLs (bypasses browser CORS)
    for (const doc of documentUrls) {
      const inlineData = await urlToInlineData(doc.url, doc.mimeType, doc.originalExtension);
      restParts.push({ inline_data: inlineData });
    }

    console.log(`[gemini-proxy] sending ${restParts.length} parts to Gemini`);

    let lastError = "All models failed";

    for (const model of models) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: restParts }] }),
          }
        );

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`${model} → HTTP ${res.status}: ${errText}`);
        }

        const data = await res.json();
        const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) throw new Error(`Empty response from ${model}`);

        console.log(`[gemini-proxy] success with ${model}, response length: ${text.length}`);
        return new Response(JSON.stringify({ text }), {
          headers: { ...CORS, "Content-Type": "application/json" },
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.warn(`[gemini-proxy] ${model} failed:`, msg);
        lastError = msg;
      }
    }

    throw new Error(lastError);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(`[gemini-proxy] fatal:`, message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
