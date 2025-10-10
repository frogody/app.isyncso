export function broadcastCampaignUpdated(campaignId) {
  try {
    // Fire in current tab
    window.dispatchEvent(new CustomEvent('campaignUpdated', { detail: { id: campaignId, at: Date.now() } }));
    // Notify other tabs
    localStorage.setItem(`campaignUpdated:${campaignId}`, String(Date.now()));
  } catch {}
}

export function subscribeCampaignUpdated(handler) {
  const onCustom = (e) => {
    const id = e?.detail?.id;
    if (id) handler(id);
  };
  const onStorage = (e) => {
    if (e.key && e.key.startsWith('campaignUpdated:')) {
      const id = e.key.split(':')[1];
      if (id) handler(id);
    }
  };
  window.addEventListener('campaignUpdated', onCustom);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener('campaignUpdated', onCustom);
    window.removeEventListener('storage', onStorage);
  };
}