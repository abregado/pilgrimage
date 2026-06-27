import { getScreen } from './state.js';
import { renderConnect } from './screens/connect.js';
import { renderLocation } from './screens/location.js';
import { renderArrival } from './screens/arrival.js';

export function render() {
  const screen = getScreen();
  const app = document.getElementById('app');

  if (screen === 'connect') renderConnect(app);
  else if (screen === 'arrival') renderArrival(app);
  else renderLocation(app);
}
