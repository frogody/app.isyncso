import { useRef, useEffect, useState, useCallback } from 'react';

export function useAutoSave(saveFn, data, delay = 500) {
  const [saveStatus, setSaveStatus] = useState('idle');
  const timeoutRef = useRef(null);
  const dataRef = useRef(data);
  const initialRef = useRef(true);
  const saveFnRef = useRef(saveFn);

  saveFnRef.current = saveFn;
  dataRef.current = data;

  useEffect(() => {
    if (initialRef.current) {
      initialRef.current = false;
      return;
    }

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    setSaveStatus('saving');
    timeoutRef.current = setTimeout(async () => {
      try {
        await saveFnRef.current(dataRef.current);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (err) {
        console.error('[useAutoSave] Save failed:', err);
        setSaveStatus('error');
      }
    }, delay);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [data, delay]);

  const forceSave = useCallback(async () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setSaveStatus('saving');
    try {
      await saveFnRef.current(dataRef.current);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      setSaveStatus('error');
    }
  }, []);

  return { saveStatus, forceSave };
}
