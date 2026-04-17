import { beforeEach, describe, expect, it, vi, type Mocked } from 'vitest';
import { WalkReminderService } from '../../../services/walkReminder.service';
import { WalkEndReminderService } from '../../../services/walkEndReminder.service';
import { SurveyWalkRepository } from '../../../repositories/surveyWalk.repository';
import { EmailService } from '../../../services/email.service';
import { WeatherService } from '../../../services/weather.service';
import { auth } from '../../../lib/firebase-admin';
import type { SurveyWalkEntity } from '../../../entities/surveyWalk.entity';

vi.mock('../../../lib/firebase-admin', () => ({
	auth: {
		getUser: vi.fn(),
	},
}));

describe('Reminder Services Unit Tests', () => {
	let mockSurveyWalkRepository: Mocked<SurveyWalkRepository>;
	let mockEmailService: Mocked<EmailService>;
	let mockWeatherService: Mocked<WeatherService>;

	const baseWalk: SurveyWalkEntity = {
		uid: 'walk-1',
		surveyPeriodUid: 'period-1',
		name: 'Morning Walk',
		date: new Date('2026-04-17T00:00:00.000Z'),
		startTime: '08:00',
		endTime: '10:00',
		capacity: 5,
		isFinished: false,
		volunteerUids: ['vol-1'],
		attendeeUids: [],
		completedAt: null,
		leader: 'leader-1',
	};

	const toTime = (date: Date): string => {
		const hours = String(date.getHours()).padStart(2, '0');
		const minutes = String(date.getMinutes()).padStart(2, '0');
		return `${hours}:${minutes}`;
	};

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useRealTimers();

		mockSurveyWalkRepository = {
			findAll: vi.fn(),
			findById: vi.fn(),
			findBySurveyPeriodUid: vi.fn(),
			findBySurveyPeriodUids: vi.fn(),
			findByDate: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
		} as unknown as Mocked<SurveyWalkRepository>;

		mockEmailService = {
			sendInvitationEmail: vi.fn(),
			sendWalkReminderEmail: vi.fn().mockResolvedValue(undefined),
			sendAttendanceConfirmationEmail: vi.fn(),
			sendAttendanceFollowUpEmail: vi.fn(),
			sendLeaderReminderEmail: vi.fn().mockResolvedValue(undefined),
		} as unknown as Mocked<EmailService>;

		mockWeatherService = {
			getWeatherForDateTime: vi.fn(),
			getCurrentWeather: vi.fn(),
			mapConditionToSummary: vi.fn(),
		} as unknown as Mocked<WeatherService>;
	});

	describe('WalkReminderService', () => {
		it('should not send reminders when no upcoming unfinished walks exist', async () => {
			mockSurveyWalkRepository.findByDate.mockResolvedValue([{ ...baseWalk, isFinished: true }]);

			const service = new WalkReminderService(mockSurveyWalkRepository, mockEmailService, mockWeatherService);
			await service.sendRemindersForTomorrow();

			expect(mockSurveyWalkRepository.findByDate).toHaveBeenCalledOnce();
			expect(mockWeatherService.getWeatherForDateTime).not.toHaveBeenCalled();
			expect(mockEmailService.sendWalkReminderEmail).not.toHaveBeenCalled();
		});

		it('should send reminders with weather data for each volunteer', async () => {
			const weather = {
				summary: 'Thunderstorm risk',
				precipitationProbability: 80,
				weatherCode: 95,
			};

			mockSurveyWalkRepository.findByDate.mockResolvedValue([
				{ ...baseWalk, volunteerUids: ['vol-1', 'vol-2'] },
			]);
			mockWeatherService.getWeatherForDateTime.mockResolvedValue(weather);
			vi.mocked(auth.getUser)
				.mockResolvedValueOnce({ email: 'one@example.com' } as never)
				.mockResolvedValueOnce({ email: 'two@example.com' } as never);

			const service = new WalkReminderService(mockSurveyWalkRepository, mockEmailService, mockWeatherService);
			await service.sendRemindersForTomorrow();

			expect(mockWeatherService.getWeatherForDateTime).toHaveBeenCalledOnce();
			expect(mockEmailService.sendWalkReminderEmail).toHaveBeenCalledTimes(2);
			expect(mockEmailService.sendWalkReminderEmail).toHaveBeenNthCalledWith(
				1,
				'one@example.com',
				'Morning Walk',
				expect.any(String),
				'08:00',
				'10:00',
				weather,
			);
			expect(mockEmailService.sendWalkReminderEmail).toHaveBeenNthCalledWith(
				2,
				'two@example.com',
				'Morning Walk',
				expect.any(String),
				'08:00',
				'10:00',
				weather,
			);
		});

		it('should keep sending reminders when weather lookup fails', async () => {
			mockSurveyWalkRepository.findByDate.mockResolvedValue([{ ...baseWalk, volunteerUids: ['vol-1'] }]);
			mockWeatherService.getWeatherForDateTime.mockRejectedValue(new Error('Weather API down'));
			vi.mocked(auth.getUser).mockResolvedValue({ email: 'one@example.com' } as never);

			const service = new WalkReminderService(mockSurveyWalkRepository, mockEmailService, mockWeatherService);
			await service.sendRemindersForTomorrow();

			expect(mockEmailService.sendWalkReminderEmail).toHaveBeenCalledWith(
				'one@example.com',
				'Morning Walk',
				expect.any(String),
				'08:00',
				'10:00',
				null,
			);
		});

		it('should skip volunteers without email and continue', async () => {
			mockSurveyWalkRepository.findByDate.mockResolvedValue([
				{ ...baseWalk, volunteerUids: ['vol-no-email', 'vol-2'] },
			]);
			mockWeatherService.getWeatherForDateTime.mockResolvedValue(null);
			vi.mocked(auth.getUser)
				.mockResolvedValueOnce({ email: undefined } as never)
				.mockResolvedValueOnce({ email: 'two@example.com' } as never);

			const service = new WalkReminderService(mockSurveyWalkRepository, mockEmailService, mockWeatherService);
			await service.sendRemindersForTomorrow();

			expect(mockEmailService.sendWalkReminderEmail).toHaveBeenCalledTimes(1);
			expect(mockEmailService.sendWalkReminderEmail).toHaveBeenCalledWith(
				'two@example.com',
				'Morning Walk',
				expect.any(String),
				'08:00',
				'10:00',
				null,
			);
		});
	});

	describe('WalkEndReminderService', () => {
		it('should send reminder when walk ended between one and two hours ago', async () => {
			vi.useFakeTimers();
			vi.setSystemTime(new Date('2026-04-17T12:00:00.000Z'));

			const now = new Date();
			const inWindowTime = toTime(new Date(now.getTime() - 90 * 60 * 1000));

			mockSurveyWalkRepository.findByDate.mockResolvedValue([{ ...baseWalk, endTime: inWindowTime, leader: 'leader-1' }]);
			vi.mocked(auth.getUser).mockResolvedValue({ email: 'leader@example.com' } as never);

			const service = new WalkEndReminderService(mockSurveyWalkRepository, mockEmailService);
			await service.checkAndSendLeaderReminders();

			expect(mockSurveyWalkRepository.findByDate).toHaveBeenCalledWith('2026-04-17');
			expect(mockEmailService.sendLeaderReminderEmail).toHaveBeenCalledWith(
				'leader@example.com',
				'Morning Walk',
				'2026-04-17',
				'08:00',
			);
		});

		it('should skip walks outside the 1-2 hour window', async () => {
			vi.useFakeTimers();
			vi.setSystemTime(new Date('2026-04-17T12:00:00.000Z'));

			const now = new Date();
			const tooOldTime = toTime(new Date(now.getTime() - 3 * 60 * 60 * 1000));
			const tooRecentTime = toTime(new Date(now.getTime() - 30 * 60 * 1000));

			mockSurveyWalkRepository.findByDate.mockResolvedValue([
				{ ...baseWalk, uid: 'walk-too-old', endTime: tooOldTime },
				{ ...baseWalk, uid: 'walk-too-recent', endTime: tooRecentTime },
			]);

			const service = new WalkEndReminderService(mockSurveyWalkRepository, mockEmailService);
			await service.checkAndSendLeaderReminders();

			expect(auth.getUser).not.toHaveBeenCalled();
			expect(mockEmailService.sendLeaderReminderEmail).not.toHaveBeenCalled();
		});

		it('should skip finished walks and leaders without email', async () => {
			vi.useFakeTimers();
			vi.setSystemTime(new Date('2026-04-17T12:00:00.000Z'));

			const now = new Date();
			const inWindowTime = toTime(new Date(now.getTime() - 90 * 60 * 1000));

			mockSurveyWalkRepository.findByDate.mockResolvedValue([
				{ ...baseWalk, uid: 'finished', isFinished: true, endTime: inWindowTime },
				{ ...baseWalk, uid: 'no-email', isFinished: false, endTime: inWindowTime, leader: 'leader-2' },
			]);
			vi.mocked(auth.getUser).mockResolvedValue({ email: undefined } as never);

			const service = new WalkEndReminderService(mockSurveyWalkRepository, mockEmailService);
			await service.checkAndSendLeaderReminders();

			expect(auth.getUser).toHaveBeenCalledTimes(1);
			expect(mockEmailService.sendLeaderReminderEmail).not.toHaveBeenCalled();
		});
	});
});
