import { useEffect } from 'react';

export default function SearchShortcut({ onOpen }) {
  useEffect(() => {
    function handleKeyDown(e) {
      // Cmd+K (Mac) or Ctrl+K (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        e.stopPropagation();
        onOpen?.();
      }
    }

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [onOpen]);

  // Renders nothing visible
  return null;
}
