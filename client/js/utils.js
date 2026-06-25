window.Pilgrim = window.Pilgrim || {};

Pilgrim.Utils = {
  MOVEMENT_SPEED: 16,
  TICK_RATE_MS: 1000,

  estimateTick(serverTick, lastUpdateTime) {
    return serverTick + Math.floor((Date.now() - lastUpdateTime) / 1000);
  },

  ticksUntilArrival(pilgrim, path) {
    if (!pilgrim || !path) return 0;
    if (pilgrim.pathDirection === 0) {
      return Math.ceil((path.length - pilgrim.pathPosition) / this.MOVEMENT_SPEED);
    } else {
      return Math.ceil(pilgrim.pathPosition / this.MOVEMENT_SPEED);
    }
  },

  pathProgressFraction(pilgrim, pathLength) {
    if (!pilgrim || pathLength == null) return 0;
    if (pilgrim.pathDirection === 0) {
      return pilgrim.pathPosition / pathLength;
    } else {
      return 1 - (pilgrim.pathPosition / pathLength);
    }
  },

  ticksToSeconds(ticks) {
    if (ticks <= 0) return '0s';
    if (ticks < 60) return `${ticks}s`;
    const m = Math.floor(ticks / 60);
    const s = ticks % 60;
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  },

  formatDistance(metres) {
    if (metres < 1000) return `${metres}m`;
    return `${(metres / 1000).toFixed(1)}km`;
  },

  formatAge(ticks) {
    const secs = ticks;
    if (secs < 60) return `${secs}s`;
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  },

  totalDistanceWalked(pilgrim, state) {
    if (!pilgrim || !state) return 0;
    let dist = 0;
    if (pilgrim.pathId && state.location && state.location.type === 'path') {
      const frac = this.pathProgressFraction(pilgrim, state.location.length);
      dist += Math.floor(frac * state.location.length);
    }
    return dist;
  },

  idealBadge(idealId, large) {
    const ideal = Pilgrim.IDEALS[idealId];
    if (!ideal) return '';
    const size = large ? 48 : 28;
    return `<img class="ideal-badge" src="icons/ideal_${idealId}.png" width="${size}" height="${size}" title="${ideal.name}" alt="${ideal.name}">`;
  },

  idealTag(idealId) {
    const ideal = Pilgrim.IDEALS[idealId];
    if (!ideal) return '';
    return `<span class="ideal-tag" style="border-color:${ideal.color};color:${ideal.color}">${ideal.name}</span>`;
  },

  el(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.firstElementChild;
  },
};
