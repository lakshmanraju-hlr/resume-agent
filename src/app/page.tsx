"use client";

import { useState, useEffect, useRef } from "react";
import { PROFILE, BASE_RESUME } from "@/data";

type TailorResult = {
  jobTitle: string;
  company: string;
  matchScoreBefore: number;
  matchScoreAfter: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  addedKeywords: string[];
  tailoredResume: string;
};

type LogLine = { text: string; type: "info" | "success" | "error" };

export default function Home() {
  const [tab, setTab] = useState<"tailor" | "autofill" | "profile">("tailor");
  const [jobUrl, setJobUrl] = useState("");
  const [jobDesc, setJobDesc] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [result, setResult] = useState<TailorResult | null>(null);
  const [copied, setCopied] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  const log = (text: string, type: LogLine["type"] = "info") =>
    setLogs((prev) => [...prev, { text, type }]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  async function handleTailor() {
    if (!jobUrl.trim() && !jobDesc.trim()) return;
    setLoading(true);
    setProgress(5);
    setLogs([]);
    setResult(null);

    try {
      let description = jobDesc.trim();

      if (jobUrl.trim() && !description) {
        log("Fetching job description from URL...");
        setProgress(15);
        const r = await fetch("/api/fetch-jd", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: jobUrl.trim() }),
        });
        const d = await r.json();
        if (d.error) throw new Error(d.error);
        description = d.jobDescription;
        log(`Job description loaded (${description.length} chars)`, "success");
        setProgress(35);
      }

      if (!description || description.length < 80) {
        log("Could not load job description. Please paste it manually.", "error");
        setLoading(false);
        return;
      }

      log("Sending to Claude for tailoring...");
      setProgress(45);

      const r2 = await fetch("/api/tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription: description }),
      });
      const data: TailorResult & { error?: string } = await r2.json();
      if (data.error) throw new Error(data.error);

      setProgress(100);
      log("Resume tailored successfully!", "success");
      log(`ATS score: ${data.matchScoreBefore} → ${data.matchScoreAfter} (+${data.matchScoreAfter - data.matchScoreBefore} pts)`, "success");
      setResult(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      log("Error: " + message, "error");
    }

    setLoading(false);
  }

  function downloadTxt() {
    if (!result) return;
    const blob = new Blob([result.tailoredResume], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const co = (result.company || "Company").replace(/[^a-zA-Z0-9]/g, "_");
    const ro = (result.jobTitle || "Role").replace(/[^a-zA-Z0-9]/g, "_").slice(0, 28);
    a.download = `Hemanth_${ro}_${co}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copyResume() {
    if (!result) return;
    await navigator.clipboard.writeText(result.tailoredResume);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Build bookmarklet
  const bookmarkletCode = `(function(){
var p={firstName:${JSON.stringify(PROFILE.firstName)},lastName:${JSON.stringify(PROFILE.lastName)},fullName:${JSON.stringify(PROFILE.fullName)},email:${JSON.stringify(PROFILE.email)},phone:${JSON.stringify(PROFILE.phone)},city:${JSON.stringify(PROFILE.city)},state:${JSON.stringify(PROFILE.state)},zip:${JSON.stringify(PROFILE.zip)},address:${JSON.stringify(PROFILE.address)},linkedin:${JSON.stringify(PROFILE.linkedin)},country:${JSON.stringify(PROFILE.country)},currentTitle:${JSON.stringify(PROFILE.currentTitle)},yearsExp:${JSON.stringify(PROFILE.yearsExp)},sponsorship:${JSON.stringify(PROFILE.sponsorship)},workAuth:${JSON.stringify(PROFILE.workAuth)},relocate:${JSON.stringify(PROFILE.willingToRelocate)},salary:${JSON.stringify(PROFILE.desiredSalary)},veteran:${JSON.stringify(PROFILE.veteran)},disability:${JSON.stringify(PROFILE.disability)}};
var filled=0;
function fill(el,val){if(!el||!val)return;var tag=el.tagName.toLowerCase();if(tag==='select'){var m=Array.from(el.options).find(function(o){return o.text.toLowerCase().includes(val.toLowerCase())||o.value.toLowerCase().includes(val.toLowerCase());});if(m){m.selected=true;el.dispatchEvent(new Event('change',{bubbles:true}));filled++;}return;}var s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value');if(s)s.set.call(el,val);else el.value=val;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));filled++;}
function match(el){var attrs=['name','id','placeholder','aria-label','autocomplete','data-field-id'];var t=attrs.map(function(a){return el.getAttribute(a)||'';}).join(' ').toLowerCase();var lbl='';if(el.id){var l=document.querySelector('label[for="'+el.id+'"]');if(l)lbl=l.textContent.toLowerCase();}var a=t+' '+lbl;if(/(first.?name|given.?name|fname)/i.test(a))fill(el,p.firstName);else if(/(last.?name|surname|family.?name|lname)/i.test(a))fill(el,p.lastName);else if(/(full.?name|your.?name)/i.test(a))fill(el,p.fullName);else if(/(email|e-mail)/i.test(a))fill(el,p.email);else if(/(phone|mobile|cell|telephone)/i.test(a))fill(el,p.phone);else if(/(linkedin)/i.test(a))fill(el,p.linkedin);else if(/(city)/i.test(a))fill(el,p.city);else if(/(state|province)/i.test(a))fill(el,p.state);else if(/(zip|postal)/i.test(a))fill(el,p.zip);else if(/(country)/i.test(a))fill(el,p.country);else if(/(address)/i.test(a))fill(el,p.address);else if(/(current.*title|job.*title|position)/i.test(a))fill(el,p.currentTitle);else if(/(years.*exp|experience.*years)/i.test(a))fill(el,p.yearsExp);else if(/(salary|compensation|pay)/i.test(a)&&p.salary)fill(el,p.salary);else if(/(sponsor|visa|work.?auth)/i.test(a))fill(el,p.workAuth);else if(/(relocat)/i.test(a))fill(el,p.relocate);else if(/(veteran)/i.test(a))fill(el,p.veteran);else if(/(disabilit)/i.test(a))fill(el,p.disability);}
document.querySelectorAll('input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=checkbox]):not([type=radio]),textarea,select').forEach(match);
var t=document.createElement('div');t.style.cssText='position:fixed;top:20px;right:20px;z-index:999999;background:'+(filled>0?'#3ecf8e':'#f5a623')+';color:#000;font-family:system-ui,sans-serif;font-weight:700;font-size:14px;padding:14px 20px;border-radius:10px;box-shadow:0 4px 20px rgba(0,0,0,0.3);';t.textContent=filled>0?'✓ Filled '+filled+' field'+(filled>1?'s':'')+'!':'⚠ No fields matched on this page.';document.body.appendChild(t);setTimeout(function(){t.style.opacity='0';t.style.transition='opacity 0.4s';setTimeout(function(){t.remove();},400);},3500);
})();`;

  const scoreColor = (s: number) => s >= 85 ? "#3ecf8e" : s >= 70 ? "#4f8ef7" : "#f5a623";
  const circumference = 2 * Math.PI * 30;

  const profileFields = [
    ["Full Name", PROFILE.fullName], ["Email", PROFILE.email],
    ["Phone", PROFILE.phone], ["Location", PROFILE.address],
    ["LinkedIn", PROFILE.linkedin], ["Current Title", PROFILE.currentTitle],
    ["Experience", PROFILE.yearsExp + " years"], ["Work Auth", PROFILE.workAuth],
    ["Sponsorship Needed", PROFILE.sponsorship], ["Willing to Relocate", PROFILE.willingToRelocate],
    ["Work Arrangement", PROFILE.workArrangement],
  ];

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", position: "relative", overflow: "hidden" }}>
      {/* Ambient glows */}
      <div style={{ position: "fixed", top: "-30%", left: "-15%", width: "60%", height: "60%", background: "radial-gradient(ellipse, rgba(79,142,247,0.07) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "fixed", bottom: "-25%", right: "-10%", width: "55%", height: "55%", background: "radial-gradient(ellipse, rgba(124,92,252,0.05) 0%, transparent 70%)", pointerEvents: "none" }} />

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "44px 24px 80px", position: "relative", zIndex: 1 }}>

        {/* Header */}
        <header className="fade-up" style={{ marginBottom: 44 }}>
          <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 11, letterSpacing: "0.18em", color: "var(--accent)", textTransform: "uppercase", marginBottom: 10 }}>
            // Job Application Agent
          </div>
          <h1 style={{ fontFamily: "var(--font-serif), serif", fontSize: "clamp(28px, 5vw, 40px)", lineHeight: 1.15, marginBottom: 10 }}>
            Apply{" "}
            <span style={{ fontStyle: "italic", background: "linear-gradient(135deg, var(--accent), var(--accent2))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              smarter,
            </span>{" "}
            not harder.
          </h1>
          <p style={{ color: "var(--muted2)", fontSize: 15, fontWeight: 300, lineHeight: 1.6 }}>
            Paste a job URL — get a tailored resume in seconds + autofill your details on any job board.
          </p>
        </header>

        {/* Tabs */}
        <div className="fade-up-1" style={{ display: "flex", gap: 4, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 5, marginBottom: 28 }}>
          {(["tailor", "autofill", "profile"] as const).map((t, i) => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: "10px 14px", borderRadius: 8, border: "none",
              background: tab === t ? "var(--surface2)" : "transparent",
              color: tab === t ? "var(--text)" : "var(--muted)",
              fontFamily: "var(--font-sans), sans-serif", fontSize: 14, fontWeight: 500,
              cursor: "pointer", transition: "all 0.2s",
              boxShadow: tab === t ? "0 1px 3px rgba(0,0,0,0.3)" : "none",
            }}>
              {["✦ Resume Tailor", "⚡ Autofill", "◎ Profile"][i]}
            </button>
          ))}
        </div>

        {/* ── TAB: TAILOR ── */}
        {tab === "tailor" && (
          <div className="fade-up-2">
            {/* Input card */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 28, marginBottom: 18 }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.15em", color: "var(--accent)", textTransform: "uppercase", marginBottom: 16 }}>Step 1 — Job Posting</div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--muted2)", marginBottom: 7 }}>Job posting URL</label>
                <input type="url" value={jobUrl} onChange={e => setJobUrl(e.target.value)}
                  placeholder="https://careers.company.com/job/12345"
                  onKeyDown={e => e.key === "Enter" && handleTailor()}
                  style={{ width: "100%", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text)", fontFamily: "inherit", fontSize: 14, padding: "11px 14px", outline: "none" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--muted2)", marginBottom: 7 }}>
                  Or paste the job description{" "}
                  <span style={{ color: "var(--muted)", fontWeight: 400 }}>(use this if URL is blocked)</span>
                </label>
                <textarea value={jobDesc} onChange={e => setJobDesc(e.target.value)}
                  placeholder="Paste the full job description here..."
                  rows={5}
                  style={{ width: "100%", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text)", fontFamily: "inherit", fontSize: 14, padding: "11px 14px", outline: "none", resize: "vertical", lineHeight: 1.5 }} />
              </div>
            </div>

            {/* Action card */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 28, marginBottom: 18 }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.15em", color: "var(--accent)", textTransform: "uppercase", marginBottom: 14 }}>Step 2 — Tailor &amp; Generate</div>
              <p style={{ fontSize: 13, color: "var(--muted2)", marginBottom: 18, lineHeight: 1.6 }}>
                Claude analyzes the JD, rewrites your bullets to maximize ATS match, and shows a before/after keyword score.
              </p>
              <button onClick={handleTailor} disabled={loading || (!jobUrl.trim() && !jobDesc.trim())} style={{
                width: "100%", padding: "14px", borderRadius: 10, border: "none",
                background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                color: "#fff", fontFamily: "inherit", fontSize: 15, fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading || (!jobUrl.trim() && !jobDesc.trim()) ? 0.55 : 1,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                boxShadow: "0 4px 14px rgba(79,142,247,0.25)", transition: "all 0.2s",
              }}>
                {loading ? <><span className="spinner" /> Tailoring...</> : "✦ Tailor My Resume"}
              </button>

              {/* Progress bar */}
              {(loading || progress > 0) && (
                <div style={{ background: "var(--border)", borderRadius: 99, height: 3, marginTop: 14, overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 99, background: "linear-gradient(90deg, var(--accent), var(--accent2))", width: `${progress}%`, transition: "width 0.5s ease" }} />
                </div>
              )}

              {/* Logs */}
              {logs.length > 0 && (
                <div ref={logRef} style={{
                  background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10,
                  padding: "12px 14px", marginTop: 14, fontFamily: "var(--font-mono), monospace",
                  fontSize: 12, maxHeight: 120, overflowY: "auto", lineHeight: 1.7
                }}>
                  {logs.map((l, i) => (
                    <div key={i} style={{ color: l.type === "success" ? "var(--green)" : l.type === "error" ? "var(--red)" : "var(--accent)" }}>
                      › {l.text}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Results */}
            {result && (
              <div className="fade-up" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 28 }}>
                <div style={{ fontSize: 17, fontFamily: "var(--font-serif)", marginBottom: 4 }}>
                  {result.jobTitle} @ {result.company}
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--muted)", marginBottom: 20 }}>
                  {(result.matchedKeywords?.length || 0) + (result.addedKeywords?.length || 0)} keywords matched · {new Date().toLocaleTimeString()}
                </div>

                {/* Score */}
                <div style={{ background: "var(--surface2)", borderRadius: 12, padding: "16px 20px", display: "flex", alignItems: "center", gap: 20, marginBottom: 24 }}>
                  <div style={{ position: "relative", width: 76, height: 76, flexShrink: 0 }}>
                    <svg width="76" height="76" viewBox="0 0 76 76" style={{ transform: "rotate(-90deg)" }}>
                      <circle cx="38" cy="38" r="30" fill="none" stroke="var(--border)" strokeWidth="6" />
                      <circle cx="38" cy="38" r="30" fill="none"
                        stroke={scoreColor(result.matchScoreAfter)} strokeWidth="6"
                        strokeDasharray={`${(result.matchScoreAfter / 100) * circumference} ${circumference}`}
                        strokeLinecap="round" />
                    </svg>
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-serif)", fontSize: 22 }}>
                      {result.matchScoreAfter}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 5 }}>
                      ATS Match Score{" "}
                      <span style={{ color: "var(--green)", fontSize: 13 }}>↑ +{result.matchScoreAfter - result.matchScoreBefore} pts</span>
                    </div>
                    <div style={{ fontSize: 13, color: "var(--muted2)", lineHeight: 1.6 }}>
                      Before: <strong>{result.matchScoreBefore}/100</strong> &nbsp;→&nbsp;
                      After: <strong style={{ color: scoreColor(result.matchScoreAfter) }}>{result.matchScoreAfter}/100</strong>
                      <br />
                      {result.matchScoreAfter >= 85 ? "🎯 Strong match — ready to apply!" : result.matchScoreAfter >= 70 ? "👍 Good match" : "⚠️ Moderate — review missing keywords"}
                    </div>
                  </div>
                </div>

                {/* Keywords */}
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--accent)" }} />
                  Keyword Analysis
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 10, fontFamily: "var(--font-mono)" }}>
                  <span style={{ color: "var(--green)" }}>■</span> Already matched &nbsp;
                  <span style={{ color: "var(--accent)" }}>■</span> Added &nbsp;
                  <span style={{ color: "var(--red)" }}>■</span> Still missing
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 22 }}>
                  {result.matchedKeywords?.map(k => (
                    <span key={k} style={{ background: "rgba(62,207,142,0.1)", border: "1px solid rgba(62,207,142,0.25)", color: "var(--green)", borderRadius: 99, padding: "3px 11px", fontSize: 12, fontFamily: "var(--font-mono)" }}>✓ {k}</span>
                  ))}
                  {result.addedKeywords?.map(k => (
                    <span key={k} style={{ background: "rgba(79,142,247,0.1)", border: "1px solid rgba(79,142,247,0.2)", color: "var(--accent)", borderRadius: 99, padding: "3px 11px", fontSize: 12, fontFamily: "var(--font-mono)" }}>+ {k}</span>
                  ))}
                  {result.missingKeywords?.map(k => (
                    <span key={k} style={{ background: "rgba(247,107,107,0.08)", border: "1px solid rgba(247,107,107,0.2)", color: "var(--red)", borderRadius: 99, padding: "3px 11px", fontSize: 12, fontFamily: "var(--font-mono)" }}>✗ {k}</span>
                  ))}
                </div>

                {/* Preview */}
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--accent)" }} />
                  Tailored Resume Preview
                </div>
                <pre style={{
                  fontFamily: "var(--font-mono), monospace", fontSize: 11, lineHeight: 1.7,
                  color: "var(--muted2)", background: "var(--bg)", border: "1px solid var(--border)",
                  borderRadius: 10, padding: 16, maxHeight: 260, overflowY: "auto",
                  whiteSpace: "pre-wrap", wordBreak: "break-word", marginBottom: 20
                }}>
                  {result.tailoredResume}
                </pre>

                {/* Actions */}
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button onClick={downloadTxt} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 20px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, var(--accent), var(--accent2))", color: "#fff", fontFamily: "inherit", fontSize: 14, fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 14px rgba(79,142,247,0.2)" }}>
                    ⬇ Download .txt
                  </button>
                  <button onClick={copyResume} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 20px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface2)", color: copied ? "var(--green)" : "var(--text)", fontFamily: "inherit", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                    {copied ? "✓ Copied!" : "⎘ Copy Text"}
                  </button>
                  {jobUrl && (
                    <a href={jobUrl} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 20px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface2)", color: "var(--text)", fontFamily: "inherit", fontSize: 14, fontWeight: 600, textDecoration: "none" }}>
                      ↗ Open Job Page
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB: AUTOFILL ── */}
        {tab === "autofill" && (
          <div className="fade-up-2">
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 28, marginBottom: 18 }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.15em", color: "var(--accent)", textTransform: "uppercase", marginBottom: 16 }}>Autofill Bookmarklet</div>
              <p style={{ fontSize: 13, color: "var(--muted2)", lineHeight: 1.7, marginBottom: 24 }}>
                Drag the button below to your browser&apos;s bookmarks bar. On any job application page, click it — your details fill in automatically.
              </p>
              <div style={{ textAlign: "center", padding: "20px 0 10px" }}>
                <a href={`javascript:${encodeURIComponent(bookmarkletCode)}`}
                  onClick={e => e.preventDefault()}
                  draggable
                  style={{ display: "inline-flex", alignItems: "center", gap: 9, background: "linear-gradient(135deg, #f5a623, #f76b6b)", color: "#fff", padding: "13px 24px", borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: "grab", textDecoration: "none", boxShadow: "0 4px 16px rgba(245,166,35,0.35)", userSelect: "none" }}>
                  ⚡ Autofill — Hemanth
                </a>
                <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 10 }}>← Drag this to your bookmarks bar</p>
              </div>

              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 22, marginTop: 22 }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>How to use</div>
                {[
                  "Drag the orange button above to your browser's bookmarks bar",
                  "Navigate to any job application page",
                  'Click the "⚡ Autofill — Hemanth" bookmark in your bar',
                  "Your name, email, phone, LinkedIn, location, work auth, etc. fill in instantly",
                  "Review, upload your tailored resume, and submit!",
                ].map((step, i) => (
                  <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 12 }}>
                    <div style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--surface2)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--accent)", flexShrink: 0, marginTop: 1 }}>
                      {i + 1}
                    </div>
                    <span style={{ fontSize: 13, color: "var(--muted2)", lineHeight: 1.6 }}>{step}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 28 }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.15em", color: "var(--accent)", textTransform: "uppercase", marginBottom: 16 }}>Supported Platforms</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {[["✓ Workday", "green"], ["✓ Greenhouse", "green"], ["✓ Lever", "green"], ["✓ LinkedIn Easy Apply", "green"], ["✓ iCIMS", "green"], ["✓ SmartRecruiters", "green"], ["~ Company career pages", "blue"], ["Fields vary by site", "amber"]].map(([label, c]) => (
                  <span key={label} style={{
                    background: c === "green" ? "rgba(62,207,142,0.1)" : c === "blue" ? "rgba(79,142,247,0.1)" : "rgba(245,166,35,0.1)",
                    border: `1px solid ${c === "green" ? "rgba(62,207,142,0.25)" : c === "blue" ? "rgba(79,142,247,0.2)" : "rgba(245,166,35,0.2)"}`,
                    color: c === "green" ? "var(--green)" : c === "blue" ? "var(--accent)" : "var(--amber)",
                    borderRadius: 99, padding: "4px 12px", fontSize: 12, fontFamily: "var(--font-mono)"
                  }}>{label}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: PROFILE ── */}
        {tab === "profile" && (
          <div className="fade-up-2">
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 28, marginBottom: 18 }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.15em", color: "var(--accent)", textTransform: "uppercase", marginBottom: 16 }}>Your Profile</div>
              <p style={{ fontSize: 13, color: "var(--muted2)", marginBottom: 18, lineHeight: 1.6 }}>Baked into the autofill bookmarklet and used as the base for every tailored resume.</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
                {profileFields.map(([label, val]) => (
                  <div key={label} style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px" }}>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{val}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 28 }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.15em", color: "var(--accent)", textTransform: "uppercase", marginBottom: 12 }}>Base Resume</div>
              <p style={{ fontSize: 13, color: "var(--muted2)", marginBottom: 14 }}>This is the resume that gets tailored for each application.</p>
              <pre style={{ fontFamily: "var(--font-mono), monospace", fontSize: 11, lineHeight: 1.7, color: "var(--muted2)", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10, padding: 16, maxHeight: 320, overflowY: "auto", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {BASE_RESUME}
              </pre>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
