/**
 * The tutorial screen: a coach panel stuck to the top of the real table.
 *
 * The table below is the ordinary `Table` component driven by an ordinary
 * `TableController`, so the tutorial cannot drift out of step with the game —
 * there is no second implementation to keep in sync.
 */

import { Table } from '../components/Table';
import { useTutorial, type TutorialController } from './useTutorial';

interface TutorialProps {
  /** Back to the menu. */
  onQuit: () => void;
  /** Straight into a real game against bots. */
  onPlay: () => void;
}

export function Tutorial({ onQuit, onPlay }: TutorialProps) {
  const tutorial = useTutorial();

  return (
    <div className="tutorial" data-focus={tutorial.focus ?? undefined}>
      {tutorial.stage === 'graduated' ? (
        <Graduation onPlay={onPlay} onQuit={onQuit} />
      ) : (
        <Coach tutorial={tutorial} />
      )}

      <Table
        game={tutorial}
        controls={
          <button type="button" className="btn btn--ghost" onClick={onQuit}>
            Leave
          </button>
        }
      />
    </div>
  );
}

function Coach({ tutorial }: { tutorial: TutorialController }) {
  const { lesson, lessonIndex, lessonCount, stage, coach } = tutorial;
  const last = lessonIndex === lessonCount - 1;

  return (
    <aside className={`coach coach--${stage}`}>
      <div className="coach__progress">
        <span className="coach__step">
          {lessonIndex + 1} / {lessonCount}
        </span>
        <div className="coach__dots">
          {Array.from({ length: lessonCount }, (_, i) => (
            <span
              key={i}
              className={`coach__dot ${i < lessonIndex ? 'coach__dot--past' : ''} ${
                i === lessonIndex ? 'coach__dot--now' : ''
              }`}
            />
          ))}
        </div>
      </div>

      <h2 className="coach__title">{lesson.title}</h2>

      {stage === 'done' ? (
        <p className="coach__body">{lesson.done}</p>
      ) : (
        <>
          <p className="coach__body">{lesson.body}</p>
          {stage !== 'punished' && <p className="coach__task">{lesson.task}</p>}
        </>
      )}

      <p className="coach__line" role="status" aria-live="polite">
        {coach ?? ''}
      </p>

      <div className="coach__actions">
        {stage === 'briefing' && (
          <button type="button" className="btn btn--primary" onClick={tutorial.arm}>
            I&rsquo;m watching &rarr;
          </button>
        )}
        {stage === 'done' && (
          <button type="button" className="btn btn--primary" onClick={tutorial.next}>
            {last ? 'Finish' : 'Next'} &rarr;
          </button>
        )}
        {stage === 'doing' && (
          <>
            <button type="button" className="btn btn--ghost" onClick={tutorial.restartLesson}>
              Reset
            </button>
            <button type="button" className="btn btn--ghost" onClick={tutorial.next}>
              Skip this one
            </button>
          </>
        )}
      </div>
    </aside>
  );
}

function Graduation({ onPlay, onQuit }: { onPlay: () => void; onQuit: () => void }) {
  return (
    <aside className="coach coach--graduated">
      <h2 className="coach__title">You know the game</h2>
      <p className="coach__body">
        Three things the lessons left out, because they only bite in a real game:
      </p>
      <ul className="coach__list">
        <li>
          A turn lasts <strong>45 seconds</strong>. Run out and the table discards for you — and if
          you had a play available, that is an infraction like any other.
        </li>
        <li>
          A mistake nobody catches <strong>stands</strong>. The wrong card stays on the pile and the
          run carries on from it. That is why anyone watches at all.
        </li>
        <li>
          Nothing marks an infraction. No bar, no highlight, no sound &mdash; the countdown you saw
          in lesson 6 exists only here and in the &ldquo;show me the mistakes&rdquo; setting.
        </li>
      </ul>
      <div className="coach__actions">
        <button type="button" className="btn btn--primary" onClick={onPlay}>
          Play against bots
        </button>
        <button type="button" className="btn btn--ghost" onClick={onQuit}>
          Back to the menu
        </button>
      </div>
    </aside>
  );
}
