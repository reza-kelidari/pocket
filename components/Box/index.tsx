export default function Box({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full bg-elements-background border border-elements-border rounded-4xl p-5 flex flex-col gap-2.5 shadow-xl shadow-zinc-100">
      {children}
    </div>
  );
}
