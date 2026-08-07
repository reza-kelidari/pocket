export default function ChartContainerLoading() {
  return (
    <div className="w-full bg-elements-background border border-elements-border rounded-4xl p-5 flex flex-col gap-2.5 shadow-xl shadow-zinc-100 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-4 w-24 rounded-md bg-elements-border"></div>
        <div className="h-7 w-20 rounded-4xl bg-elements-border"></div>
      </div>

      <div className="w-full h-36 rounded-2xl bg-elements-border/50 my-4"></div>

      <div className="flex gap-2 items-center justify-end mt-2">
        <div className="h-5 w-32 rounded-md bg-elements-border"></div>
        <div className="h-3 w-8 rounded-md bg-elements-border"></div>
      </div>

      <div className="h-11.5 w-full rounded-2xl bg-elements-border mt-4"></div>
    </div>
  );
}
