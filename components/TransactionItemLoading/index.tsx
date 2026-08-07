export default function TransactionItemLoading() {
  return (
    <div className="w-full flex items-center gap-2.5 animate-pulse">
      <div className="w-10 h-10 rounded-2xl shrink-0 bg-elements-background border border-elements-border"></div>

      <div className="flex flex-col gap-2 w-full">
        <div className="h-3.5 w-3/4 rounded-md bg-elements-background border border-elements-border"></div>
        <div className="h-3 w-1/2 rounded-md bg-elements-background border border-elements-border"></div>
      </div>

      <div className="h-3.5 w-12 rounded-md bg-elements-background border border-elements-border"></div>
    </div>
  );
}
