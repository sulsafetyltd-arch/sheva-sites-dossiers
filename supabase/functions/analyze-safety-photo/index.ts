import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DOMAIN_PROMPTS: Record<string, string> = {
  construction: "אתר בנייה – פיגומים, PPE, פתחים, חשמל זמני, פסולת",
  factory: "מפעל – מכונות, חומ״ס, מילוט, כיבוי אש, רעש",
  office: "משרדים – יציאות חירום, כבלים, מטפים, עומס חשמלי",
  warehouse: "מחסן – מדפים, מלגזות, תאורה, החלקה",
  public: "מבנה ציבורי – מילוט, מעקות, צפיפות",
  general: "סביבת עבודה כללית – PPE, סדר, שילוט, עזרה ראשונה",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY not configured", findings: [] }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const domain = body.domain ?? "general";
    const imageUrls: string[] = (body.imageUrls ?? []).slice(0, 4);
    const notes: string = body.notes ?? "";
    const siteName: string = body.siteName ?? "";

    if (imageUrls.length === 0) {
      return new Response(JSON.stringify({ findings: [], summary: "אין תמונות" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const domainHint = DOMAIN_PROMPTS[domain] ?? DOMAIN_PROMPTS.general;

    const content: Array<Record<string, unknown>> = [
      {
        type: "text",
        text: `אתה מפקח בטיחות מוסמך בישראל. נתח את התמונות וזהה ליקויי בטיחות בתחום: ${domainHint}.
אתר: ${siteName || "לא צוין"}
הערות שטח: ${notes || "אין"}

החזר JSON בלבד במבנה:
{
  "summary": "סיכום קצר בעברית",
  "findings": [
    {
      "title": "שם הליקוי",
      "description": "תיאור מה שנראה",
      "severity": "critical|high|medium|low",
      "category": "קטגוריה",
      "regulationHint": "אזכור תקנה רלוונטית",
      "recommendation": "המלצת תיקון",
      "confidence": 0.0-1.0,
      "locationNote": "מיקום בתמונה אם רלוונטי"
    }
  ]
}
זהה רק ליקויים שנראים סבירים מהתמונות. כתוב הכל בעברית.`,
      },
      ...imageUrls.map((url) => ({
        type: "image_url",
        image_url: { url, detail: "low" },
      })),
    ];

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "מפקח בטיחות ישראלי. משיב רק ב-JSON תקין." },
          { role: "user", content },
        ],
        max_tokens: 2000,
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      console.error("OpenAI error:", errText);
      return new Response(JSON.stringify({ findings: [], error: "vision_failed" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const completion = await openaiRes.json();
    const raw = completion.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw);

    return new Response(
      JSON.stringify({
        findings: parsed.findings ?? [],
        summary: parsed.summary ?? "",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ findings: [], error: String(err) }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
