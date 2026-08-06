import type { Metadata, Viewport } from "next";
import "./globals.css";
import { headers } from "next/headers";
import localFont from "next/font/local";

const vazirMatn = localFont({
  src: "../public/vazirmatn.ttf",
  weight: "100 900",
  style: "normal",
  display: "swap",
});

export const metadata: Metadata = {
  title: "جیب",
  description: "حسابداری شخصی",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const ua = (await headers()).get("user-agent");
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua || "");

  const onlyMobile = (
    <div className="h-screen grid place-content-center gap-5">
      <h1 className="text-2xl text-center">فقط موبایل</h1>
      <p className="text-justify max-w-80">
        این برنامه فقط روی دستگاه‌های موبایلی کار می کنه. برای اجرا، این برنامه
        رو روی گوشی‌تون باز کنید.
      </p>
    </div>
  );

  return (
    <html
      lang="fa"
      dir="rtl"
      className={`${vazirMatn.className} h-full antialiased select-none`}
    >
      <body className="min-h-full flex flex-col">
        {/* {isMobile ? children : onlyMobile} */}
        {children}
      </body>
    </html>
  );
}
