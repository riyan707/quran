import { createEmptyCard, fsrs, Rating, State, type Card, type Grade as FsrsGrade } from 'ts-fsrs';

// Sole point of contact with ts-fsrs — nothing else in the app imports it
// directly, so the scheduling algorithm can be swapped again later without
// touching the DB layer or UI.
const scheduler = fsrs();

export type Grade = 'again' | 'hard' | 'good' | 'easy';
export type CardState = 'new' | 'learning' | 'review' | 'relearning';

/** A card in "New" or "Learning"/"Relearning" state hasn't graduated to real multi-day review yet. */
export function isInLearningPhase(state: CardState): boolean {
  return state !== 'review';
}

export interface SrsCard {
  state: CardState;
  dueDate: Date;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  lastReview: Date | null;
}

const RATING_BY_GRADE: Record<Grade, FsrsGrade> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
};

const STATE_TO_STRING: Record<State, CardState> = {
  [State.New]: 'new',
  [State.Learning]: 'learning',
  [State.Review]: 'review',
  [State.Relearning]: 'relearning',
};

const STRING_TO_STATE: Record<CardState, State> = {
  new: State.New,
  learning: State.Learning,
  review: State.Review,
  relearning: State.Relearning,
};

function fromFsrsCard(card: Card): SrsCard {
  return {
    state: STATE_TO_STRING[card.state],
    dueDate: card.due,
    stability: card.stability,
    difficulty: card.difficulty,
    elapsedDays: card.elapsed_days,
    scheduledDays: card.scheduled_days,
    learningSteps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    lastReview: card.last_review ?? null,
  };
}

function toFsrsCard(data: SrsCard): Card {
  return {
    due: data.dueDate,
    stability: data.stability,
    difficulty: data.difficulty,
    elapsed_days: data.elapsedDays,
    scheduled_days: data.scheduledDays,
    learning_steps: data.learningSteps,
    reps: data.reps,
    lapses: data.lapses,
    state: STRING_TO_STATE[data.state],
    last_review: data.lastReview ?? undefined,
  };
}

/** A brand-new, never-reviewed card — due immediately (it's about to be introduced). */
export function createNewCard(now: Date = new Date()): SrsCard {
  return fromFsrsCard(createEmptyCard(now));
}

/** Applies a grade to a card and returns its next scheduled state. */
export function gradeCard(card: SrsCard, grade: Grade, now: Date = new Date()): SrsCard {
  const { card: next } = scheduler.next(toFsrsCard(card), now, RATING_BY_GRADE[grade]);
  return fromFsrsCard(next);
}
