type TitleParamsType = { children: React.ReactNode };

export default function Title({ children }: TitleParamsType) {
  return (
    <div>
      <h1 className="text-lg font-bold">{children}</h1>
      <div className="w-6 h-0.75 bg-primary rounded-xl"></div>
    </div>
  );
}
