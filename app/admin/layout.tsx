import AdminSidebar from '@/components/admin/AdminSidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-shell">
      <AdminSidebar />
      <main className="admin-main-area">
        <div className="admin-tab-content">
          {children}
        </div>
      </main>
    </div>
  );
}
