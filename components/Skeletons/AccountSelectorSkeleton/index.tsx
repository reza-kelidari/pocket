export default function AccountSelectorSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex items-center justify-between p-4 rounded-2xl border border-elements-border bg-elements-background animate-pulse"
    >
      <div className="grid gap-2.5">
        <div className="text-sm w-28 rounded-md bg-elements-border text-transparent select-none">
          {"\u00A0"}
        </div>
        <div className="text-xs w-16 rounded-md bg-elements-border text-transparent select-none">
          {"\u00A0"}
        </div>
      </div>

      <div className="h-7.5 w-7.5 rounded-4xl bg-elements-border" />
    </div>
  );
}
