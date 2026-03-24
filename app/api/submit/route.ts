import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

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

  let emailSent = false;
  let emailErrorMsg = null;

  try {
    const { error: emailError } = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: email,
      subject: "Your NUCO Travel ski holiday discount",
      html: `
        <p>Thank you for taking the time to complete our quiz.</p>
        <p>Please use code <strong>SKIQUIZ100</strong> to book your next ski holiday with NUCO Travel at <a href="https://www.nucotravel.com">www.nucotravel.com</a></p>
      `,
    });
    if (emailError) {
      emailErrorMsg = emailError.message;
      console.error("Resend returned error:", emailError);
    } else {
      emailSent = true;
    }
  } catch (err) {
    emailErrorMsg = err instanceof Error ? err.message : String(err);
    console.error("Resend threw exception:", emailErrorMsg);
  }

  return NextResponse.json({
    status: isNew ? "new" : "existing",
    emailSent,
    emailError: emailErrorMsg,
  });
}
