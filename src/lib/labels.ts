import type { RegistrationStatus, SuggestionStatus } from './schema';

type Tone = 'gray' | 'green' | 'amber' | 'red' | 'blue' | 'indigo';

export const SUGGESTION_STATUS_TONE: Record<SuggestionStatus, Tone> = {
  new: 'blue',
  reviewing: 'amber',
  planned: 'indigo',
  completed: 'green',
  declined: 'gray',
};

export const REGISTRATION_STATUS_TONE: Record<RegistrationStatus, Tone> = {
  registered: 'blue',
  verified: 'green',
  rejected: 'red',
};
