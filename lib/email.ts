import { Resend } from "resend";

const from = process.env.EMAIL_FROM || "Andries <hello@ohneis652.com>";

async function send(to: string, subject: string, text: string) {
  if (!process.env.RESEND_API_KEY) return;
  const resend = new Resend(process.env.RESEND_API_KEY);
  try {
    await resend.emails.send({ from, to, subject, text });
  } catch (e) {
    console.error("email failed", e);
  }
}

export function sendBought(to: string, slotLabel: string, amount: string) {
  return send(
    to,
    `You got the ${slotLabel} spot`,
    `Hey,\n\nthe ${slotLabel} spot on my MacBook is yours. ${amount} went through and I already have your logo file, so nothing to do on your side.\n\nI get it printed, put it on and tag you in the reveal.\n\nThanks for backing this,\nAndries`
  );
}
