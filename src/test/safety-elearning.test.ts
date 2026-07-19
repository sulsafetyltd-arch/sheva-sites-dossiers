import { describe, expect, it } from 'vitest';
import {
  ELEARNING_ANSWER_KEY,
  ELEARNING_CHAPTERS,
  ELEARNING_QUESTIONS,
} from '@/types/safety-elearning';

describe('general safety e-learning content', () => {
  it('contains a complete multi-chapter course', () => {
    expect(ELEARNING_CHAPTERS).toHaveLength(6);
    expect(ELEARNING_CHAPTERS.every((chapter) => chapter.points.length >= 4)).toBe(true);
  });

  it('contains ten answerable questions with an 80-point pass threshold', () => {
    expect(ELEARNING_QUESTIONS).toHaveLength(10);
    expect(Object.keys(ELEARNING_ANSWER_KEY)).toEqual(
      ELEARNING_QUESTIONS.map((question) => question.id),
    );
    for (const question of ELEARNING_QUESTIONS) {
      expect(question.options.some((option) => option.value === ELEARNING_ANSWER_KEY[question.id]))
        .toBe(true);
    }
  });
});
