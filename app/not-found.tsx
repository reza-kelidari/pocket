import Button from "@/components/Button";

export default function Notfound() {
  return (
    <div className="flex flex-col place-content-center items-center h-screen relative p-7.5">
      <h1 className="text-lg">صفحه پیدا نشد!</h1>
      <br />
      <Button link="/">بریم خونه</Button>
    </div>
  );
}
