import { cookies } from "next/headers";

export async function getCurrentUserId(): Promise<number | null> {
  const sid = (await cookies()).get("auth")?.value;
  if (!sid) return null;

  try {
    const res = await fetch("http://localhost:3001/api/verify", {
      headers: { Cookie: `auth=${sid}` },
      cache: "no-store",
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.id || null;
  } catch (error) {
    console.error("Auth verification failed:", error);
    return null;
  }
}
