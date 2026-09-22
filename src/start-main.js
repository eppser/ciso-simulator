import { mountStartScreen } from './ui/start-screen.js';
let importedDay = null;
document.body.innerHTML='<div id="start-page"></div>';
const root = document.querySelector('#start-page');
const screen = mountStartScreen(root, {
  async onImport(day) {
    const { scenarioModel } = await import('./sim/scenarios.js');
    scenarioModel(day); // Apply the same validation used by the existing game.
    importedDay = day;
  },
  async onStart(org) {
    // Load the full game only after the user starts; the landing stays lightweight.
    await import('./command.css');
    const { ready } = await import('./campaign-main.js');
    await ready;
    if (importedDay) await window.__app.loadDay(importedDay);
    window.__app.start(org, 'full');
    screen.destroy();
  },
});
