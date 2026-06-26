import { getScreen, getTab } from './state.js';
import { renderConnect } from './screens/connect.js';
import { renderLocation } from './screens/location.js';
import { renderPath } from './screens/path.js';
import { renderArrival } from './screens/arrival.js';

export function render() {
  const screen = getScreen();
  const app = document.getElementById('app');

  if (screen === 'connect') renderConnect(app);
  else if (screen === 'arrival') renderArrival(app);
  else if (screen === 'path') renderPath(app);
  else renderLocation(app);
}
