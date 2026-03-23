import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { BASE_RESUME } from "@/data";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { jobDescription } = await req.json();
    if (!jobDescription) return NextResponse.json({ error: "No job description" }, { status: 400 });

    const prompt = `You are an expert resume writer and ATS optimization specialist.

Here is the candidate's base resume:
<resume>
${BASE_RESUME}
</resume>

Here is the job description to tailor for:
<job_description>
${jobDescription}
</job_description>

Your task:
1. Identify the top 12-15 keywords/skills from the JD that are most critical for ATS scoring
2. Determine which are already in the resume (matchedKeywords) vs missing (missingKeywords)
3. Rewrite the resume to maximize keyword match — reorder/rephrase bullets, naturally embed missing keywords without fabricating experience
4. Compute ATS match score (0-100) before and after tailoring
5. Keep the same resume structure and length — just optimize the language

Return ONLY valid JSON, no markdown fences, no text before or after. Use this exact structure:
{
  "jobTitle": "string",
  "company": "string",
  "matchScoreBefore": 0,
  "matchScoreAfter": 0,
  "matchedKeywords": [],
  "missingKeywords": [],
  "addedKeywords": [],
  "tailoredResume": "full resume as a single string with \\n for newlines"
}`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .trim();

    const first = raw.indexOf("{");
    const last = raw.lastIndexOf("}");
    if (first === -1 || last === -1) throw new Error("No JSON in response");

    const parsed = JSON.parse(raw.slice(first, last + 1));
    return NextResponse.json(parsed);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
