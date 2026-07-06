'use client';

import dynamic from 'next/dynamic';
import LoadingScreen from '@/components/ui/LoadingScreen';

// Carregar dinamicamente o componente de mapa para evitar erros de SSR com Leaflet
const MapaInteligente = dynamic(
  () => import('@/components/admin/MapaInteligente'),
  {
    ssr: false,
    loading: () => <LoadingScreen />
  }
);

export default function MapaInteligentePage() {
  return (
    <div className="mapa-inteligente-container" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '600px' }}>
      <div className="admin-form-header" style={{ marginBottom: '1.5rem' }}>
        <h2 className="admin-form-title">Mapa Inteligente</h2>
        <p className="admin-form-subtitle">
          Visualização territorial de vulnerabilidades e risco social dos jovens cadastrados.
        </p>
      </div>
      
      <div className="mapa-inteligente-content-wrapper" style={{ flex: 1, minHeight: '500px', display: 'flex', flexDirection: 'column' }}>
        <MapaInteligente />
      </div>
    </div>
  );
}
