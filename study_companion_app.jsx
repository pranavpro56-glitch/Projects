import React, { useState, useEffect, useRef } from "react";

// StudyCompanionApp.jsx
// Single-file React component (Tailwind CSS classes used). Default-exported component
// Features implemented:
// - Simple navigation (Dashboard, Upload, Assessments, Profile)
// - File upload (text files supported). PDF upload placeholder (see comments).
// - Automated assessment generator (MCQ / Short Answer) that extracts sentences heuristically.
// - Simple analytics visualization using recharts (install this dependency in your project).
// - Profile form that accepts syllabus, institution, educational qualification, nationality
//   and stores preferences to localStorage to make suggestions more personalized.
// - Simulated AI-based suggestions (deterministic rules + local heuristics).
//
// Notes for real integration:
// - For robust PDF parsing use `pdfjs-dist` in the client or perform server-side ingestion.
// - For stronger question generation and personalized recommendations, replace the
//   heuristic functions with calls to an AI endpoint and persist data in a DB.

// If you copy this into a React project, make sure to:
// 1) Have Tailwind configured or replace classes with your CSS.
// 2) Install recharts if you want the charts to render: `npm install recharts`
// 3) Optionally add `pdfjs-dist` for PDF parsing.

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";

export default function StudyCompanionApp() {
  const [route, setRoute] = useState("dashboard");

  // Profile data
  const [profile, setProfile] = useState({
    name: "",
    institution: "",
    syllabus: "",
    qualification: "",
    nationality: "",
    learningStyle: "",
  });

  // Uploaded document content (plain text) and metadata
  const [documents, setDocuments] = useState([]);
  const fileInputRef = useRef();

  // Generated assessments and analytics
  const [assessments, setAssessments] = useState([]);
  const [progressData, setProgressData] = useState(sampleProgress());

  useEffect(() => {
    // load from localStorage
    const p = localStorage.getItem("sc_profile");
    const docs = localStorage.getItem("sc_documents");
    const asses = localStorage.getItem("sc_assessments");
    if (p) setProfile(JSON.parse(p));
    if (docs) setDocuments(JSON.parse(docs));
    if (asses) setAssessments(JSON.parse(asses));
  }, []);

  useEffect(() => {
    localStorage.setItem("sc_profile", JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem("sc_documents", JSON.stringify(documents));
  }, [documents]);

  useEffect(() => {
    localStorage.setItem("sc_assessments", JSON.stringify(assessments));
  }, [assessments]);

  function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    const name = file.name;
    const size = file.size;

    if (file.type === "text/plain" || name.endsWith(".txt")) {
      reader.onload = (ev) => {
        const text = ev.target.result;
        const doc = { id: Date.now(), name, size, text, uploadedAt: new Date().toISOString() };
        setDocuments((s) => [doc, ...s]);
        setRoute("upload");
      };
      reader.readAsText(file);
    } else if (file.type === "application/pdf" || name.endsWith(".pdf")) {
      // Placeholder: PDF parsing requires pdfjs or server-side parsing.
      // Here we just store a stub and inform the user.
      const doc = { id: Date.now(), name, size, text: "[PDF parsing required]", uploadedAt: new Date().toISOString(), pdfStub: true };
      setDocuments((s) => [doc, ...s]);
      alert("PDF uploaded. For full text extraction, enable pdf parsing (pdfjs) or use server-side ingestion.");
    } else {
      // try reading as text anyway
      reader.onload = (ev) => {
        const text = ev.target.result;
        const doc = { id: Date.now(), name, size, text, uploadedAt: new Date().toISOString() };
        setDocuments((s) => [doc, ...s]);
        setRoute("upload");
      };
      reader.readAsText(file);
    }
  }

  function generateAssessmentFromDoc(docId, type = "mcq", limit = 5) {
    const doc = documents.find((d) => d.id === docId);
    if (!doc) return;
    const sentences = extractSentences(doc.text);
    const picks = pickSentences(sentences, limit);
    const items = picks.map((s, i) => {
      if (type === "mcq") {
        const choices = makeDistractors(s, sentences, 3);
        return { id: Date.now() + i, type: "mcq", question: `What best explains: \"${shorten(s, 120)}\"?`, choices, answer: choices[0] };
      }
      return { id: Date.now() + i, type: "short", question: `Explain: \"${shorten(s, 120)}\"`, answer: s };
    });
    const assessment = { id: Date.now(), docId, title: `Auto Assessment - ${doc.name}`, items, createdAt: new Date().toISOString() };
    setAssessments((s) => [assessment, ...s]);
    setRoute("assessments");
  }

  function markAssessmentProgress(assessmentId) {
    // simulate progress update for analytics
    const newData = progressData.map((p) => ({ ...p }));
    const idx = Math.floor(Math.random() * newData.length);
    newData[idx].score = Math.min(100, newData[idx].score + Math.floor(Math.random() * 20));
    setProgressData(newData);
  }

  function updateProfileField(field, value) {
    setProfile((p) => ({ ...p, [field]: value }));
  }

  function generateAISuggestions() {
    // Simulated AI suggestions using profile info and documents.
    const base = [];
    if (profile.qualification.toLowerCase().includes("bachelor") || profile.qualification.toLowerCase().includes("undergrad")) {
      base.push("Focus on conceptual depth and past-year exam patterns.");
    }
    if (profile.syllabus.toLowerCase().includes("math") || profile.syllabus.toLowerCase().includes("calculus")) {
      base.push("Do daily problem sets; mix timed quizzes and long-form proofs.");
    }
    if (profile.nationality && profile.nationality.toLowerCase() === "india") {
      base.push("Balance board-style MCQs with subjective practice (common in many Indian exams).");
    }
    if (!profile.syllabus) base.push("Upload a syllabus or sample notes for more tailored suggestions.");

    // Add heuristics from documents: if there are many docs, suggest spaced repetition
    if (documents.length >= 3) base.push("Use spaced repetition: create flashcards from each doc's key facts.");

    // Infer learning style if provided
    if (profile.learningStyle) base.push(`Tailor materials to your learning style: ${profile.learningStyle}.`);

    // add prioritized recommendation
    const suggestions = base.length ? base : ["No profile data yet — fill in your profile for personalized suggestions."];
    return suggestions;
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="bg-white shadow p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">Study Companion</h1>
        <nav className="space-x-2">
          <button className={`px-3 py-1 rounded ${route === "dashboard" ? "bg-blue-600 text-white" : "bg-gray-100"}`} onClick={() => setRoute("dashboard")}>Dashboard</button>
          <button className={`px-3 py-1 rounded ${route === "upload" ? "bg-blue-600 text-white" : "bg-gray-100"}`} onClick={() => setRoute("upload")}>Upload</button>
          <button className={`px-3 py-1 rounded ${route === "assessments" ? "bg-blue-600 text-white" : "bg-gray-100"}`} onClick={() => setRoute("assessments")}>Assessments</button>
          <button className={`px-3 py-1 rounded ${route === "profile" ? "bg-blue-600 text-white" : "bg-gray-100"}`} onClick={() => setRoute("profile")}>Profile</button>
        </nav>
      </header>

      <main className="p-6">
        {route === "dashboard" && (
          <section>
            <h2 className="text-2xl font-semibold mb-4">Dashboard</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-white rounded shadow">
                <h3 className="font-medium">Your Profile</h3>
                <p className="text-sm mt-2">Name: {profile.name || "—"}</p>
                <p className="text-sm">Institution: {profile.institution || "—"}</p>
                <p className="text-sm">Syllabus: {profile.syllabus || "—"}</p>
                <p className="text-sm">Qualification: {profile.qualification || "—"}</p>
                <p className="text-sm">Nationality: {profile.nationality || "—"}</p>
                <div className="mt-3">
                  <button className="px-3 py-1 bg-green-600 text-white rounded" onClick={() => setRoute("profile")}>Edit profile</button>
                </div>
              </div>

              <div className="p-4 bg-white rounded shadow">
                <h3 className="font-medium">Quick Upload</h3>
                <p className="text-sm mt-2">Upload text or PDF notes to create auto-assessments and flashcards.</p>
                <input ref={fileInputRef} type="file" onChange={handleFileUpload} className="mt-3" />
              </div>

              <div className="p-4 bg-white rounded shadow">
                <h3 className="font-medium">AI Suggestions</h3>
                <ul className="list-disc ml-5 mt-2 text-sm">
                  {generateAISuggestions().map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
                <div className="mt-3">
                  <button className="px-3 py-1 bg-indigo-600 text-white rounded" onClick={() => setRoute("profile")}>Refine profile</button>
                </div>
              </div>
            </div>

            <section className="mt-6 bg-white p-4 rounded shadow">
              <h3 className="font-medium mb-3">Progress Overview</h3>
              <div style={{ height: 240 }}>
                <ResponsiveContainer>
                  <LineChart data={progressData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="score" stroke="#8884d8" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>
          </section>
        )}

        {route === "upload" && (
          <section>
            <h2 className="text-2xl font-semibold mb-4">Uploads & Documents</h2>
            <div className="mb-4 p-4 bg-white rounded shadow">
              <input type="file" onChange={handleFileUpload} />
              <p className="text-sm mt-2">Supported: .txt (fully parsed). For PDFs, enable PDF parsing in project.</p>
            </div>

            <div className="space-y-3">
              {documents.length === 0 && <div className="p-4 bg-white rounded shadow">No documents uploaded yet.</div>}
              {documents.map((d) => (
                <div key={d.id} className="p-4 bg-white rounded shadow flex justify-between items-start">
                  <div>
                    <div className="font-semibold">{d.name}</div>
                    <div className="text-xs text-gray-600">Uploaded: {new Date(d.uploadedAt).toLocaleString()}</div>
                    <div className="mt-2 text-sm max-w-prose whitespace-pre-wrap text-gray-800">{shorten(d.text, 800)}</div>
                  </div>
                  <div className="flex flex-col items-end space-y-2">
                    <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={() => generateAssessmentFromDoc(d.id, "mcq", 4)}>Generate MCQs</button>
                    <button className="px-3 py-1 bg-yellow-500 text-white rounded" onClick={() => generateAssessmentFromDoc(d.id, "short", 4)}>Generate Short-Answers</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {route === "assessments" && (
          <section>
            <h2 className="text-2xl font-semibold mb-4">Assessments</h2>
            <div className="space-y-4">
              {assessments.length === 0 && <div className="p-4 bg-white rounded shadow">No assessments generated yet.</div>}
              {assessments.map((a) => (
                <div key={a.id} className="p-4 bg-white rounded shadow">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-semibold">{a.title}</div>
                      <div className="text-xs text-gray-600">Created: {new Date(a.createdAt).toLocaleString()}</div>
                    </div>
                    <div>
                      <button className="px-3 py-1 bg-green-600 text-white rounded" onClick={() => markAssessmentProgress(a.id)}>Simulate Complete</button>
                    </div>
                  </div>

                  <ol className="mt-3 space-y-2">
                    {a.items.map((it) => (
                      <li key={it.id} className="p-2 border rounded">
                        <div className="font-medium">{it.question}</div>
                        {it.type === "mcq" && (
                          <ul className="mt-2 list-disc ml-5">
                            {it.choices.map((c, i) => (
                              <li key={i}>{c}</li>
                            ))}
                          </ul>
                        )}
                        <details className="mt-2">
                          <summary className="text-sm text-gray-600">Show answer / explanation</summary>
                          <div className="mt-2 text-sm bg-gray-100 p-2 rounded">{shorten(it.answer, 600)}</div>
                        </details>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          </section>
        )}

        {route === "profile" && (
          <section>
            <h2 className="text-2xl font-semibold mb-4">Student Profile & AI Suggestions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <form className="p-4 bg-white rounded shadow space-y-3" onSubmit={(e) => e.preventDefault()}>
                <label className="block">
                  <div className="text-sm font-medium">Full name</div>
                  <input className="mt-1 w-full p-2 border rounded" value={profile.name} onChange={(e) => updateProfileField("name", e.target.value)} />
                </label>

                <label className="block">
                  <div className="text-sm font-medium">Institution</div>
                  <input className="mt-1 w-full p-2 border rounded" value={profile.institution} onChange={(e) => updateProfileField("institution", e.target.value)} />
                </label>

                <label className="block">
                  <div className="text-sm font-medium">Syllabus / Major Subjects</div>
                  <input className="mt-1 w-full p-2 border rounded" value={profile.syllabus} onChange={(e) => updateProfileField("syllabus", e.target.value)} placeholder="e.g. Calculus, Data Structures" />
                </label>

                <label className="block">
                  <div className="text-sm font-medium">Educational qualification</div>
                  <input className="mt-1 w-full p-2 border rounded" value={profile.qualification} onChange={(e) => updateProfileField("qualification", e.target.value)} placeholder="e.g. Bachelor's in CS" />
                </label>

                <label className="block">
                  <div className="text-sm font-medium">Nationality</div>
                  <input className="mt-1 w-full p-2 border rounded" value={profile.nationality} onChange={(e) => updateProfileField("nationality", e.target.value)} />
                </label>

                <label className="block">
                  <div className="text-sm font-medium">Preferred learning style (optional)</div>
                  <select value={profile.learningStyle} onChange={(e) => updateProfileField("learningStyle", e.target.value)} className="mt-1 w-full p-2 border rounded">
                    <option value="">Auto-detect / not specified</option>
                    <option>Visual (diagrams & videos)</option>
                    <option>Textual (notes & readings)</option>
                    <option>Practice-heavy (problems & coding)</option>
                    <option>Spaced repetition (flashcards)</option>
                  </select>
                </label>

                <div className="flex gap-2">
                  <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={() => alert('Profile saved')}>Save</button>
                  <button className="px-3 py-1 bg-gray-200 rounded" onClick={() => { setProfile({ name: "", institution: "", syllabus: "", qualification: "", nationality: "", learningStyle: "" }); localStorage.removeItem('sc_profile'); }}>Reset</button>
                </div>
              </form>

              <div className="p-4 bg-white rounded shadow">
                <h3 className="font-medium">AI-based Unique Suggestions</h3>
                <p className="text-sm mt-2">The suggestions below are generated by deterministic heuristics in this demo. Replace the <code>generateAISuggestions</code> helper with an AI call for richer personalization.</p>
                <ul className="list-decimal ml-5 mt-3 text-sm">
                  {generateAISuggestions().map((s, i) => (
                    <li key={i} className="mb-2">{s}</li>
                  ))}
                </ul>

                <div className="mt-3">
                  <button className="px-3 py-1 bg-purple-600 text-white rounded" onClick={() => alert('Integrate an LLM or recommendation engine here for stronger suggestions')}>Integrate AI</button>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="p-4 text-center text-sm text-gray-600">Study Companion • Simple demo UI • Local-only data (stored in browser)</footer>
    </div>
  );
}

// ---------- Helper functions (kept outside component for clarity) ----------

function shorten(text = "", n = 200) {
  if (!text) return "(no content)";
  if (text.length <= n) return text;
  return text.slice(0, n) + "...";
}

function extractSentences(text = "") {
  if (!text) return [];
  // naive sentence splitter
  const s = text
    .replace(/\n/g, " ")
    .split(/(?<=[.?!])\s+(?=[A-Z0-9])/)
    .map((p) => p.trim())
    .filter(Boolean);
  return s;
}

function pickSentences(sentences, limit = 5) {
  if (!sentences || sentences.length === 0) return ["No content to generate from."];
  const out = [];
  for (let i = 0; i < limit; i++) {
    out.push(sentences[Math.floor(Math.random() * sentences.length)]);
  }
  return out;
}

function makeDistractors(seed, pool, num = 3) {
  // simplistic distractors: take other sentences trimmed to short phrases
  const candidates = pool.filter((p) => p !== seed).slice(0, 20);
  const distractors = [];
  for (let i = 0; i < num; i++) {
    const pick = candidates[Math.floor(Math.random() * candidates.length)] || "Review the text for details.";
    distractors.push(shorten(pick, 80));
  }
  // correct answer placed first
  return [shorten(seed, 80), ...distractors];
}

function sampleProgress() {
  return [
    { month: "Jan", score: 45 },
    { month: "Feb", score: 52 },
    { month: "Mar", score: 58 },
    { month: "Apr", score: 62 },
    { month: "May", score: 68 },
    { month: "Jun", score: 72 },
    { month: "Jul", score: 75 },
    { month: "Aug", score: 80 },
  ];
}
