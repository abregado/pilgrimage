export function getOrCreateDeviceId() {
  let id = localStorage.getItem('verdant_device_id');
  if (!id) {
    id = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0')).join('');
    localStorage.setItem('verdant_device_id', id);
  }
  return id;
}

export function formatDuration(ticks) {
  if (ticks <= 0) return '0s';
  if (ticks < 60) return `${ticks}s`;
  const m = Math.floor(ticks / 60);
  const s = ticks % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

export function formatDistance(meters) {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)}km` : `${meters}m`;
}

export function formatAge(ticks) {
  // ticks = seconds
  if (ticks < 60) return `${ticks}s`;
  if (ticks < 3600) {
    const m = Math.floor(ticks / 60);
    const s = ticks % 60;
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  }
  if (ticks < 86400) {
    const h = Math.floor(ticks / 3600);
    const m = Math.floor((ticks % 3600) / 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  const d = Math.floor(ticks / 86400);
  const h = Math.floor((ticks % 86400) / 3600);
  const m = Math.floor((ticks % 3600) / 60);
  let result = `${d}d`;
  if (h > 0) result += ` ${h}h`;
  if (m > 0) result += ` ${m}m`;
  return result;
}
