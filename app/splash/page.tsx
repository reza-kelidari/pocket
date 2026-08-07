"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { SplashShownKey } from "@/utility/keys/sessionStore";

export default function Splash() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromPath = searchParams.get("from") || "/";

  useEffect(() => {
    async function load() {
      try {
        const authRes = await fetch("/api/auth/me");
        if (authRes.status === 401) {
          const currentUrl = window.location.origin + fromPath;
          router.replace(
            `https://auth.rezakelidari.ir/?redirect=${encodeURIComponent(currentUrl)}`,
          );
          return;
        }

        const initRes = await fetch("/api/init");

        if (initRes.status === 200) {
          sessionStorage.setItem(SplashShownKey, "1");
          router.replace(fromPath);
          return;
        }

        if (initRes.status === 204) {
          // ✅ دیگر نیازی به محاسبه timestamp در کلاینت نیست
          const createRes = await fetch("/api/init", { method: "POST" });

          if (createRes.status === 200) {
            sessionStorage.setItem(SplashShownKey, "1");
            router.replace(fromPath);
            return;
          } else {
            console.error("Failed to initialize default accounts");
          }
        }
      } catch (error) {
        console.error("Splash load error:", error);
      }
    }

    const timer = setTimeout(load, 1000);
    return () => clearTimeout(timer);
  }, [router, fromPath]);

  return (
    <div className="flex flex-col place-content-center items-center h-screen relative">
      <Image src="/logo.svg" alt="Logo" height={50} width={50} />
      <br />
      <p className="font-extralight">مدیریت مالی شخصی جیب</p>
      <span className="text-secondary absolute bottom-10 left-1/2 -translate-x-1/2 text-xs">
        درحال بارگذاری ...
      </span>
    </div>
  );
}
