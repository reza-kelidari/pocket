"use client";

import Button from "@/components/Button";
import Info from "@/icons/Info";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export type MessageType = {
  title: string;
  type: "done" | "error";
  message: string;
};

export default function Message() {
  const message: MessageType = JSON.parse(sessionStorage.getItem("message")!);
  const router = useRouter();

  useEffect(() => {
    sessionStorage.removeItem("message");
  }, []);

  if (!message) router.replace("/");
  else
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
        <p className="text-center text-xs">{message.message}</p>

        <Button href="/">باشه</Button>
      </div>
    );
}
