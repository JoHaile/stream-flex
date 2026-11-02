import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import JoinRoomClient from "./JoinRoomClient";

export default async function JoinRoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  const { code } = await params;
  const { t } = await searchParams;

  if (!session?.user) {
    const next = t ? `/cinema/join/${code}?t=${encodeURIComponent(t)}` : `/cinema/join/${code}`;
    redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  }

  if (!code || !code.trim()) notFound();

  // Initial room preview is fetched by the client (fresh seat count).
  return <JoinRoomClient code={code.trim().toUpperCase()} token={t ?? ""} />;
}