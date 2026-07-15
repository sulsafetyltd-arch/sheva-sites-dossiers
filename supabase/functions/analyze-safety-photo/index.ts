import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DOMAIN_PROMPTS: Record<string, string> = {
  construction: "אתר בנייה – פיגומים, PPE, פתחים, חשמל זמני, פסולת בנייה, עבודה בגובה",
  factory: "מפעל – מכונות ללא מגן, חומ״ס, מילוט, כיבוי אש, רעש, LOTO",
  office: "משרדים – יציאות חירום, כבלים במעבר, מטפים, עומס חשמלי, אחסון גבוה",
  warehouse: "מחסן – מדפים פגומים, מלגזות, תאורה, החלקה, מעברי מילוט",
  public: "מבנה ציבורי – מילוט, מעקות, צפיפות, שילוט חירום",
  infrastructure:
    "תשתיות – חפירות/תעלות ללא גידור, שוחות פתוחות, כבלים וצנרת חשופים, הסדרי תנועה, מעקות דרך, חללים מוקפים, קווי מתח עיליים, עבודת לילה",
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
    const imageUrls: string[] = (body.imageUrls ?? []).slice(0, 6);
    const notes: string = body.notes ?? "";
    const siteName: string = body.siteName ?? "";
    const captions: string[] = body.captions ?? [];
    const catalog: Array<{ id: string; title: string; severity: string; category: string; keywords: string[] }> =
      body.catalog ?? [];

    if (imageUrls.length === 0) {
      return new Response(JSON.stringify({ findings: [], summary: "אין תמונות" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const domainHint = DOMAIN_PROMPTS[domain] ?? DOMAIN_PROMPTS.general;
    const catalogBlock =
      catalog.length > 0
        ? catalog
            .slice(0, 16)
            .map(
              (d) =>
                `- id:${d.id} | ${d.title} | ${d.severity} | ${d.category} | ${((d.keywords as string[]) ?? []).join(",")}`,
            )
            .join("\n")
        : "(לא סופק קטלוג)";

    const captionBlock = captions
      .map((c: string, i: number) => `תמונה ${i + 1}: ${c || "ללא כיתוב"}`)
      .join("\n");

    const content: Array<Record<string, unknown>> = [
      {
        type: "text",
        text: `אתה מפקח בטיחות מוסמך בישראל עם ניסיון בתחום: ${domainHint}.

משימה: נתח כל תמונה בזהירות וזהה ליקויי בטיחות שניתן לראות בפועל.
אל תמציא ליקויים שלא נראים. העדף דיוק על פני כמות.
אם ממצא תואם לפריט בקטלוג – השתמש ב-catalogId שלו.

אתר: ${siteName || "לא צוין"}
הערות שטח: ${notes || "אין"}
כיתובי תמונות:
${captionBlock}

קטלוג ייחוס לתחום:
${catalogBlock}

החזר JSON בלבד:
{
  "summary": "סיכום קצר בעברית (עד 2 משפטים)",
  "findings": [
    {
      "title": "שם הליקוי בעברית",
      "description": "מה בדיוק נראה בתמונה (ראיות ויזואליות)",
      "severity": "critical|high|medium|low",
      "category": "קטגוריה",
      "regulationHint": "אזכור תקנה ישראלית רלוונטית",
      "recommendation": "פעולת תיקון מיידית וברורה",
      "confidence": 0.0,
      "locationNote": "באיזו תמונה/חלק בתמונה",
      "catalogId": "מזהה מהקטלוג אם תואם, אחרת השאר ריק",
      "photoIndex": 0
    }
  ]
}

כללים לדיוק:
1. confidence גבוה (>0.8) רק כשיש ראיה ויזואלית ברורה.
2. אם התמונה מטושטשת/לא רלוונטית – אל תוסיף ממצא או confidence נמוך.
3. אל תכפיל את אותו ליקוי ממספר זוויות.
4. חומרה critical רק לסכנת חיים מיידית (נפילה, התחשמלות, תנועה ללא הגנה, חפירה פתוחה וכו').
5. הכל בעברית.`,
      },
      ...imageUrls.map((url, index) => ({
        type: "image_url",
        image_url: {
          url,
          // high detail improves defect localization accuracy
          detail: index < 3 ? "high" : "low",
        },
      })),
    ];

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        temperature: 0.15,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "מפקח בטיחות ישראלי מדויק ושמרני. משיב רק JSON תקין. מעדיף פספוס על זיהוי שווא.",
          },
          { role: "user", content },
        ],
        max_tokens: 2800,
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
    let parsed: { findings?: unknown[]; summary?: string } = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { findings: [], summary: "" };
    }

    const findings = Array.isArray(parsed.findings) ? parsed.findings : [];

    return new Response(
      JSON.stringify({
        findings,
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
