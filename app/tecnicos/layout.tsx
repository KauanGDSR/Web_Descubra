import TecnicoSidebar from '@/components/tecnico/TecnicoSidebar';

export default function TecnicoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-shell">
      <TecnicoSidebar />
      <main className="admin-main-area">
        <div className="admin-tab-content">
          {children}
        </div>
      </main>
    </div>
  );
}
