import { AccountColors, AccountType, AccountTypes } from "@/features/accounts/constants";

export default function AccountCard({
  color,
  name,
  lastBalance,
  type,
}: AccountType) {
  const cardColors = AccountColors[color];
  const CardIcon = AccountTypes[type].icon;

  return (
    <div
      className="w-58 h-36 border p-5 flex flex-col gap-2 rounded-3xl snap-center shrink-0"
      style={{
        borderColor: cardColors.border,
        background: cardColors.background,
        boxShadow: `0 10px 24px ${cardColors.shadow}`,
      }}
    >
      <div
        className="h-6.5 w-6.5 grid place-content-center rounded-4xl mr-auto p-0 m-0"
        style={{ background: cardColors.primary }}
      >
        <CardIcon height={17} width={17} fill="#fff" />
      </div>
      <div
        className="flex gap-1.5 mt-auto items-center"
        style={{ color: cardColors.primary }}
      >
        <h1 className="text-xl font-extrabold">
          {lastBalance.toLocaleString("fa-ir")}
        </h1>
        <span className="text-xs">﷼</span>
      </div>
      <h2 className="text-xs">{name}</h2>
    </div>
  );
}
