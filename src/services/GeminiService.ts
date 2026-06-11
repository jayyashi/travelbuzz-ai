// All Gemini calls are routed through the gemini-proxy Edge Function.
// The actual GEMINI_API_KEY lives in Supabase Edge Function Secrets — never in the browser bundle.

import * as mammoth from 'mammoth';

const PROXY_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''}/functions/v1/gemini-proxy`;
const PROXY_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

const MODELS = ["gemini-2.5-flash", "gemini-2.5-pro"];

export class GeminiService {

    // ── Core proxy caller ────────────────────────────────────────────────────
    private async callProxy(
        prompt: string,
        fileParts: Array<{ inlineData: { data: string; mimeType: string } }> = [],
        models = MODELS
    ): Promise<string> {
        const res = await fetch(PROXY_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${PROXY_KEY}`,
                "apikey": PROXY_KEY,
            },
            body: JSON.stringify({ models, prompt, fileParts }),
        });

        if (!res.ok) throw new Error(`Gemini proxy HTTP ${res.status}: ${await res.text()}`);

        const { text, error } = await res.json();
        if (error) throw new Error(error);
        if (!text) throw new Error("Gemini proxy returned empty text");
        return text as string;
    }

    // Sends document URLs to the proxy — proxy downloads files server-side (no browser CORS)
    private async callProxyWithUrls(
        prompt: string,
        documentUrls: Array<{ url: string; mimeType: string }>,
        models = MODELS
    ): Promise<string> {
        const res = await fetch(PROXY_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${PROXY_KEY}`,
                "apikey": PROXY_KEY,
            },
            body: JSON.stringify({ models, prompt, documentUrls }),
        });

        if (!res.ok) throw new Error(`Gemini proxy HTTP ${res.status}: ${await res.text()}`);

        const { text, error } = await res.json();
        if (error) throw new Error(error);
        if (!text) throw new Error("Gemini proxy returned empty text");
        return text as string;
    }

    // ── File helpers (must stay browser-side — reads local File objects) ────
    private fileToGenerativePart(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                const base64 = result.split(",")[1];
                if (base64) resolve(base64);
                else reject(new Error(`Base64 conversion failed for ${file.name}`));
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    private getValidatedMimeType(file: File): string {
        const ext = file.name.split(".").pop()?.toLowerCase();
        if (ext === "pdf")  return "application/pdf";
        if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
        if (ext === "png")  return "image/png";
        if (ext === "txt")  return "text/plain";
        if (ext === "docx") return "text/plain"; // Convert to text, don't send as docx
        if (ext === "doc")  return "text/plain";  // Convert to text, don't send as doc
        // fall back to browser-reported MIME, otherwise pdf
        return (file.type && file.type !== "" && file.type !== "other") ? file.type : "application/pdf";
    }

    // Convert .docx file to plain text
    private async docxToText(file: File): Promise<string> {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const result = await mammoth.extractRawText({ arrayBuffer });
            return result.value || '';
        } catch (error) {
            console.warn('Failed to convert docx to text:', error);
            return ''; // Return empty string if conversion fails
        }
    }

    private async filesToParts(files: File[]) {
        return Promise.all(
            files.map(async (file) => {
                const ext = file.name.split(".").pop()?.toLowerCase();
                const isMsWord = ext === "docx" || ext === "doc";

                let data: string;
                let mimeType: string;

                if (isMsWord) {
                    // Convert .docx/.doc to plain text
                    const textContent = await this.docxToText(file);
                    // Convert text to base64
                    data = btoa(unescape(encodeURIComponent(textContent)));
                    mimeType = "text/plain";
                } else {
                    // For other files, use normal base64 conversion
                    data = await this.fileToGenerativePart(file);
                    mimeType = this.getValidatedMimeType(file);
                }

                return {
                    inlineData: { data, mimeType },
                };
            })
        );
    }

    // ── Public methods ───────────────────────────────────────────────────────

    async parseDocuments(
        files: File[],
        tripContext: { destination: string; startDate?: string }
    ): Promise<any[]> {
        const fileParts = await this.filesToParts(files);

        const prompt = `
You are a professional Travel Agent.
Analyze the attached PDF/Image travel documents for a trip to ${tripContext.destination}.
Trip Context: Starts around ${tripContext.startDate || "unknown date"}.

INSTRUCTIONS:
1. Extract all flights, hotel bookings, and scheduled tours.
2. Return ONLY a valid JSON array. No markdown, no conversational text.

JSON SCHEMA:
[
    {
        "dayNumber": 1,
        "date": "YYYY-MM-DD",
        "activities": [
            {
                "name": "Activity Name",
                "description": "Details extracted",
                "startTime": "HH:MM",
                "type": "flight" | "hotel" | "food" | "landmark" | "transport" | "other",
                "imageKeyword": "keyword for image search",
                "location": { "lat": number, "lng": number }
            }
        ]
    }
]

IMPORTANT: For each activity, provide approximate but realistic geographical coordinates based on the landmark or city.
If a day involves traveling between different cities, provide different coordinates for origin and destination activities.
If dates are missing, assume Day 1 is the trip start date.
`;

        const text = await this.callProxy(prompt, fileParts);
        const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
        return JSON.parse(jsonStr);
    }

    async analyzeDocuments(
        files: File[],
        tripContext: { destination: string; startDate?: string }
    ): Promise<{
        days: any[];
        issues: Array<{ type: string; message: string; field: string; suggestion?: string }>;
        summary: string;
    }> {
        const fileParts = await this.filesToParts(files);
        const currentYear = new Date().getFullYear();

        const prompt = `
You are a professional Travel Itinerary Parser.
Trip destination: ${tripContext.destination}.
Trip start date hint: ${tripContext.startDate || "not provided"}.
Current year: ${currentYear}.

TASK 1 — Extract all bookings and activities: flights, hotel check-ins/outs, tours, transfers.

TASK 2 — Detect issues that need user confirmation before building the timeline:
- "missing_year": dates in the document have only day+month, no year (e.g., "18 Apr", "April 18th")
- "wrong_year": extracted dates use a year that looks wrong given the trip context
- "missing_time": several activities have no time information
- "other": any other ambiguity

IMPORTANT date rule: If a date in the document has NO YEAR, set dateHasYear=false and use ${currentYear} as placeholder. Do NOT silently guess a wrong year.

Return ONLY valid JSON (no markdown):
{
  "days": [
    {
      "dayNumber": 1,
      "date": "YYYY-MM-DD",
      "dateHasYear": true,
      "activities": [
        {
          "name": "string",
          "description": "string",
          "startTime": "HH:MM or null",
          "type": "flight|hotel|food|landmark|transport|other",
          "imageKeyword": "keyword",
          "location": { "lat": 0, "lng": 0 }
        }
      ]
    }
  ],
  "issues": [
    {
      "type": "missing_year|wrong_year|missing_time|other",
      "message": "Plain English description of the issue",
      "field": "year|time|date|other",
      "suggestion": "suggested fix value or null"
    }
  ],
  "summary": "e.g., Found 5 days and 12 activities across 3 documents."
}`;

        const text = await this.callProxy(prompt, fileParts);
        const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
        return JSON.parse(jsonStr);
    }

    // Same as analyzeDocuments but uses URLs — proxy downloads files server-side
    async analyzeDocumentsByUrl(
        documentUrls: Array<{ url: string; mimeType: string }>,
        tripContext: { destination: string; startDate?: string }
    ): Promise<{
        days: any[];
        issues: Array<{ type: string; message: string; field: string; suggestion?: string }>;
        summary: string;
    }> {
        const currentYear = new Date().getFullYear();
        const prompt = `
You are a professional Travel Itinerary Parser.
Trip destination: ${tripContext.destination}.
Trip start date hint: ${tripContext.startDate || "not provided"}.
Current year: ${currentYear}.

TASK 1 — Extract all bookings and activities: flights, hotel check-ins/outs, tours, transfers.

TASK 2 — Detect issues that need user confirmation before building the timeline:
- "missing_year": dates in the document have only day+month, no year (e.g., "18 Apr", "April 18th")
- "wrong_year": extracted dates use a year that looks wrong given the trip context
- "missing_time": several activities have no time information
- "other": any other ambiguity

IMPORTANT date rule: If a date in the document has NO YEAR, set dateHasYear=false and use ${currentYear} as placeholder. Do NOT silently guess a wrong year.

Return ONLY valid JSON (no markdown):
{
  "days": [
    {
      "dayNumber": 1,
      "date": "YYYY-MM-DD",
      "dateHasYear": true,
      "activities": [
        {
          "name": "string",
          "description": "string",
          "startTime": "HH:MM or null",
          "type": "flight|hotel|food|landmark|transport|other",
          "imageKeyword": "keyword",
          "location": { "lat": 0, "lng": 0 }
        }
      ]
    }
  ],
  "issues": [
    {
      "type": "missing_year|wrong_year|missing_time|other",
      "message": "Plain English description of the issue",
      "field": "year|time|date|other",
      "suggestion": "suggested fix value or null"
    }
  ],
  "summary": "e.g., Found 5 days and 12 activities across 3 documents."
}`;

        const text = await this.callProxyWithUrls(prompt, documentUrls);
        const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
        return JSON.parse(jsonStr);
    }

    async extractTravelerFromPassport(
        file: File
    ): Promise<{ name: string; age: string; dob: string; gender: string }> {
        const fileParts = await this.filesToParts([file]);

        const prompt = `
You are a data extraction assistant.
Analyze the attached Passport document image.

INSTRUCTIONS:
Extract the following details from the passport:
1. Full Name
2. Date of Birth (format: YYYY-MM-DD)
3. Calculate Age based on Date of Birth relative to today.
4. Gender (male, female, or other)

Return ONLY a valid JSON object. No markdown, no conversational text.

JSON SCHEMA:
{
    "name": "Full Name",
    "dob": "YYYY-MM-DD",
    "age": "number as string",
    "gender": "male"
}
`;

        const text = await this.callProxy(prompt, fileParts);
        const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
        return JSON.parse(jsonStr);
    }

    async getDestinationImage(destination: string): Promise<string> {
        const fallback = `https://placehold.co/800x600/EEE/31343C?text=${encodeURIComponent(destination)}`;

        try {
            const prompt = `What is the EXACT English Wikipedia page title for the most famous, iconic, and visually striking landmark or city center in or associated with "${destination}"?
Return ONLY the exact Wikipedia page title.
Example: If destination is France, return "Eiffel Tower". If destination is Rome, return "Colosseum".
Do not write any introductory text, quotes, or punctuation.`;

            const wikiTitle = (await this.callProxy(prompt, [], ["gemini-2.5-flash"]))
                .trim()
                .replace(/['"]/g, "");

            const tryWiki = async (title: string) => {
                const url = `https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&titles=${encodeURIComponent(title)}&format=json&pithumbsize=1000&origin=*`;
                const data = await (await fetch(url)).json();
                const pages = data?.query?.pages;
                if (pages) {
                    const page = pages[Object.keys(pages)[0]];
                    if (page?.thumbnail?.source) return page.thumbnail.source as string;
                }
                return null;
            };

            return (await tryWiki(wikiTitle)) ?? (await tryWiki(destination)) ?? fallback;
        } catch {
            return fallback;
        }
    }

    async generateItineraryFromInputs(
        destination: string,
        startDate: string,
        numDays: number,
        notes = ''
    ): Promise<{ days: any[]; summary: string }> {
        const notesSection = notes.trim() ? `\nSPECIAL PREFERENCES / NOTES FROM TRAVELER: "${notes.trim()}"\nTailor the itinerary to respect these preferences — e.g. if they say "by train", include train travel; if "offbeat", skip touristy spots and suggest hidden gems; if "road trip", structure around driving routes.\n` : '';
        const prompt = `You are an expert travel planner with deep knowledge of tourist destinations worldwide.

Create a detailed ${numDays}-day travel itinerary for a trip to "${destination}" starting on ${startDate}.
${notesSection}
Use your knowledge of top-rated attractions, landmarks, and experiences from sources like TripAdvisor, Google Travel, and Lonely Planet for this destination.

RULES:
- Include 3-5 activities per day, spread morning / afternoon / evening
- Mix sightseeing, food experiences, and local culture
- Use real, well-known places and attractions for "${destination}"
- Include realistic start times for each activity
- Provide accurate GPS coordinates for every activity
- Day 1 date = ${startDate}, increment by 1 day for each subsequent day

Return ONLY valid JSON (no markdown, no explanation):
{
  "days": [
    {
      "dayNumber": 1,
      "date": "YYYY-MM-DD",
      "activities": [
        {
          "name": "Place or Activity Name",
          "description": "Brief description of what to do / see",
          "startTime": "HH:MM",
          "type": "flight|hotel|food|landmark|transport|other",
          "imageKeyword": "search keyword for image",
          "location": { "lat": 0.0, "lng": 0.0 }
        }
      ]
    }
  ],
  "summary": "e.g., Generated a ${numDays}-day itinerary for ${destination} with top attractions."
}`;

        const text = await this.callProxy(prompt, [], ['gemini-2.5-pro', 'gemini-2.5-flash']);
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(jsonStr);
    }

    async generatePackingList(destination: string, numDays: number, startDate: string, originCountry = ''): Promise<Array<{ category: string; items: string[] }>> {
        const month = new Date(startDate).toLocaleString('en', { month: 'long' });
        const isInternational = originCountry ? `The traveler is from ${originCountry}.` : '';
        const prompt = `You are a no-nonsense travel packing expert. Your job is to list only NEEDS — things that will genuinely cause problems if forgotten. Skip obvious daily-life items (toothbrush, underwear, etc.) unless the destination or weather makes them non-obvious.

Trip: ${numDays} days in "${destination}", starting in ${month}. ${isInternational}

Return exactly 3 categories in this order. Keep each to 4-7 items maximum — only the most critical ones.

CATEGORY 1 — "Documents":
- If destination is within the same country as traveler: skip passport, include only local ID/driving licence if useful, permits (e.g. forest/national park entry permits for that destination), bookings confirmations.
- If international: passport, visa (if required for that nationality), travel insurance, vaccination certificates only if legally required.
- Always include: trip booking confirmations, hotel vouchers.
- If destination is known for specific permits (e.g. trekking permits for Himalayas, e-visa for certain countries): include them.

CATEGORY 2 — "Weather Essentials":
- Research the typical weather for "${destination}" in ${month}.
- If cold/snow: warm layers, waterproof jacket, gloves, thermal base layer.
- If hot/humid: light breathable clothing, sunscreen SPF50+, hat, insect repellent if mosquito-prone.
- If rainy season: compact umbrella or rain poncho.
- If beach: swimwear, reef-safe sunscreen, flip flops.
- Only include items the weather genuinely demands — skip if weather is mild and unremarkable.

CATEGORY 3 — "Essentials":
- Phone charger + adapter (only if international voltage/plug differs).
- Portable power bank.
- Basic medicines: pain reliever, antidiarrheal, antihistamine — especially if destination has food/water risks.
- Cash in local currency (if destination is cash-heavy).
- Any destination-specific essential (e.g. mosquito net for rural Southeast Asia, altitude sickness pills for high-altitude destinations).
- Skip anything the average person already carries daily.

Return ONLY valid JSON (no markdown, no explanation):
[
  { "category": "Documents", "items": ["item1", "item2"] },
  { "category": "Weather Essentials", "items": ["item1", "item2"] },
  { "category": "Essentials", "items": ["item1", "item2"] }
]`;

        const text = await this.callProxy(prompt, [], ['gemini-2.5-flash']);
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(jsonStr);
    }

    async getCoordinates(placeName: string): Promise<{ lat: number; lng: number } | null> {
        try {
            const prompt = `Return the approximate geographical coordinates (latitude and longitude) for "${placeName}".
Format: JSON only. Example: {"lat": 23.0225, "lng": 72.5714}
No text, no explanation.`;

            const text = await this.callProxy(prompt, [], ["gemini-2.5-flash"]);
            const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
            return JSON.parse(jsonStr);
        } catch {
            return null;
        }
    }

    async resolveLocationContext(
        activityName: string,
        activityDesc: string,
        destination: string
    ): Promise<string | null> {
        try {
            const prompt = `
Analyze this travel activity in the destination of ${destination}.
Name: ${activityName}
Description: ${activityDesc || "none"}

Does this activity mention a specific physical place that can be mapped on a GPS? (e.g. "Airport", "Specific Hotel", "Landmark")
Generic things like "Dinner", "Rest Time", "Transfer", "Private car", "Room Charge" are NO.
If YES, extract the precise location name combined with the destination (e.g. "Singapore Changi Airport, Singapore").
If NO, return exactly "null".
Respond with nothing else.`;

            const text = (await this.callProxy(prompt, [], ["gemini-2.5-flash"])).trim();
            if (text === "null" || text.toLowerCase().includes("null")) return null;
            return text;
        } catch {
            return null;
        }
    }
}

export const geminiService = new GeminiService();
