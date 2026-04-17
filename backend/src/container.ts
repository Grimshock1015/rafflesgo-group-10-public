import { UserRepository } from './repositories/user.repository';
import { UserService } from './services/user.service';
import { SurveyPeriodRepository } from './repositories/surveyPeriod.repository';
import { SurveyPeriodService } from './services/surveyPeriod.service';
import { SurveyWalkService } from './services/surveyWalk.service';
import { SurveyWalkRepository } from './repositories/surveyWalk.repository';
import { InvitationRepository } from './repositories/invitation.repository';
import { EmailService } from './services/email.service';
import { InvitationService } from './services/invitation.service';
import { WeatherService } from './services/weather.service';
import { WalkReminderService } from './services/walkReminder.service';
import { WalkCompletionService } from './services/walkCompletion.service';
import { WalkEndReminderService } from './services/walkEndReminder.service';

export interface Container {
  userRepository: UserRepository;
  userService: UserService;
  surveyPeriodRepository: SurveyPeriodRepository;
  surveyPeriodService: SurveyPeriodService;
  surveyWalkRepository: SurveyWalkRepository;
  surveyWalkService: SurveyWalkService;
  invitationRepository: InvitationRepository;
  emailService: EmailService;
  invitationService: InvitationService;
  weatherService: WeatherService;
  walkReminderService: WalkReminderService;
  walkCompletionService: WalkCompletionService;
  walkEndReminderService: WalkEndReminderService;
}

export function createContainer(): Container {
  // Repositories
  const userRepository = new UserRepository();
  const surveyPeriodRepository = new SurveyPeriodRepository();
  const surveyWalkRepository = new SurveyWalkRepository();
  const invitationRepository = new InvitationRepository();

  // Services
  const userService = new UserService(userRepository);
  const surveyPeriodService = new SurveyPeriodService(surveyPeriodRepository);
  const emailService = new EmailService();
  const invitationService = new InvitationService(
    invitationRepository,
    surveyWalkRepository,
    surveyPeriodRepository,
    emailService,
  );
  const walkCompletionService = new WalkCompletionService(surveyWalkRepository, emailService);
  const surveyWalkService = new SurveyWalkService(surveyWalkRepository, surveyPeriodRepository, walkCompletionService, invitationService);
  const weatherService = new WeatherService();
  const walkReminderService = new WalkReminderService(surveyWalkRepository, emailService, weatherService);
  const walkEndReminderService = new WalkEndReminderService(surveyWalkRepository, emailService);

  return {
    userRepository,
    userService,
    surveyPeriodRepository,
    surveyPeriodService,
    surveyWalkRepository,
    surveyWalkService,
    invitationRepository,
    emailService,
    invitationService,
    weatherService,
    walkReminderService,
    walkCompletionService,
    walkEndReminderService,
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
