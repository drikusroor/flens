import { useState } from 'react';
import type { Difficulty } from '@flens/bot';

export interface SetupChoices {
  opponents: number;
  difficulty: Difficulty;
  topValue: number;
  hints: boolean;
  seed: number;
}

interface SetupProps {
  onStart: (choices: SetupChoices) => void;
  onOnline: () => void;
}

export function Setup({ onStart, onOnline }: SetupProps) {
  const [opponents, setOpponents] = useState(2);
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [topValue, setTopValue] = useState(16);
  const [hints, setHints] = useState(false);

  return (
    <div className="setup">
      <h1>Flens</h1>
      <p className="setup__blurb">
        A Groninger family card game, also known as Flintjen, Pankouk, Pang or Perry&rsquo;s spel.
        Race to empty your <strong>flensstok</strong> by building 1&ndash;{topValue} in the centre.
        Play out of sequence and someone will shout <strong>FLENS!</strong>
      </p>

      <label className="setup__field">
        Opponents
        <select value={opponents} onChange={(e) => setOpponents(Number(e.target.value))}>
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>

      <label className="setup__field">
        Difficulty
        <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)}>
          <option value="easy">Easy — sloppy, slow to notice</option>
          <option value="normal">Normal</option>
          <option value="hard">Hard — rarely errs, pounces fast</option>
        </select>
      </label>

      <label className="setup__field">
        Build up to
        <select value={topValue} onChange={(e) => setTopValue(Number(e.target.value))}>
          <option value={16}>16 (Perry&rsquo;s original)</option>
          <option value={15}>15 (the Pang write-ups)</option>
        </select>
      </label>

      <label className="setup__check">
        <input type="checkbox" checked={hints} onChange={(e) => setHints(e.target.checked)} />
        <span>
          Show me the mistakes
          <small>
            Reveals a countdown whenever someone errs. Good for learning the rules — but
            spotting them yourself is the actual game.
          </small>
        </span>
      </label>

      <button
        type="button"
        className="btn btn--primary"
        onClick={() =>
          onStart({ opponents, difficulty, topValue, hints, seed: Math.floor(Math.random() * 1e9) })
        }
      >
        Play against bots
      </button>

      <button type="button" className="btn" onClick={onOnline}>
        Play online with friends
      </button>
    </div>
  );
}
