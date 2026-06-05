import { headers } from "next/headers";
import { redirect } from "next/navigation";
import PublicHomeExperience from "@/components/home/PublicHomeExperience";
import { getSurfaceHome, resolveAppSurface } from "@/lib/app-surface";

export default async function HomePage() {
  const headerStore = await headers();
  const host = headerStore.get("host");
  const surfaceHeader = headerStore.get("x-off2zim-surface");
  const surface = surfaceHeader
    ? resolveAppSurface(surfaceHeader)
    : resolveAppSurface(host, "/");

  if (surface !== "public") {
    redirect(getSurfaceHome(surface));
  }

  return <PublicHomeExperience />;
}
