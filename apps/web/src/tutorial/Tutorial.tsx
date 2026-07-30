/**
 * The tutorial screen: a coach panel stuck to the top of the real table.
 *
 * The table below is the ordinary `Table` component driven by an ordinary
 * `TableController`, so the tutorial cannot drift out of step with the game —
 * there is no second implementation to keep in sync.
 */

import { Table } from '../components/Table';
import { T, useT } from '../i18n/locale';
import { lessonText } from './lessons';
import { useTutorial, type TutorialController } from './useTutorial';

interface TutorialProps {
  /** Back to the menu. */
  onQuit: () => void;
  /** Straight into a real game against bots. */
  onPlay: () => void;
}

export function Tutorial({ onQuit, onPlay }: TutorialProps) {
  const { t } = useT();
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
            {t('tutorial.leave')}
          </button>
        }
      />
    </div>
  );
}

function Coach({ tutorial }: { tutorial: TutorialController }) {
  const { t, say } = useT();
  const { lesson, lessonIndex, lessonCount, stage, coach } = tutorial;
  const last = lessonIndex === lessonCount - 1;

  return (
    <aside className={`coach coach--${stage}`}>
      <div className="coach__progress">
        <span className="coach__step">
          {t('tutorial.progress', { index: lessonIndex + 1, count: lessonCount })}
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

      <h2 className="coach__title">{say(lessonText(lesson.id, 'title'))}</h2>

      {stage === 'done' ? (
        <p className="coach__body">{say(lessonText(lesson.id, 'done'))}</p>
      ) : (
        <>
          <p className="coach__body">{say(lessonText(lesson.id, 'body'))}</p>
          {stage !== 'punished' && (
            <p className="coach__task">{say(lessonText(lesson.id, 'task'))}</p>
          )}
        </>
      )}

      <p className="coach__line" role="status" aria-live="polite">
        {coach ? say(coach) : ''}
      </p>

      <div className="coach__actions">
        {stage === 'briefing' && (
          <button type="button" className="btn btn--primary" onClick={tutorial.arm}>
            {t('tutorial.watching')}
          </button>
        )}
        {stage === 'done' && (
          <button type="button" className="btn btn--primary" onClick={tutorial.next}>
            {last ? t('tutorial.finish') : t('tutorial.next')}
          </button>
        )}
        {stage === 'doing' && (
          <>
            <button type="button" className="btn btn--ghost" onClick={tutorial.restartLesson}>
              {t('tutorial.reset')}
            </button>
            <button type="button" className="btn btn--ghost" onClick={tutorial.next}>
              {t('tutorial.skip')}
            </button>
          </>
        )}
      </div>
    </aside>
  );
}

function Graduation({ onPlay, onQuit }: { onPlay: () => void; onQuit: () => void }) {
  const { t } = useT();

  return (
    <aside className="coach coach--graduated">
      <h2 className="coach__title">{t('tutorial.graduated.title')}</h2>
      <p className="coach__body">{t('tutorial.graduated.body')}</p>
      <ul className="coach__list">
        <li>
          <T k="tutorial.graduated.clock" />
        </li>
        <li>
          <T k="tutorial.graduated.stands" />
        </li>
        <li>
          <T k="tutorial.graduated.silent" />
        </li>
      </ul>
      <div className="coach__actions">
        <button type="button" className="btn btn--primary" onClick={onPlay}>
          {t('tutorial.graduated.play')}
        </button>
        <button type="button" className="btn btn--ghost" onClick={onQuit}>
          {t('tutorial.graduated.menu')}
        </button>
      </div>
    </aside>
  );
}
