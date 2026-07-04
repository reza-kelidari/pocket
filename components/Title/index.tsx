import React from "react";

export default function Title({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <h1 className="text-lg font-bold">{children}</h1>
      <div className="w-6 h-0.75 bg-primary rounded-xl"></div>
    </div>
  );
}
