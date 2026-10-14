import { Game } from './core/game';
import { PoseGalleryState } from './states/poseGallery';
import { validateData } from './data/validate';

if (import.meta.env.DEV) {
  for (const e of validateData()) console.warn('Datenfehler:', e);
}

const canvas = document.getElementById('screen') as HTMLCanvasElement;
const game = new Game(canvas);
canvas.focus();
if (import.meta.env.DEV && location.search.includes('posen')) {
  game.start(new PoseGalleryState(() => game.input.wasTapped('Space')));
} else {
  game.flow.newGame(new URLSearchParams(location.search).get('modus') === '2' ? 2 : 1);
  game.start();
}
