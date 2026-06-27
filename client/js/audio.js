const audio = new Audio('/assets/music.mp3');
audio.loop = true;
audio.volume = 0.4;

export function isMusicEnabled() {
  return localStorage.getItem('verdant_music') !== 'off';
}

export function ensurePlaying() {
  if (isMusicEnabled() && audio.paused) {
    audio.play().catch(() => {});
  }
}

export function toggleMusic() {
  if (isMusicEnabled()) {
    localStorage.setItem('verdant_music', 'off');
    audio.pause();
  } else {
    localStorage.setItem('verdant_music', 'on');
    audio.play().catch(() => {});
  }
}
