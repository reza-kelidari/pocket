export default function CapsuleLoading() {
  return (
    <div className="border border-elements-border px-2.5 py-2 rounded-4xl text-xs flex items-center gap-1 text-nowrap animate-pulse">
      <div className="h-3 w-20 rounded-md bg-elements-border"></div>
      <div className="h-4 w-4 rounded-md bg-elements-border"></div>
    </div>
  );
}
