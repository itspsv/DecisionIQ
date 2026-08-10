export const MIN_QUESTION_LENGTH = 5;
export const MAX_QUESTION_LENGTH = 200;
export const MAX_OPTION_LENGTH = 120;
export const MAX_CRITERION_LENGTH = 80;

export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 4;
export const MAX_CRITERIA = 6;

export interface ValidationErrors {
  question?: string;
  options?: string;
}

/** Trims and drops blank rows, capped at the UI limits. */
export function cleanOptions(options: string[]): string[] {
  return options
    .map((o) => o.trim())
    .filter(Boolean)
    .slice(0, MAX_OPTIONS);
}

export function cleanCriteria(criteria: string[]): string[] {
  return criteria
    .map((c) => c.trim())
    .filter(Boolean)
    .slice(0, MAX_CRITERIA);
}

export function validateDecisionInput(
  question: string,
  options: string[],
): ValidationErrors {
  const errors: ValidationErrors = {};

  const q = question.trim();
  if (q.length < MIN_QUESTION_LENGTH) {
    errors.question = `Describe your decision in at least ${MIN_QUESTION_LENGTH} characters — a little context goes a long way.`;
  } else if (q.length > MAX_QUESTION_LENGTH) {
    errors.question = `Keep the question under ${MAX_QUESTION_LENGTH} characters.`;
  }

  const filled = cleanOptions(options);
  if (filled.length < MIN_OPTIONS) {
    errors.options = `Add at least ${MIN_OPTIONS} options to compare — fill in or remove the empty rows.`;
  } else if (options.some((o) => o.trim().length > MAX_OPTION_LENGTH)) {
    errors.options = `Keep each option under ${MAX_OPTION_LENGTH} characters.`;
  }

  return errors;
}
