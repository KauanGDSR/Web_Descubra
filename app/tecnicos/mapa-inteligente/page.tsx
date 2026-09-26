'use client';

import dynamic from 'next/dynamic';
import LoadingScreen from '@/frontend/components/ui/LoadingScreen';

// Carregar dinamicamente o componente de mapa para evitar erros de SSR com Leaflet
const MapaInteligente = dynamic(
  () => import('@/frontend/components/admin/MapaInteligente'),
  {
    ssr: false,
    loading: () => <LoadingScreen />
  }
);

export default function MapaInteligentePage() {
  return (
    <div className="mapa-inteligente-container">
      <MapaInteligente />
    </div>
  );
}
