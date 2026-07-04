import { redirect } from "next/navigation";

export default async function Splash() {
  await new Promise((r) => {
    setTimeout(r, 5000);
  });

  redirect("/home")
}
