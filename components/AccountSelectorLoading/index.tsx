export default function AccountSelectorLoading() {
  return (
    <div className="flex items-center justify-between p-4 rounded-2xl border border-elements-border bg-elements-background animate-pulse">
      <div className="grid gap-2.5">
        <div className="h-4 w-28 rounded-md bg-elements-border" />
        <div className="h-3 w-16 rounded-md bg-elements-border" />
      </div>
      <div className="h-7.5 w-7.5 rounded-4xl bg-elements-border" />
    </div>
  );
}
