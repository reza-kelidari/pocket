export default function AccountCardLoading() {
  return (
    <>
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="w-58 h-36 border p-5 flex flex-col gap-2 rounded-4xl snap-center shrink-0 bg-elements-background border-elements-border animate-pulse"
          style={{ boxShadow: "0 12px 24px rgba(0, 0, 0, 0.08)" }}
        >
          <div className="h-6.5 w-6.5 rounded-4xl bg-elements-border mr-auto"></div>

          <div className="mt-auto flex flex-col gap-2">
            <div className="h-5 w-24 rounded-md bg-elements-border"></div>
            <div className="h-3 w-16 rounded-md bg-elements-border"></div>
          </div>
        </div>
      ))}
    </>
  );
}
