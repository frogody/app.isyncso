export function getNow() {
  return Date.now();
}

export function setLock(key, ttlMs = 10 * 60 * 1000) {
  try {
    const until = getNow() + ttlMs;
    localStorage.setItem(key, JSON.stringify({ until }));
  } catch {}
}

export function hasValidLock(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return false;
    const { until } = JSON.parse(raw);
    if (!until) return false;
    if (getNow() > until) {
      localStorage.removeItem(key);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function clearLock(key) {
  try {
    localStorage.removeItem(key);
  } catch {}
}