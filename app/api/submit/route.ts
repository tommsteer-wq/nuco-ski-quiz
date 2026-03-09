import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  const { email, personalityType } = await request.json();

  if (!email || !personalityType) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("ski_quiz_results")
    .select("id")
    .eq("email", email)
    .limit(1);

  const isNew = !existing || existing.length === 0;

  const { error } = await supabase.from("ski_quiz_results").insert({
    email,
    personality_type: personalityType,
  });

  if (error) {
    return NextResponse.json({ error: "Failed to save results" }, { status: 500 });
  }

  return NextResponse.json({
    status: isNew ? "new" : "existing",
  });
}
