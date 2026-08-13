type TitleParamsType = {
  children: React.ReactNode;
  /** Optional action element (e.g. time-filter capsule) placed at the end */
  action?: React.ReactNode;
};

export default function Title({ children, action }: TitleParamsType) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-lg font-bold">{children}</h1>
        <div className="w-6 h-0.75 bg-primary rounded-xl"></div>
      </div>
      {action}
    </div>
  );
}
