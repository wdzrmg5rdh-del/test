import { Game } from './core/game';
import { PoseGalleryState } from './states/poseGallery';
import { validateData } from './data/validate';
import { Session } from './rules/session';

if (import.meta.env.DEV) {
  for (const e of validateData()) console.warn('Datenfehler:', e);
}

const canvas = document.getElementById('screen') as HTMLCanvasElement;
const game = new Game(canvas);
canvas.focus();
if (import.meta.env.DEV && location.search.includes('posen')) {
  game.start(new PoseGalleryState(() => game.input.wasTapped('Space')));
} else {
  // Nur in der Entwicklung: direkter Einstieg über ?modus=1|2 bzw. ?bonus=A|B
  const params = new URLSearchParams(location.search);
  const bonus = params.get('bonus');
  const modus = params.get('modus');
  const ende = params.get('spielende');
  if (import.meta.env.DEV && ende) {
    const session = new Session(modus === '2' ? 2 : 1, 1);
    session.players.forEach((p, i) => {
      p.score = Number(ende) - i * 700;
      p.beltIndex = 2;
      p.eliminated = true;
    });
    game.flow.toStage(session, 'gameover');
  } else if (import.meta.env.DEV && (bonus || modus)) {
    game.flow.newGame(modus === '2' ? 2 : 1, bonus === 'A' ? 'bonusA' : bonus === 'B' ? 'bonusB' : 'fight');
  } else {
    game.flow.toTitle();
  }
  game.start();
}
