import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: "No URL provided" }, { status: 400 });

    // Use fetch directly to avoid SDK type constraints on newer tool types
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "web-search-2025-03-05",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 2000,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [{
          role: "user",
          content: `Fetch the job description from this URL and return ONLY the plain text content: ${url}
Include: job title, company, location, responsibilities, required qualifications, preferred qualifications.
Return only the job description text. No commentary, no preamble.`,
        }],
      }),
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message ?? "API error");

    const text = (data.content ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((b: any) => (b.type === "text" ? b.text : ""))
      .join("\n")
      .trim();

    return NextResponse.json({ jobDescription: text });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
