import AdminNav from "@/components/admin/AdminNav";

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 lg:py-10">
      <AdminNav />
      <div className="mt-6">{children}</div>
    </div>
  );
}
