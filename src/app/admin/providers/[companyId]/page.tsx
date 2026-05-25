import { redirect } from "next/navigation";

export default async function AdminProviderRedirectPage({
  params,
}: {
  params: Promise<{ companyId: string }> | { companyId: string };
}) {
  const { companyId } = await Promise.resolve(params);
  redirect(`/admin/service-providers/${companyId}`);
}
