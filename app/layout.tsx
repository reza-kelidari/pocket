import type { Metadata } from "next";
import { Vazirmatn } from "next/font/google";
import "./globals.css";
import { headers } from "next/headers";

const vazirMatn = Vazirmatn({
  variable: "--font-vazirmatn",
  subsets: ["arabic"],
});

export const metadata: Metadata = {
  title: "جیب",
  description: "حسابداری شخصی",
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
      className={`${vazirMatn.variable} h-full antialiased`}
    >
      <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
      <body className="min-h-full flex flex-col">
        {/* {isMobile ? children : onlyMobile} */}
        {children}
      </body>
    </html>
  );
}
