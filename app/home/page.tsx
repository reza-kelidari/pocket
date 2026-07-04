import ThreeDots from "@/icons/ThreeDots/page";

export default function Home() {
  const dateOptions: Intl.DateTimeFormatOptions = { weekday: "long", month: "long", day: "numeric" }

  return (
    <div className="flex flex-col gap-7.5 p-7.5">
      <header className="flex justify-between p-2.5">
        <div className="flex w-7.5"></div>
        <h3 className="text-text-secondary text-center">{new Date().toLocaleDateString("fa-IR", dateOptions)}</h3>
        <ThreeDots className="fill-primary" />
      </header>

    </div>
  );
}