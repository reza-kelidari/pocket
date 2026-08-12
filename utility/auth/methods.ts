import { cookies } from "next/headers";
import { envConfig } from "@/utility/env/config";

export async function getCurrentUserId(): Promise<number | null> {
  const sid = (await cookies()).get("auth")?.value;
  if (!sid) return null;

  try {
    const res = await fetch(envConfig.authVerifyUrl, {
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
