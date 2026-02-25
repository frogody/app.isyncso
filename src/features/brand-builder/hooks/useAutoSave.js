import { useRef, useEffect, useState, useCallback } from 'react';

export function useAutoSave(saveFn, data, delay = 500) {
  const [saveStatus, setSaveStatus] = useState('idle');
  const timeoutRef = useRef(null);
  const dataRef = useRef(data);
  const initialRef = useRef(true);
  const saveFnRef = useRef(saveFn);
  const lastSavedJsonRef = useRef('');

  saveFnRef.current = saveFn;
  dataRef.current = data;

  useEffect(() => {
    if (initialRef.current) {
      initialRef.current = false;
      lastSavedJsonRef.current = JSON.stringify(data);
      return;
    }

    // Compare serialized data — skip if content hasn't actually changed
    const serialized = JSON.stringify(data);
    if (serialized === lastSavedJsonRef.current) return;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    setSaveStatus('saving');
    timeoutRef.current = setTimeout(async () => {
      try {
        const currentJson = JSON.stringify(dataRef.current);
        if (currentJson === lastSavedJsonRef.current) {
          setSaveStatus('idle');
          return;
        }
        lastSavedJsonRef.current = currentJson;
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
      lastSavedJsonRef.current = JSON.stringify(dataRef.current);
      await saveFnRef.current(dataRef.current);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      setSaveStatus('error');
    }
  }, []);

  return { saveStatus, forceSave };
}
