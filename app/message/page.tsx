"use client";
import Button from "@/components/Button";
import Description from "@/components/Description";
import Info from "@/icons/Info";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export type MessageType = {
  title: string;
  type: "done" | "error";
  message: string[];
};

export default function Message() {
  const router = useRouter();
  const [message, setMessage] = useState<MessageType | null>(null);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("message");
      if (stored) {
        setMessage(JSON.parse(stored));
      }
      sessionStorage.removeItem("message");
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (message === null) {
      const timer = setTimeout(() => {
        const stored = sessionStorage.getItem("message");
        if (!stored) {
          router.replace("/");
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [message, router]);

  if (!message) {
    return (
      <div className="flex flex-col justify-center items-center gap-7.5 p-15 h-screen">
        <p className="text-secondary">در حال بارگذاری...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-center items-center gap-7.5 p-15 h-screen">
      <div className="flex items-center justify-center gap-2">
        <Info
          className={
            message.type === "error" ? "fill-red" : "fill-income-primary"
          }
          height={30}
          width={30}
        />
        <h1 className="text-xl">{message.title}</h1>
      </div>
      <div className="grid gap-5">
        {message.message.map((item, index) => (
          <Description key={index}>- {item}</Description>
        ))}
      </div>
      <Button href="/">باشه</Button>
    </div>
  );
}
