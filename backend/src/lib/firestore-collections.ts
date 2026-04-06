/**
 * Centralized Firestore collection name constants
 * Ensures consistency across all repositories and tests
 */

export const FIRESTORE_COLLECTIONS = {
  USERS: 'users',
  SURVEYPERIODS: 'survey_periods',
  SIGHTINGS: 'sightings_fix',
  SURVEYWALKS: 'survey_walks'
} as const;
