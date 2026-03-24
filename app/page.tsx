"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

type SkiType = "chalet" | "apres" | "junkie" | "tourist" | "student";
type Screen = "welcome" | "quiz" | "results";
type SubmitStatus = "idle" | "loading" | "success" | "error";

interface Answer {
  emoji: string;
  text: string;
  type: SkiType;
}

interface Question {
  question: string;
  answers: Answer[];
}

const questions: Question[] = [
  {
    question: "What time do you hit the slopes?",
    answers: [
      { emoji: "⚡", text: "First lift, no excuses", type: "junkie" },
      { emoji: "🍳", text: "9ish, after a proper breakfast", type: "tourist" },
      { emoji: "☕", text: "10:30, once the grooming's softened up", type: "chalet" },
      { emoji: "💊", text: "After lunch — mornings are for recovery", type: "student" },
      { emoji: "🍺", text: "Whenever, I'm not rushing", type: "apres" },
    ],
  },
  {
    question: "What's your go-to run?",
    answers: [
      { emoji: "🚨", text: "Whatever's been closed for avalanche risk", type: "junkie" },
      { emoji: "🍽️", text: "A long red with a mountain restaurant halfway down", type: "chalet" },
      { emoji: "💸", text: "Whichever one leads back to the cheapest bar", type: "student" },
      { emoji: "🌄", text: "Something scenic, nothing too scary", type: "tourist" },
      { emoji: "🏃", text: "Whatever gets me to the bar fastest", type: "apres" },
    ],
  },
  {
    question: "What does your ski outfit look like?",
    answers: [
      { emoji: "🎿", text: "Beaten-up gear, covered in lift passes from 10 resorts", type: "junkie" },
      { emoji: "✨", text: "Head-to-toe new kit, matches perfectly", type: "tourist" },
      { emoji: "🍻", text: "Borrowed salopettes and a uni hoodie — spent the budget on Jägerbombs", type: "student" },
      { emoji: "💅", text: "Stylish but practical — I look good on and off the mountain", type: "apres" },
      { emoji: "😴", text: "Last season's salopettes and a hoodie", type: "chalet" },
    ],
  },
  {
    question: "When do you call it a day?",
    answers: [
      { emoji: "🌙", text: "Last lift, every day", type: "junkie" },
      { emoji: "🛋️", text: "Early enough to grab a sunbed at the bar", type: "apres" },
      { emoji: "🤷", text: "I never really started, to be honest", type: "student" },
      { emoji: "📋", text: "When my instructor says so", type: "tourist" },
      { emoji: "🕑", text: "Around 2pm — enough is enough", type: "chalet" },
    ],
  },
  {
    question: "What's your après ski move?",
    answers: [
      { emoji: "🗺️", text: "Already planning tomorrow's off-piste route", type: "junkie" },
      { emoji: "👑", text: "I've been here since 3pm, I AM the après ski", type: "apres" },
      { emoji: "😵", text: "Still going from last night", type: "student" },
      { emoji: "🍷", text: "A vin chaud and some people watching", type: "tourist" },
      { emoji: "😪", text: "Hair of the dog and a very long nap", type: "chalet" },
    ],
  },
];

const personalities: Record<
  SkiType,
  { name: string; tagline: string; recommendation: string; emoji: string }
> = {
  junkie: {
    name: "The Adrenaline Junkie",
    tagline: "If it's not off-piste, it doesn't count",
    recommendation: "Heli-skiing in Verbier",
    emoji: "🎿",
  },
  apres: {
    name: "The Après Legend",
    tagline: "The mountain is just the warm-up",
    recommendation: "Front row at the bar at 3pm",
    emoji: "🍺",
  },
  chalet: {
    name: "The Chalet Crawler",
    tagline: "Why ski all day when you can ski it right?",
    recommendation: "A long lazy lunch on the mountain",
    emoji: "🛋️",
  },
  tourist: {
    name: "The Tourist",
    tagline: "Is this the right slope for beginners?",
    recommendation: "A guided group lesson package",
    emoji: "📸",
  },
  student: {
    name: "The Eternal Student",
    tagline: "Ski season is just a pub crawl with better views",
    recommendation: "A budget chalet with an unlimited wine package",
    emoji: "🍻",
  },
};

function calculateResults(selections: SkiType[]) {
  const counts: Record<SkiType, number> = {
    chalet: 0,
    apres: 0,
    junkie: 0,
    tourist: 0,
    student: 0,
  };
  for (const s of selections) {
    counts[s]++;
  }
  const total = selections.length;
  return (Object.keys(counts) as SkiType[])
    .map((type) => ({
      type,
      count: counts[type],
      percent: Math.round((counts[type] / total) * 100),
    }))
    .sort((a, b) => b.count - a.count);
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>("welcome");
  const [currentQ, setCurrentQ] = useState(0);
  const [selections, setSelections] = useState<SkiType[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [email, setEmail] = useState("");
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>("idle");
  const [submitResult, setSubmitResult] = useState<"new" | "existing" | null>(null);

  const handleStart = () => setScreen("quiz");

  const handleSelect = (answerIndex: number) => {
    if (selected !== null) return;
    setSelected(answerIndex);
    const answer = questions[currentQ].answers[answerIndex];

    setTimeout(() => {
      const newSelections = [...selections, answer.type];
      setSelections(newSelections);
      setSelected(null);

      if (currentQ < questions.length - 1) {
        setCurrentQ(currentQ + 1);
      } else {
        setScreen("results");
      }
    }, 400);
  };

  const handleRetake = () => {
    setScreen("welcome");
    setCurrentQ(0);
    setSelections([]);
    setSelected(null);
    setEmail("");
    setSubmitStatus("idle");
    setSubmitResult(null);
  };

  const handleSubmitEmail = async () => {
    if (!email || !topResult) return;
    setSubmitStatus("loading");
    try {
      // Save to Supabase from the browser
      const { error: dbError } = await supabase.from("ski_quiz_results").insert({
        email,
        personality_type: topResult,
      });
      if (dbError) throw new Error(dbError.message);

      // Send confirmation email via API
      await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      setSubmitResult("new");
      setSubmitStatus("success");
    } catch {
      setSubmitStatus("error");
    }
  };

  const results = screen === "results" ? calculateResults(selections) : [];
  const topResult = results[0]?.type;

  const primaryBtn: React.CSSProperties = {
    background: "linear-gradient(135deg, #2d6a9f, #1a3a5c)",
    color: "#fff",
    border: "none",
    borderRadius: 50,
    padding: "16px 48px",
    fontSize: 18,
    fontWeight: 700,
    cursor: "pointer",
    transition: "transform 0.2s, box-shadow 0.2s",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg, #0f2744 0%, #1a3a5c 60%, #2d6a9f 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 16px",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: 24,
          padding: "48px 40px",
          maxWidth: 540,
          width: "100%",
          boxShadow: "0 24px 80px rgba(0,0,0,0.3)",
        }}
      >
        {/* Welcome Screen */}
        {screen === "welcome" && (
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                display: "inline-block",
                background: "linear-gradient(135deg, #2d6a9f, #1a3a5c)",
                color: "#fff",
                borderRadius: 50,
                padding: "8px 24px",
                fontSize: 14,
                fontWeight: 600,
                marginBottom: 24,
              }}
            >
              NUCO Travel
            </div>
            <div style={{ fontSize: 64, marginBottom: 16 }}>⛷️</div>
            <h1
              style={{
                fontSize: 32,
                fontWeight: 700,
                color: "#0f2744",
                marginBottom: 12,
                lineHeight: 1.2,
              }}
            >
              What Kind of Skier Are You?
            </h1>
            <p
              style={{
                fontSize: 16,
                color: "#4a5568",
                marginBottom: 32,
                lineHeight: 1.6,
              }}
            >
              Answer 5 questions and discover your true ski personality. Are you
              a powder-hungry junkie or an après legend? Find out now.
            </p>
            <button
              onClick={handleStart}
              style={primaryBtn}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.05)";
                e.currentTarget.style.boxShadow = "0 8px 30px rgba(26,58,92,0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              Start Quiz
            </button>
          </div>
        )}

        {/* Quiz Screen */}
        {screen === "quiz" && (
          <div>
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 32 }}>
              {questions.map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: 32,
                    height: 6,
                    borderRadius: 3,
                    background:
                      i <= currentQ
                        ? "linear-gradient(135deg, #2d6a9f, #1a3a5c)"
                        : "#e2e8f0",
                    transition: "background 0.3s",
                  }}
                />
              ))}
            </div>

            <p
              style={{
                textAlign: "center",
                fontSize: 13,
                color: "#718096",
                marginBottom: 8,
                fontWeight: 600,
              }}
            >
              Question {currentQ + 1} of {questions.length}
            </p>

            <h2
              style={{
                textAlign: "center",
                fontSize: 22,
                fontWeight: 700,
                color: "#0f2744",
                marginBottom: 24,
                lineHeight: 1.3,
              }}
            >
              {questions[currentQ].question}
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {questions[currentQ].answers.map((answer, i) => {
                const isSelected = selected === i;
                return (
                  <button
                    key={i}
                    onClick={() => handleSelect(i)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      background: isSelected ? "#e8f4fd" : "#f7fafc",
                      border: `2px solid ${isSelected ? "#2d6a9f" : "#e2e8f0"}`,
                      borderRadius: 16,
                      padding: "16px 20px",
                      fontSize: 15,
                      fontWeight: 600,
                      color: "#0f2744",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.2s",
                      transform: isSelected ? "translateX(4px)" : "none",
                    }}
                    onMouseEnter={(e) => {
                      if (selected === null) {
                        e.currentTarget.style.borderColor = "#2d6a9f";
                        e.currentTarget.style.background = "#e8f4fd";
                        e.currentTarget.style.transform = "translateX(4px)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = "#e2e8f0";
                        e.currentTarget.style.background = "#f7fafc";
                        e.currentTarget.style.transform = "none";
                      }
                    }}
                  >
                    <span style={{ fontSize: 24 }}>{answer.emoji}</span>
                    <span>{answer.text}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Results Screen */}
        {screen === "results" && topResult && (
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                display: "inline-block",
                background: "linear-gradient(135deg, #2d6a9f, #1a3a5c)",
                color: "#fff",
                borderRadius: 50,
                padding: "8px 24px",
                fontSize: 14,
                fontWeight: 600,
                marginBottom: 16,
              }}
            >
              Your Results
            </div>

            <div style={{ fontSize: 64, marginBottom: 8 }}>
              {personalities[topResult].emoji}
            </div>

            <h2 style={{ fontSize: 28, fontWeight: 700, color: "#0f2744", marginBottom: 8 }}>
              You&apos;re {personalities[topResult].name}!
            </h2>
            <p style={{ fontSize: 16, color: "#718096", marginBottom: 32, fontStyle: "italic" }}>
              &ldquo;{personalities[topResult].tagline}&rdquo;
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {results.map((r) => {
                const p = personalities[r.type];
                const isTop = r.type === topResult;
                return (
                  <div
                    key={r.type}
                    style={{
                      border: isTop ? "2px solid #2d6a9f" : "2px solid #e2e8f0",
                      borderRadius: 20,
                      padding: "16px 20px",
                      background: isTop ? "#e8f4fd" : "#f7fafc",
                      textAlign: "left",
                      position: "relative",
                    }}
                  >
                    {isTop && (
                      <div
                        style={{
                          position: "absolute",
                          top: 12,
                          right: 12,
                          background: "linear-gradient(135deg, #2d6a9f, #1a3a5c)",
                          color: "#fff",
                          borderRadius: 50,
                          padding: "4px 14px",
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        Top Match
                      </div>
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                      <span style={{ fontSize: 28 }}>{p.emoji}</span>
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: 4,
                          }}
                        >
                          <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f2744" }}>
                            {p.name}
                          </h3>
                          <span style={{ fontSize: 18, fontWeight: 700, color: "#2d6a9f" }}>
                            {r.percent}%
                          </span>
                        </div>
                        <div
                          style={{
                            width: "100%",
                            height: 6,
                            background: "#e2e8f0",
                            borderRadius: 3,
                          }}
                        >
                          <div
                            style={{
                              width: `${r.percent}%`,
                              height: "100%",
                              background: "linear-gradient(135deg, #2d6a9f, #1a3a5c)",
                              borderRadius: 3,
                              transition: "width 0.8s ease-out",
                            }}
                          />
                        </div>
                      </div>
                    </div>
                    {isTop && (
                      <p style={{ fontSize: 13, color: "#4a5568", marginTop: 4 }}>
                        NUCO recommends: <strong>{p.recommendation}</strong>
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Email capture */}
            {submitStatus !== "success" && (
              <div
                style={{
                  marginTop: 32,
                  padding: "24px",
                  background: "#e8f4fd",
                  borderRadius: 20,
                  border: "2px solid #2d6a9f",
                }}
              >
                <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0f2744", marginBottom: 8 }}>
                  Get an exclusive NUCO Travel discount!
                </h3>
                <p style={{ fontSize: 14, color: "#4a5568", marginBottom: 16 }}>
                  Enter your email and we&apos;ll send you a personalised ski holiday deal.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    style={{
                      padding: "12px 16px",
                      borderRadius: 12,
                      border: "2px solid #e2e8f0",
                      fontSize: 16,
                      outline: "none",
                      width: "100%",
                      boxSizing: "border-box",
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "#2d6a9f")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "#e2e8f0")}
                  />
                  <button
                    onClick={handleSubmitEmail}
                    disabled={submitStatus === "loading" || !email}
                    style={{
                      background:
                        submitStatus === "loading" || !email
                          ? "#e2e8f0"
                          : "linear-gradient(135deg, #2d6a9f, #1a3a5c)",
                      color: submitStatus === "loading" || !email ? "#a0aec0" : "#fff",
                      border: "none",
                      borderRadius: 50,
                      padding: "14px 32px",
                      fontSize: 16,
                      fontWeight: 700,
                      cursor: submitStatus === "loading" || !email ? "not-allowed" : "pointer",
                      transition: "transform 0.2s",
                    }}
                  >
                    {submitStatus === "loading" ? "Sending..." : "Claim My Discount"}
                  </button>
                </div>
                {submitStatus === "error" && (
                  <p style={{ marginTop: 12, fontSize: 14, color: "#e53e3e" }}>
                    Something went wrong — please try again.
                  </p>
                )}
              </div>
            )}

            {submitStatus === "success" && (
              <div
                style={{
                  marginTop: 32,
                  padding: "20px",
                  background: "#f0fff4",
                  borderRadius: 20,
                  border: "2px solid #38a169",
                  textAlign: "center",
                }}
              >
                <p style={{ fontSize: 18, fontWeight: 700, color: "#0f2744" }}>
                  {submitResult === "new"
                    ? "🎉 Your discount code is on its way!"
                    : "✅ We'll be in touch with your discount!"}
                </p>
              </div>
            )}

            <button
              onClick={handleRetake}
              style={{
                ...primaryBtn,
                marginTop: 24,
                padding: "14px 40px",
                fontSize: 16,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.05)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              Retake Quiz
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
