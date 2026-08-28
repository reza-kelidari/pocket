"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { SplashShownKey } from "@/utility/keys/sessionStore";

export default function Splash() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromPath = searchParams.get("from") || "/";
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    async function load() {
      try {
        setError(null);
        const authRes = await fetch("/api/auth/me");
        if (authRes.status === 401) {
          const configRes = await fetch("/api/env-config");
          const config = await configRes.json();
          const currentUrl = window.location.origin + fromPath;
          router.replace(
            `${config.authServiceUrl}/?redirect=${encodeURIComponent(currentUrl)}`,
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
          const createRes = await fetch("/api/init", { method: "POST" });
          if (createRes.status === 200) {
            sessionStorage.setItem(SplashShownKey, "1");
            router.replace(fromPath);
            return;
          } else {
            setError(
              "خطا در راه‌اندازی اولیه حساب‌ها. لطفاً صفحه را رفرش کنید.",
            );
            return;
          }
        }

        setError(
          `خطای غیرمنتظره (کد: ${initRes.status}). لطفاً دوباره تلاش کنید.`,
        );
      } catch (error) {
        console.error("Splash load error:", error);
        setError(
          "خطا در ارتباط با سرور. لطفاً اتصال اینترنت خود را بررسی کنید.",
        );
      }
    }

    const minDelay = new Promise((resolve) => setTimeout(resolve, 300));
    Promise.all([load(), minDelay]).catch(console.error);
  }, [router, fromPath, retryCount]);

  const handleRetry = () => {
    setRetryCount((c) => c + 1);
  };

  return (
    <div className="flex flex-col place-content-center items-center h-screen relative p-7.5">
      <Image src="/logo.svg" alt="Logo" height={50} width={50} />
      <br />
      <p className="font-extralight">مدیریت مالی شخصی جیب</p>
      {error ? (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 text-center">
          <p className="text-red text-xs mb-3 max-w-80">{error}</p>
          <button
            onClick={handleRetry}
            className="text-xs text-primary underline"
          >
            تلاش مجدد
          </button>
        </div>
      ) : (
        <span className="text-secondary absolute bottom-10 left-1/2 -translate-x-1/2 text-xs">
          درحال بارگذاری ...
        </span>
      )}
    </div>
  );
}
