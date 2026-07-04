import { redirect } from "next/navigation";

export default function Notfound() {
  redirect("/home")
}