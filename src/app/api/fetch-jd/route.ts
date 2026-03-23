import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: "No URL provided" }, { status: 400 });

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      tools: [{ type: "web_search_20250305" as const, name: "web_search" }],
      messages: [{
        role: "user",
        content: `Fetch the job description from this URL and return ONLY the plain text content of the job posting: ${url}
        Include: job title, company, location, about the role, responsibilities, required qualifications, preferred qualifications.
        Return only the job description text. No commentary, no formatting, no preamble.`
      }]
    });

    const text = response.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("\n")
      .trim();

    return NextResponse.json({ jobDescription: text });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
