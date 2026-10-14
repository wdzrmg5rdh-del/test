import { Game } from './core/game';
import { SandboxState } from './states/sandbox';
import { PoseGalleryState } from './states/poseGallery';

const canvas = document.getElementById('screen') as HTMLCanvasElement;
const game = new Game(canvas);
canvas.focus();
if (import.meta.env.DEV && location.search.includes('posen')) {
  game.start(new PoseGalleryState(() => game.input.wasTapped('Space')));
} else {
  game.start(new SandboxState(game));
}
