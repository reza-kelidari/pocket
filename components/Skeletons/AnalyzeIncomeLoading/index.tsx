import Box from "@/components/Box";

export default function AnalyzeIncomeLoading() {
  return (
    <div className="w-full flex flex-col gap-5">
      <Box className="flex flex-col gap-4 p-6">
        <div className="flex items-center justify-between">
          <div className="h-4 w-32 bg-elements-background rounded animate-pulse" />
          <div className="h-6 w-24 bg-elements-background rounded animate-pulse" />
        </div>
        <div className="flex items-center gap-6 mt-4">
          <div className="w-32 h-32 rounded-full bg-elements-background animate-pulse shrink-0" />
          <div className="flex flex-col gap-3 flex-1">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-elements-background animate-pulse" />
                <div className="h-4 w-40 bg-elements-background rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </Box>
      <Box className="flex flex-col gap-4 p-6">
        <div className="h-4 w-28 bg-elements-background rounded animate-pulse self-end" />
        {[1, 2].map((i) => (
          <div key={i} className="flex flex-col gap-3 mt-2">
            <div className="flex justify-between">
              <div className="h-4 w-24 bg-elements-background rounded animate-pulse" />
              <div className="h-4 w-28 bg-elements-background rounded animate-pulse" />
            </div>
            <div className="h-px w-full bg-elements-background" />
            <div className="h-4 w-full bg-elements-background rounded animate-pulse" />
            <div className="h-4 w-3/4 bg-elements-background rounded animate-pulse" />
          </div>
        ))}
      </Box>
    </div>
  );
}
