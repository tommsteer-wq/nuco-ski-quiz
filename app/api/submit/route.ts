import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(request: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { email } = await request.json();

  if (!email) {
    return NextResponse.json({ error: "Missing email" }, { status: 400 });
  }

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
      console.error("Resend error:", emailError);
      return NextResponse.json({ emailSent: false, emailError: emailError.message });
    }
    return NextResponse.json({ emailSent: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Resend exception:", msg);
    return NextResponse.json({ emailSent: false, emailError: msg });
  }
}
