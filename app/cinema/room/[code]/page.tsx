import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getRoomDetailsByCode } from "@/lib/cinema/room-actions";
import RoomClient from "./RoomClient";

export default async function RoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ created?: string; invite?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  const { code } = await params;
  const { created, invite } = await searchParams;

  if (!session?.user) {
    redirect(`/sign-in?next=/cinema/room/${encodeURIComponent(code)}`);
  }

  const result = await getRoomDetailsByCode(code);
  if (!result.ok) {
    if (result.code === "NOT_MEMBER" || result.code === "NOT_FOUND") {
      redirect(`/cinema/join/${encodeURIComponent(code)}`);
    }
    if (result.code === "AUTH_REQUIRED") {
      redirect(`/sign-in?next=/cinema/room/${encodeURIComponent(code)}`);
    }
    // Generic failure — surface inside the client so the user sees why.
    return (
      <main className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
        <div className="max-w-sm text-center">
          <h1 className="mb-2 text-xl font-black">Can&rsquo;t open room</h1>
          <p className="text-sm text-zinc-400">{result.error}</p>
          <a
            href="/"
            className="mt-6 inline-block rounded-lg bg-red-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-500 transition"
          >
            Back to StreamFlix
          </a>
        </div>
      </main>
    );
  }

  return (
    <RoomClient
      room={result.data}
      justCreated={created === "1"}
      inviteToken={invite ?? null}
    />
  );
}