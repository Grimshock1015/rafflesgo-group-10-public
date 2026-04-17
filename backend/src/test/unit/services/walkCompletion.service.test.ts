import { beforeEach, describe, expect, it, vi, type Mocked } from 'vitest';
import { WalkCompletionService } from '../../../services/walkCompletion.service';
import { SurveyWalkRepository } from '../../../repositories/surveyWalk.repository';
import { EmailService } from '../../../services/email.service';
import { auth } from '../../../lib/firebase-admin';
import type { SurveyWalkEntity } from '../../../entities/surveyWalk.entity';

vi.mock('../../../lib/firebase-admin', () => ({
    auth: {
        getUser: vi.fn(),
    },
}));

describe('WalkCompletionService Unit Tests', () => {
    let service: WalkCompletionService;
    let mockSurveyWalkRepository: Mocked<SurveyWalkRepository>;
    let mockEmailService: Mocked<EmailService>;

    const walk: SurveyWalkEntity = {
        uid: 'walk-1',
        surveyPeriodUid: 'period-1',
        name: 'Morning Walk',
        date: new Date('2026-04-17T00:00:00.000Z'),
        startTime: '08:00',
        endTime: '10:00',
        capacity: 4,
        isFinished: true,
        volunteerUids: ['vol-1', 'vol-2'],
        attendeeUids: ['vol-1'],
        completedAt: new Date('2026-04-17T10:10:00.000Z'),
        leader: 'leader-1',
    };

    beforeEach(() => {
        vi.clearAllMocks();

        mockSurveyWalkRepository = {
            findAll: vi.fn(),
            findById: vi.fn(),
            findByDate: vi.fn(),
            findBySurveyPeriodUid: vi.fn(),
            findBySurveyPeriodUids: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        } as unknown as Mocked<SurveyWalkRepository>;

        mockEmailService = {
            sendInvitationEmail: vi.fn(),
            sendWalkReminderEmail: vi.fn(),
            sendLeaderReminderEmail: vi.fn(),
            sendAttendanceConfirmationEmail: vi.fn(),
            sendAttendanceFollowUpEmail: vi.fn(),
            sendAttendedEmail: vi.fn().mockResolvedValue(undefined),
            sendMissedEmail: vi.fn().mockResolvedValue(undefined),
        } as unknown as Mocked<EmailService>;

        service = new WalkCompletionService(mockSurveyWalkRepository, mockEmailService);
    });

    it('should skip all attendance emails when leader has no email', async () => {
        mockSurveyWalkRepository.findBySurveyPeriodUid.mockResolvedValue([walk]);
        vi.mocked(auth.getUser).mockResolvedValueOnce({ displayName: 'Lead', email: undefined } as never);

        await service.sendAttendanceEmails(walk);

        expect(auth.getUser).toHaveBeenCalledTimes(1);
        expect(mockEmailService.sendAttendedEmail).not.toHaveBeenCalled();
        expect(mockEmailService.sendMissedEmail).not.toHaveBeenCalled();
    });

    it('should send attended and missed emails with expected payload', async () => {
        mockSurveyWalkRepository.findBySurveyPeriodUid.mockResolvedValue([
            walk,
            {
                ...walk,
                uid: 'walk-2',
                isFinished: true,
                attendeeUids: ['vol-1', 'vol-2'],
            },
            {
                ...walk,
                uid: 'walk-3',
                isFinished: false,
                attendeeUids: ['vol-1'],
            },
        ]);

        vi.mocked(auth.getUser)
            .mockResolvedValueOnce({ displayName: 'Leader Name', email: 'leader@example.com' } as never)
            .mockResolvedValueOnce({ email: 'attended@example.com' } as never)
            .mockResolvedValueOnce({ email: 'missed@example.com' } as never);

        await service.sendAttendanceEmails(walk);

        expect(mockSurveyWalkRepository.findBySurveyPeriodUid).toHaveBeenCalledWith('period-1');
        expect(mockEmailService.sendAttendedEmail).toHaveBeenCalledWith(
            'attended@example.com',
            'Morning Walk',
            2,
        );
        expect(mockEmailService.sendMissedEmail).toHaveBeenCalledWith(
            'missed@example.com',
            'Morning Walk',
            'Leader Name',
            'leader@example.com',
        );
    });

    it('should continue when one volunteer email send fails', async () => {
        mockSurveyWalkRepository.findBySurveyPeriodUid.mockResolvedValue([walk]);
        vi.mocked(auth.getUser)
            .mockResolvedValueOnce({ displayName: 'Leader Name', email: 'leader@example.com' } as never)
            .mockResolvedValueOnce({ email: 'attended@example.com' } as never)
            .mockResolvedValueOnce({ email: 'missed@example.com' } as never);

        mockEmailService.sendAttendedEmail.mockRejectedValueOnce(new Error('SMTP timeout'));

        await service.sendAttendanceEmails(walk);

        expect(mockEmailService.sendAttendedEmail).toHaveBeenCalledTimes(1);
        expect(mockEmailService.sendMissedEmail).toHaveBeenCalledTimes(1);
    });

    it('should skip volunteer without email and continue with others', async () => {
        mockSurveyWalkRepository.findBySurveyPeriodUid.mockResolvedValue([walk]);
        vi.mocked(auth.getUser)
            .mockResolvedValueOnce({ displayName: 'Leader Name', email: 'leader@example.com' } as never)
            .mockResolvedValueOnce({ email: undefined } as never)
            .mockResolvedValueOnce({ email: 'missed@example.com' } as never);

        await service.sendAttendanceEmails(walk);

        expect(mockEmailService.sendAttendedEmail).not.toHaveBeenCalled();
        expect(mockEmailService.sendMissedEmail).toHaveBeenCalledTimes(1);
        expect(mockEmailService.sendMissedEmail).toHaveBeenCalledWith(
            'missed@example.com',
            'Morning Walk',
            'Leader Name',
            'leader@example.com',
        );
    });
});
