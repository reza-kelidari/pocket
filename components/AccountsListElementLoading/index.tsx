export default function AccountsListElementLoading() {
  return (
    <div className="flex items-center gap-2">
      <div className="w-3.5 h-5 rounded-md bg-elements-background animate-pulse shrink-0"></div>

      <div className="flex items-center justify-between w-full p-4 rounded-2xl border border-elements-border bg-elements-background animate-pulse">
        <div className="grid gap-2.5">
          <div className="h-4 w-28 rounded-md bg-elements-border"></div>
          <div className="h-3 w-16 rounded-md bg-elements-border"></div>
        </div>
        <div className="h-7.5 w-7.5 rounded-4xl bg-elements-border"></div>
      </div>
    </div>
  );
}
