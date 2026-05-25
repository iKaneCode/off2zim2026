import { redirect } from "next/navigation";
import { getSurfaceHref } from "@/lib/app-surface";

export default function AdminIndexPage() {
  redirect(getSurfaceHref("admin", "/admin/overview"));
}
