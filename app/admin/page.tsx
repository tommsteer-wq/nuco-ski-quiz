"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

type SkiType = "chalet" | "apres" | "junkie" | "tourist" | "student";

interface Submission {
  id: string;
  email: string;
  personality_type: SkiType;
  created_at: string;
}

const personalityLabels: Record<SkiType, { name: string; emoji: string }> = {
  junkie: { name: "Adrenaline Junkie", emoji: "🎿" },
  apres: { name: "Après Legend", emoji: "🍺" },
  chalet: { name: "Chalet Crawler", emoji: "🛋️" },
  tourist: { name: "Tourist", emoji: "📸" },
  student: { name: "Eternal Student", emoji: "🍻" },
};

const TYPES: SkiType[] = ["junkie", "apres", "chalet", "tourist", "student"];

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [errorMsg, setErrorMsg] = useState("Incorrect password.");
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  const handleLogin = async () => {
    setStatus("loading");
    try {
      // Step 1: verify password server-side
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.error ?? "Incorrect password.");
        throw new Error(json.error);
      }

      // Step 2: fetch data from Supabase directly in the browser
      const { data, error } = await supabase
        .from("ski_quiz_results")
        .select("id, email, personality_type, created_at")
        .order("created_at", { ascending: false });

      if (error) {
        setErrorMsg(`Database error: ${error.message}`);
        throw new Error(error.message);
      }

      setSubmissions(data ?? []);
      setStatus("success");
    } catch {
      setStatus("error");
    }
  };

  const counts = TYPES.reduce<Record<SkiType, number>>(
    (acc, t) => ({ ...acc, [t]: submissions.filter((s) => s.personality_type === t).length }),
    { junkie: 0, apres: 0, chalet: 0, tourist: 0, student: 0 }
  );
  const topType = TYPES.sort((a, b) => counts[b] - counts[a])[0];

  const downloadCSV = () => {
    const rows = [
      ["Email", "Personality Type", "Date"],
      ...submissions.map((s) => [
        s.email,
        personalityLabels[s.personality_type]?.name ?? s.personality_type,
        new Date(s.created_at).toLocaleString("en-GB"),
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ski-quiz-submissions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const card: React.CSSProperties = {
    background: "#fff",
    borderRadius: 16,
    padding: "24px",
    boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
    border: "1px solid #e2e8f0",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg, #0f2744 0%, #1a3a5c 60%, #2d6a9f 100%)",
        padding: "48px 16px",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 32, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 32 }}>⛷️</span>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: "#fff", margin: 0 }}>
              NUCO Ski Quiz — Admin
            </h1>
            <p style={{ fontSize: 14, color: "#93c5fd", margin: 0 }}>Quiz submissions dashboard</p>
          </div>
        </div>

        {/* Login */}
        {status !== "success" && (
          <div style={{ ...card, maxWidth: 400, margin: "80px auto" }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0f2744", marginBottom: 16 }}>
              Admin Login
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                placeholder="Password"
                style={{
                  padding: "12px 16px",
                  borderRadius: 10,
                  border: "2px solid #e2e8f0",
                  fontSize: 15,
                  outline: "none",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#2d6a9f")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#e2e8f0")}
              />
              <button
                onClick={handleLogin}
                disabled={!password || status === "loading"}
                style={{
                  background:
                    !password || status === "loading"
                      ? "#e2e8f0"
                      : "linear-gradient(135deg, #2d6a9f, #1a3a5c)",
                  color: !password || status === "loading" ? "#a0aec0" : "#fff",
                  border: "none",
                  borderRadius: 50,
                  padding: "12px",
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: !password || status === "loading" ? "not-allowed" : "pointer",
                }}
              >
                {status === "loading" ? "Checking..." : "Login"}
              </button>
              {status === "error" && (
                <p style={{ fontSize: 14, color: "#e53e3e", textAlign: "center", margin: 0 }}>
                  {errorMsg}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Dashboard */}
        {status === "success" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Download button */}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={downloadCSV}
                disabled={submissions.length === 0}
                style={{
                  background: submissions.length === 0 ? "#e2e8f0" : "#fff",
                  color: submissions.length === 0 ? "#a0aec0" : "#0f2744",
                  border: "2px solid " + (submissions.length === 0 ? "#e2e8f0" : "#fff"),
                  borderRadius: 50,
                  padding: "10px 22px",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: submissions.length === 0 ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                ⬇️ Download CSV
              </button>
            </div>
            {/* Summary stats */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: 16,
              }}
            >
              <div style={{ ...card, textAlign: "center" }}>
                <div style={{ fontSize: 36, fontWeight: 800, color: "#0f2744" }}>
                  {submissions.length}
                </div>
                <div style={{ fontSize: 13, color: "#718096", fontWeight: 600 }}>Total Submissions</div>
              </div>
              {TYPES.map((t) => {
                const { name, emoji } = personalityLabels[t];
                const pct = submissions.length
                  ? Math.round((counts[t] / submissions.length) * 100)
                  : 0;
                const isTop = t === topType && submissions.length > 0;
                return (
                  <div
                    key={t}
                    style={{
                      ...card,
                      textAlign: "center",
                      border: isTop ? "2px solid #2d6a9f" : "1px solid #e2e8f0",
                      background: isTop ? "#e8f4fd" : "#fff",
                    }}
                  >
                    <div style={{ fontSize: 24, marginBottom: 4 }}>{emoji}</div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: "#0f2744" }}>
                      {counts[t]}
                    </div>
                    <div style={{ fontSize: 11, color: "#718096", fontWeight: 600, marginBottom: 6 }}>
                      {name}
                    </div>
                    <div
                      style={{
                        width: "100%",
                        height: 4,
                        background: "#e2e8f0",
                        borderRadius: 2,
                      }}
                    >
                      <div
                        style={{
                          width: `${pct}%`,
                          height: "100%",
                          background: "linear-gradient(135deg, #2d6a9f, #1a3a5c)",
                          borderRadius: 2,
                        }}
                      />
                    </div>
                    <div style={{ fontSize: 11, color: "#2d6a9f", marginTop: 4, fontWeight: 700 }}>
                      {pct}%
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Submissions table */}
            <div style={card}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0f2744", marginBottom: 16 }}>
                All Submissions ({submissions.length})
              </h2>
              {submissions.length === 0 ? (
                <p style={{ color: "#718096", textAlign: "center", padding: "32px 0" }}>
                  No submissions yet.
                </p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                        {["Email", "Personality Type", "Date"].map((h) => (
                          <th
                            key={h}
                            style={{
                              textAlign: "left",
                              padding: "8px 12px",
                              color: "#4a5568",
                              fontWeight: 700,
                              fontSize: 12,
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                            }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {submissions.map((s, i) => {
                        const p = personalityLabels[s.personality_type] ?? {
                          name: s.personality_type,
                          emoji: "❓",
                        };
                        return (
                          <tr
                            key={s.id}
                            style={{
                              borderBottom: "1px solid #f0f4f8",
                              background: i % 2 === 0 ? "#fff" : "#f7fafc",
                            }}
                          >
                            <td style={{ padding: "10px 12px", color: "#0f2744" }}>{s.email}</td>
                            <td style={{ padding: "10px 12px" }}>
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 6,
                                  background: "#e8f4fd",
                                  color: "#1a3a5c",
                                  borderRadius: 50,
                                  padding: "3px 10px",
                                  fontSize: 12,
                                  fontWeight: 600,
                                }}
                              >
                                {p.emoji} {p.name}
                              </span>
                            </td>
                            <td style={{ padding: "10px 12px", color: "#718096", fontSize: 13 }}>
                              {new Date(s.created_at).toLocaleDateString("en-GB", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
