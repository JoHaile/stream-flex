"use client";

// Client island so the join-by-code card can live on the (server) home page.

import JoinByCode from "@/components/cinema/JoinByCode";

export default function HomeJoinCard() {
  return <JoinByCode variant="card" />;
}