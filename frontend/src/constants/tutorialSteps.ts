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
]

export const adminTutorialSteps: TutorialStep[] = [
  {
    title: 'Welcome, Admin',
    description:
      'Manage survey periods, survey walks, and key system workflows from the admin pages.',
  },
  {
    title: 'Create survey periods',
    description:
      'Set up survey periods so volunteers know when data collection is active.',
  },
  {
    title: 'Manage survey walks',
    description:
      'Create and edit survey walks to organize field activities clearly.',
  },
  {
    title: 'Monitor the system',
    description:
      'Review dashboards and administration pages to keep the program running smoothly.',
  },
]