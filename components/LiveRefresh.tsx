"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Re-fetches server data every 20 seconds so bids stay fresh without a websocket.
export default function LiveRefresh({ every = 20000 }: { every?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), every);
    return () => clearInterval(t);
  }, [router, every]);
  return null;
}
