import Stripe from "stripe";

// Falls back to a placeholder key so the build works in demo mode; real calls need STRIPE_SECRET_KEY.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder");
