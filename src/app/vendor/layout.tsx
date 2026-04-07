import { redirect } from "next/navigation";
import { getSession } from "@/server/session";

export default async function VendorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session?.user) redirect("/login?callbackUrl=/vendor");
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
  );
}

