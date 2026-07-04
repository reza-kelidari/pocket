import Image from "next/image";

export default function Loading() {
  return (
    <div className="grid place-content-center h-screen">
      <div className="flex gap-3 items-center">
        <Image src="/logo.svg" alt="Logo" height={50} width={50} />
        <h1 className="text-xl">جیب</h1>
      </div>
      <br />
      <p>مدیریت مالی شخصی</p>
    </div>
  );
}
