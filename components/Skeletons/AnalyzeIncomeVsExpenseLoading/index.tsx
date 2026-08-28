import Box from "@/components/Box";

export default function AnalyzeIncomeVsExpenseLoading({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Box className="gap-5">
      <h3 className="text-secondary text-xs">{children}</h3>
      <div className="w-full h-36 bg-elements-background border border-elements-border rounded-2xl animate-pulse" />
    </Box>
  );
}
