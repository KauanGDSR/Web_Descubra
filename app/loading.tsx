'use client';

import { useState, useEffect } from 'react';
import LoadingScreen from '@/components/ui/LoadingScreen';

export default function GlobalLoading() {
  const [showLoading, setShowLoading] = useState(false);

  useEffect(() => {
    // Only show the loading screen if the page takes more than 2 seconds to load.
    const timer = setTimeout(() => {
      setShowLoading(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (!showLoading) {
    return null;
  }

  return <LoadingScreen />;
}
