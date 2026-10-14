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
  const params = new URLSearchParams(location.search);
  const bonus = import.meta.env.DEV ? params.get('bonus') : null;
  game.flow.newGame(params.get('modus') === '2' ? 2 : 1, bonus === 'A' ? 'bonusA' : bonus === 'B' ? 'bonusB' : 'fight');
  game.start();
}
