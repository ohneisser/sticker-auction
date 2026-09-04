import { Resend } from "resend";

const from = process.env.EMAIL_FROM || "Andries <hello@ohneis652.com>";
const site = process.env.NEXT_PUBLIC_SITE_URL || "";

async function send(to: string, subject: string, text: string) {
  if (!process.env.RESEND_API_KEY) return;
  const resend = new Resend(process.env.RESEND_API_KEY);
  try {
    await resend.emails.send({ from, to, subject, text });
  } catch (e) {
    console.error("email failed", e);
  }
}

export function sendOutbid(to: string, slotLabel: string, slotKey: string, newAmount: string) {
  return send(
    to,
    `Someone just outbid you on the ${slotLabel}`,
    `Hey,\n\nquick one. Someone put ${newAmount} on the ${slotLabel} and you are not leading anymore.\n\nIf you still want the spot, bid again here:\n${site}/slot/${slotKey}\n\nAndries`
  );
}

export function sendWon(to: string, slotLabel: string, amount: string) {
  return send(
    to,
    `You got the ${slotLabel}`,
    `Hey,\n\nthe auction is over and you won the ${slotLabel} with ${amount}. Your card has been charged.\n\nI already have your logo file, so nothing to do on your side. I get it printed, put it on and tag you in the reveal.\n\nThanks for backing this,\nAndries`
  );
}

export function sendPaymentFailed(to: string, slotLabel: string) {
  return send(
    to,
    `Payment for the ${slotLabel} did not go through`,
    `Hey,\n\nyou won the ${slotLabel} but your card got declined. Reply to this email and we sort out another way to pay.\n\nAndries`
  );
}
