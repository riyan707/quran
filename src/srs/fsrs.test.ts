import { createNewCard, gradeCard, isInLearningPhase } from './fsrs';

const NOW = new Date('2026-01-01T12:00:00.000Z');

describe('createNewCard', () => {
  it('starts in the "new" state, due immediately', () => {
    const card = createNewCard(NOW);
    expect(card.state).toBe('new');
    expect(card.reps).toBe(0);
    expect(card.lapses).toBe(0);
    expect(card.dueDate.getTime()).toBeLessThanOrEqual(NOW.getTime());
  });
});

describe('isInLearningPhase', () => {
  it('is true for new/learning/relearning and false for review', () => {
    expect(isInLearningPhase('new')).toBe(true);
    expect(isInLearningPhase('learning')).toBe(true);
    expect(isInLearningPhase('relearning')).toBe(true);
    expect(isInLearningPhase('review')).toBe(false);
  });
});

describe('gradeCard — first exposure (learning phase)', () => {
  it('keeps a card in learning/relearning after "again", due within minutes not days', () => {
    const card = createNewCard(NOW);
    const graded = gradeCard(card, 'again', NOW);
    expect(isInLearningPhase(graded.state)).toBe(true);
    const minutesUntilDue = (graded.dueDate.getTime() - NOW.getTime()) / (1000 * 60);
    expect(minutesUntilDue).toBeLessThan(60);
  });

  it('eventually graduates to "review" after enough "good" grades', () => {
    let card = createNewCard(NOW);
    let state = card.state;
    // FSRS's default learning steps are short (minutes) — a handful of
    // "good" grades in a row should be enough to graduate to real review.
    for (let i = 0; i < 5 && state !== 'review'; i++) {
      card = gradeCard(card, 'good', NOW);
      state = card.state;
    }
    expect(state).toBe('review');
  });

  it('grows lapses and stays in the learning phase on repeated "again"', () => {
    let card = createNewCard(NOW);
    card = gradeCard(card, 'again', NOW);
    const lapsesAfterFirst = card.lapses;
    card = gradeCard(card, 'again', NOW);
    expect(card.lapses).toBeGreaterThanOrEqual(lapsesAfterFirst);
    expect(isInLearningPhase(card.state)).toBe(true);
  });
});

describe('gradeCard — review phase', () => {
  function graduateToReview(): ReturnType<typeof createNewCard> {
    let card = createNewCard(NOW);
    for (let i = 0; i < 10 && card.state !== 'review'; i++) {
      card = gradeCard(card, 'good', NOW);
    }
    if (card.state !== 'review') throw new Error('test setup failed to graduate card');
    return card;
  }

  it('schedules a multi-day interval after grading a graduated card "good"', () => {
    const reviewCard = graduateToReview();
    const graded = gradeCard(reviewCard, 'good', reviewCard.dueDate);
    const daysUntilDue = (graded.dueDate.getTime() - reviewCard.dueDate.getTime()) / (1000 * 60 * 60 * 24);
    expect(daysUntilDue).toBeGreaterThanOrEqual(1);
  });

  it('drops a graduated card into "relearning" (short-term requeue) on "again"', () => {
    const reviewCard = graduateToReview();
    const graded = gradeCard(reviewCard, 'again', reviewCard.dueDate);
    expect(graded.state).toBe('relearning');
    const minutesUntilDue = (graded.dueDate.getTime() - reviewCard.dueDate.getTime()) / (1000 * 60);
    expect(minutesUntilDue).toBeLessThan(60);
  });

  it('does not mutate the input card', () => {
    const reviewCard = graduateToReview();
    const snapshot = { ...reviewCard };
    gradeCard(reviewCard, 'good', reviewCard.dueDate);
    expect(reviewCard).toEqual(snapshot);
  });
});
