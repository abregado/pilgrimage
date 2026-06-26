import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';

const DATA_FILE = './server/data/state.json';

export function loadState() {
  try {
    const raw = readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveState(state) {
  const dir = './server/data';
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(DATA_FILE, JSON.stringify(state), 'utf8');
}
