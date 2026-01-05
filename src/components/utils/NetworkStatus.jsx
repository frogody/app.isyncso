import { useState, useEffect } from 'react';
import { Wifi, WifiOff } from 'lucide-react';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        // Trigger reconnection logic
        window.dispatchEvent(new CustomEvent('network-restored'));
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline]);

  return { isOnline, wasOffline };
}

export function NetworkStatusBanner() {
  const { isOnline } = useNetworkStatus();
  
  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bg-red-500/90 text-white text-center py-2 text-sm z-[100] flex items-center justify-center gap-2">
      <WifiOff className="w-4 h-4" />
      <span>You're offline. Some features may not work.</span>
    </div>
  );
}