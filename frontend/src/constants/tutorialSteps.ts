export type TutorialStep = {
  title: string
  description: string
  image?: string
}

export const userTutorialSteps: TutorialStep[] = [
  {
    title: 'Welcome to RafflesGo',
    description:
      'Help record Raffles’ banded langur sightings during survey walks.',
  },
  {
    title: 'Sign up for walks',
    description:
      'Coordinate walks with other volunteers.',
  },

  {
    title: 'Report what you observed',
    description:
      'Submit both sighted and not-sighted observations. Both are useful for conservation.',
  },
  {
    title: 'Fill in key details',
    description:
      'Add the date, time, map location, notes, and optional photo or video.',
  },
  {
    title: 'Save or submit',
    description:
      'Save a draft to finish later, or submit once your report is ready.',
  },
];

export const adminTutorialSteps: TutorialStep[] = [
  {
    title: 'Welcome, Admin',
    description:
      'Manage survey periods, survey walks, and sightings from their respective pages.',
  },
  {
    title: 'Manage users',
    description:
      'View all signed-up users and disable accounts from the Admin Dashboard.',
  },
  {
    title: 'Create survey periods',
    description:
      'Set up survey periods for the month in the Survey Period tab.',
  },
  {
    title: 'Manage survey walks',
    description:
      'Create and edit survey walks, reassign members and change booking times from the Survey Walks tab.',
  },
  {
    title: 'View sighting data',
    description: 'View all sighting data and images on the survey walks tab,',
  }
];