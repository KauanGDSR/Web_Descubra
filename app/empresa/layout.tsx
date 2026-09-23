import EmpresaSidebar from '@/components/empresa/EmpresaSidebar';

export default function EmpresaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-shell">
      <EmpresaSidebar />
      <main className="admin-main-area">
        <div className="admin-tab-content">
          {children}
        </div>
      </main>
    </div>
  );
}
