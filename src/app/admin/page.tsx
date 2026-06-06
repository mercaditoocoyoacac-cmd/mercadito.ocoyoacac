import { redirect } from "next/navigation";
import { getSession } from "@/server/session";
import AdminDashboardClient from "@/components/admin/AdminDashboardClient";

export const revalidate = 60;

export default async function AdminDashboard() {
  let session;
  try {
    session = await getSession();
  } catch (e) {
    console.error("Session error:", e);
  }

  if (!session?.user?.id || session.user.role !== "ADMIN") {
    redirect("/admin/login");
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  let data;
  try {
    const res = await fetch(`${baseUrl}/api/admin/stats`, { cache: "no-store" });
    data = await res.json();
  } catch (e) {
    console.error("Failed to fetch admin stats:", e);
    return <div className="p-10 text-center text-red-500">Error al cargar estadísticas</div>;
  }

  if (!data.ok) {
    return <div className="p-10 text-center text-red-500">{data.error || "Error"}</div>;
  }

  return <AdminDashboardClient data={data.stats} />;
}
