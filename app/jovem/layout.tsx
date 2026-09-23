import JovemSidebar from '@/components/jovem/JovemSidebar';

export default function JovemLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-shell">
      <JovemSidebar />
      <main className="admin-main-area">
        <div className="admin-tab-content">
          {children}
        </div>
      </main>
    </div>
  );
}
