import { UserRepository } from './repositories/user.repository';
import { UserService } from './services/user.service';
import { SurveyPeriodRepository } from './repositories/surveyPeriod.repository';
import { SurveyPeriodService } from './services/surveyPeriod.service';
import { SurveyWalkService } from './services/surveyWalk.service';
import { SurveyWalkRepository } from './repositories/surveyWalk.repository';

export interface Container {
  userRepository: UserRepository;
  userService: UserService;
  surveyPeriodRepository: SurveyPeriodRepository;
  surveyPeriodService: SurveyPeriodService;
  surveyWalkRepository: SurveyWalkRepository;
  surveyWalkService: SurveyWalkService;
}

export function createContainer(): Container {
  // Repositories
  const userRepository = new UserRepository();
  const surveyPeriodRepository = new SurveyPeriodRepository();
  const surveyWalkRepository = new SurveyWalkRepository();

  // Services
  const userService = new UserService(userRepository);
  const surveyPeriodService = new SurveyPeriodService(surveyPeriodRepository);
  const surveyWalkService = new SurveyWalkService(surveyWalkRepository, surveyPeriodRepository);

  return {
    userRepository,
    userService,
    surveyPeriodRepository,
    surveyPeriodService,
    surveyWalkRepository,
    surveyWalkService,
  };
}

// Singleton container instance
let container: Container | null = null;

export function getContainer(): Container {
  if (!container) {
    container = createContainer();
  }
  return container;
}

// For testing - allows injecting a mock container
export function setContainer(mockContainer: Container): void {
  container = mockContainer;
}

// For testing - allows resetting the container
export function resetContainer(): void {
  container = null;
}
