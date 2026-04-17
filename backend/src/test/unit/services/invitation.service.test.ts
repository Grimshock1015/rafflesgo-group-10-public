import { beforeEach, describe, expect, it, vi, type Mocked } from 'vitest';
import { InvitationService } from '../../../services/invitation.service';
import { InvitationRepository } from '../../../repositories/invitation.repository';
import { SurveyWalkRepository } from '../../../repositories/surveyWalk.repository';
import { SurveyPeriodRepository } from '../../../repositories/surveyPeriod.repository';
import { EmailService } from '../../../services/email.service';
import { auth } from '../../../lib/firebase-admin';
import { BadRequestError, ConflictError, NotFoundError } from '../../../lib/errors';
import type { InvitationEntity } from '../../../entities/invitation.entity';

vi.mock('../../../lib/firebase-admin', () => ({
    auth: {
        getUser: vi.fn(),
    },
}));

describe('InvitationService Unit Tests', () => {
    let service: InvitationService;
    let mockInvitationRepository: Mocked<InvitationRepository>;
    let mockSurveyWalkRepository: Mocked<SurveyWalkRepository>;
    let mockSurveyPeriodRepository: Mocked<SurveyPeriodRepository>;
    let mockEmailService: Mocked<EmailService>;

    const baseWalk = {
        uid: 'walk-1',
        surveyPeriodUid: 'period-1',
        name: 'Morning Walk',
        date: new Date('2026-04-20T00:00:00.000Z'),
        startTime: '08:00',
        endTime: '10:00',
        capacity: 2,
        isFinished: false,
        volunteerUids: ['user-a'],
        attendeeUids: [],
        completedAt: null,
        leader: 'leader-1',
    };

    const basePeriod = {
        uid: 'period-1',
        name: 'Spring 2026',
        startDate: new Date('2026-03-01T00:00:00.000Z'),
        endDate: new Date('2026-05-31T00:00:00.000Z'),
        isFinished: false,
        isActive: true,
        minWalks: 2,
    };

    const makeInvitation = (overrides: Partial<InvitationEntity> = {}): InvitationEntity => ({
        uid: 'inv-1',
        surveyWalkUid: 'walk-1',
        inviterUid: 'leader-1',
        inviteeEmail: 'invitee@example.com',
        type: 'walk_invitation',
        status: 'pending',
        createdAt: new Date('2026-04-19T00:00:00.000Z'),
        ...overrides,
    });

    beforeEach(() => {
        vi.clearAllMocks();

        mockInvitationRepository = {
            create: vi.fn(),
            findById: vi.fn(),
            findByInviteeEmail: vi.fn(),
            findBySurveyWalkUid: vi.fn(),
            findPendingByWalkAndEmail: vi.fn(),
            update: vi.fn(),
        } as unknown as Mocked<InvitationRepository>;

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

        mockSurveyPeriodRepository = {
            findAll: vi.fn(),
            findById: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
            setActive: vi.fn(),
        } as unknown as Mocked<SurveyPeriodRepository>;

        mockEmailService = {
            sendInvitationEmail: vi.fn().mockResolvedValue(undefined),
            sendWalkReminderEmail: vi.fn(),
            sendLeaderReminderEmail: vi.fn(),
            sendAttendedEmail: vi.fn(),
            sendMissedEmail: vi.fn(),
        } as unknown as Mocked<EmailService>;

        service = new InvitationService(
            mockInvitationRepository,
            mockSurveyWalkRepository,
            mockSurveyPeriodRepository,
            mockEmailService,
        );
    });

    describe('sendInvitation', () => {
        it('should throw NotFoundError when walk does not exist', async () => {
            mockSurveyWalkRepository.findById.mockResolvedValue(null);

            await expect(service.sendInvitation('walk-1', 'leader-1', 'invitee@example.com')).rejects.toThrow(NotFoundError);
        });

        it('should throw when walk is finished', async () => {
            mockSurveyWalkRepository.findById.mockResolvedValue({ ...baseWalk, isFinished: true });

            await expect(service.sendInvitation('walk-1', 'leader-1', 'invitee@example.com')).rejects.toThrow(BadRequestError);
        });

        it('should throw when survey period is finished', async () => {
            mockSurveyWalkRepository.findById.mockResolvedValue(baseWalk as never);
            mockSurveyPeriodRepository.findById.mockResolvedValue({ ...basePeriod, isFinished: true } as never);

            await expect(service.sendInvitation('walk-1', 'leader-1', 'invitee@example.com')).rejects.toThrow(BadRequestError);
        });

        it('should throw NotFoundError when survey period does not exist', async () => {
            mockSurveyWalkRepository.findById.mockResolvedValue(baseWalk as never);
            mockSurveyPeriodRepository.findById.mockResolvedValue(null);

            await expect(service.sendInvitation('walk-1', 'leader-1', 'invitee@example.com')).rejects.toThrow(NotFoundError);
        });

        it('should throw when walk is at full capacity', async () => {
            mockSurveyWalkRepository.findById.mockResolvedValue({
                ...baseWalk,
                volunteerUids: ['user-a', 'user-b'],
                capacity: 2,
            } as never);
            mockSurveyPeriodRepository.findById.mockResolvedValue(basePeriod as never);

            await expect(service.sendInvitation('walk-1', 'leader-1', 'invitee@example.com')).rejects.toThrow(BadRequestError);
        });

        it('should throw conflict when pending invitation already exists', async () => {
            mockSurveyWalkRepository.findById.mockResolvedValue(baseWalk as never);
            mockSurveyPeriodRepository.findById.mockResolvedValue(basePeriod as never);
            mockInvitationRepository.findPendingByWalkAndEmail.mockResolvedValue(makeInvitation());

            await expect(service.sendInvitation('walk-1', 'leader-1', 'invitee@example.com')).rejects.toThrow(ConflictError);
        });

        it('should create invitation and send email on success', async () => {
            const created = makeInvitation();

            mockSurveyWalkRepository.findById.mockResolvedValue(baseWalk as never);
            mockSurveyPeriodRepository.findById.mockResolvedValue(basePeriod as never);
            mockInvitationRepository.findPendingByWalkAndEmail.mockResolvedValue(null);
            vi.mocked(auth.getUser).mockResolvedValue({ displayName: 'Leader Name', email: 'leader@example.com' } as never);
            mockInvitationRepository.create.mockResolvedValue(created);

            const result = await service.sendInvitation('walk-1', 'leader-1', 'invitee@example.com');

            expect(result).toEqual(created);
            expect(mockInvitationRepository.create).toHaveBeenCalledWith(expect.objectContaining({
                surveyWalkUid: 'walk-1',
                inviterUid: 'leader-1',
                inviteeEmail: 'invitee@example.com',
                type: 'walk_invitation',
                status: 'pending',
            }));
            expect(mockEmailService.sendInvitationEmail).toHaveBeenCalledWith(
                'invitee@example.com',
                'Leader Name',
                'Morning Walk',
                'inv-1',
                'walk_invitation',
            );
        });

        it('should rollback invitation when sending email fails', async () => {
            const created = makeInvitation();

            mockSurveyWalkRepository.findById.mockResolvedValue(baseWalk as never);
            mockSurveyPeriodRepository.findById.mockResolvedValue(basePeriod as never);
            mockInvitationRepository.findPendingByWalkAndEmail.mockResolvedValue(null);
            vi.mocked(auth.getUser).mockResolvedValue({ displayName: 'Leader Name', email: 'leader@example.com' } as never);
            mockInvitationRepository.create.mockResolvedValue(created);
            mockEmailService.sendInvitationEmail.mockRejectedValue(new Error('SMTP error'));

            await expect(service.sendInvitation('walk-1', 'leader-1', 'invitee@example.com')).rejects.toThrow(BadRequestError);
            expect(mockInvitationRepository.update).toHaveBeenCalledWith('inv-1', { status: 'declined' });
        });

        it('should fallback inviterName to inviter email when displayName is empty', async () => {
            const created = makeInvitation();

            mockSurveyWalkRepository.findById.mockResolvedValue(baseWalk as never);
            mockSurveyPeriodRepository.findById.mockResolvedValue(basePeriod as never);
            mockInvitationRepository.findPendingByWalkAndEmail.mockResolvedValue(null);
            vi.mocked(auth.getUser).mockResolvedValue({ displayName: '', email: 'leader@example.com' } as never);
            mockInvitationRepository.create.mockResolvedValue(created);

            await service.sendInvitation('walk-1', 'leader-1', 'invitee@example.com');

            expect(mockEmailService.sendInvitationEmail).toHaveBeenCalledWith(
                'invitee@example.com',
                'leader@example.com',
                'Morning Walk',
                'inv-1',
                'walk_invitation',
            );
        });

        it('should fallback inviterName to generic label when no displayName/email', async () => {
            const created = makeInvitation();

            mockSurveyWalkRepository.findById.mockResolvedValue(baseWalk as never);
            mockSurveyPeriodRepository.findById.mockResolvedValue(basePeriod as never);
            mockInvitationRepository.findPendingByWalkAndEmail.mockResolvedValue(null);
            vi.mocked(auth.getUser).mockResolvedValue({ displayName: '', email: undefined } as never);
            mockInvitationRepository.create.mockResolvedValue(created);

            await service.sendInvitation('walk-1', 'leader-1', 'invitee@example.com');

            expect(mockEmailService.sendInvitationEmail).toHaveBeenCalledWith(
                'invitee@example.com',
                'A volunteer',
                'Morning Walk',
                'inv-1',
                'walk_invitation',
            );
        });
    });

    describe('sendLeaderInvitation', () => {
        it('should throw NotFoundError when walk does not exist', async () => {
            mockSurveyWalkRepository.findById.mockResolvedValue(null);

            await expect(service.sendLeaderInvitation('walk-1', 'leader-1', 'user-a')).rejects.toThrow(NotFoundError);
        });

        it('should throw when walk is finished', async () => {
            mockSurveyWalkRepository.findById.mockResolvedValue({ ...baseWalk, isFinished: true } as never);

            await expect(service.sendLeaderInvitation('walk-1', 'leader-1', 'user-a')).rejects.toThrow(BadRequestError);
        });

        it('should validate requester is current leader', async () => {
            mockSurveyWalkRepository.findById.mockResolvedValue(baseWalk as never);

            await expect(service.sendLeaderInvitation('walk-1', 'someone-else', 'user-a')).rejects.toThrow(BadRequestError);
        });

        it('should throw when new leader is not part of walk volunteers', async () => {
            mockSurveyWalkRepository.findById.mockResolvedValue({ ...baseWalk, volunteerUids: ['another-user'] } as never);

            await expect(service.sendLeaderInvitation('walk-1', 'leader-1', 'user-a')).rejects.toThrow(BadRequestError);
        });

        it('should throw when inviter tries to invite themself as leader', async () => {
            mockSurveyWalkRepository.findById.mockResolvedValue({ ...baseWalk, volunteerUids: ['leader-1'] } as never);

            await expect(service.sendLeaderInvitation('walk-1', 'leader-1', 'leader-1')).rejects.toThrow(BadRequestError);
        });

        it('should throw when survey period for walk is missing', async () => {
            mockSurveyWalkRepository.findById.mockResolvedValue(baseWalk as never);
            mockSurveyPeriodRepository.findById.mockResolvedValue(null);

            await expect(service.sendLeaderInvitation('walk-1', 'leader-1', 'user-a')).rejects.toThrow(NotFoundError);
        });

        it('should throw when survey period is finished', async () => {
            mockSurveyWalkRepository.findById.mockResolvedValue(baseWalk as never);
            mockSurveyPeriodRepository.findById.mockResolvedValue({ ...basePeriod, isFinished: true } as never);

            await expect(service.sendLeaderInvitation('walk-1', 'leader-1', 'user-a')).rejects.toThrow(BadRequestError);
        });

        it('should throw conflict when pending leader invitation already exists', async () => {
            mockSurveyWalkRepository.findById.mockResolvedValue(baseWalk as never);
            mockSurveyPeriodRepository.findById.mockResolvedValue(basePeriod as never);
            vi.mocked(auth.getUser).mockResolvedValue({ email: 'newleader@example.com' } as never);
            mockInvitationRepository.findPendingByWalkAndEmail.mockResolvedValue(
                makeInvitation({ type: 'leader_invitation', inviteeEmail: 'newleader@example.com' }),
            );

            await expect(service.sendLeaderInvitation('walk-1', 'leader-1', 'user-a')).rejects.toThrow(ConflictError);
        });

        it('should allow leader invitation when existing pending invitation is walk_invitation', async () => {
            const created = makeInvitation({ type: 'leader_invitation', proposedLeaderUid: 'user-a' });

            mockSurveyWalkRepository.findById.mockResolvedValue(baseWalk as never);
            mockSurveyPeriodRepository.findById.mockResolvedValue(basePeriod as never);
            vi.mocked(auth.getUser)
                .mockResolvedValueOnce({ email: 'newleader@example.com' } as never)
                .mockResolvedValueOnce({ displayName: 'Leader Name', email: 'leader@example.com' } as never);
            mockInvitationRepository.findPendingByWalkAndEmail.mockResolvedValue(
                makeInvitation({ type: 'walk_invitation', inviteeEmail: 'newleader@example.com' }),
            );
            mockInvitationRepository.create.mockResolvedValue(created);

            const result = await service.sendLeaderInvitation('walk-1', 'leader-1', 'user-a');

            expect(result.type).toBe('leader_invitation');
        });

        it('should throw when selected volunteer has no email', async () => {
            mockSurveyWalkRepository.findById.mockResolvedValue(baseWalk as never);
            mockSurveyPeriodRepository.findById.mockResolvedValue(basePeriod as never);
            vi.mocked(auth.getUser).mockResolvedValue({ email: undefined } as never);

            await expect(service.sendLeaderInvitation('walk-1', 'leader-1', 'user-a')).rejects.toThrow(BadRequestError);
        });

        it('should create leader invitation and send email', async () => {
            const created = makeInvitation({ type: 'leader_invitation', proposedLeaderUid: 'user-a' });

            mockSurveyWalkRepository.findById.mockResolvedValue(baseWalk as never);
            mockSurveyPeriodRepository.findById.mockResolvedValue(basePeriod as never);
            vi.mocked(auth.getUser)
                .mockResolvedValueOnce({ email: 'newleader@example.com' } as never)
                .mockResolvedValueOnce({ displayName: 'Leader Name', email: 'leader@example.com' } as never);
            mockInvitationRepository.findPendingByWalkAndEmail.mockResolvedValue(null);
            mockInvitationRepository.create.mockResolvedValue(created);

            const result = await service.sendLeaderInvitation('walk-1', 'leader-1', 'user-a');

            expect(result.type).toBe('leader_invitation');
            expect(mockEmailService.sendInvitationEmail).toHaveBeenCalledWith(
                'newleader@example.com',
                'Leader Name',
                'Morning Walk',
                'inv-1',
                'leader_invitation',
            );
        });
    });

    describe('acceptInvitation and declineInvitation', () => {
        it('should list invitations by walk uid', async () => {
            mockInvitationRepository.findBySurveyWalkUid.mockResolvedValue([makeInvitation()]);

            const result = await service.getInvitationsForWalk('walk-1');
            expect(result).toHaveLength(1);
            expect(mockInvitationRepository.findBySurveyWalkUid).toHaveBeenCalledWith('walk-1');
        });

        it('should return pending invitations for current invitee', async () => {
            mockInvitationRepository.findByInviteeEmail.mockResolvedValue([
                makeInvitation({ uid: 'pending-1', status: 'pending' }),
                makeInvitation({ uid: 'accepted-1', status: 'accepted' }),
            ]);

            const result = await service.getMyInvitations('invitee@example.com');
            expect(result.map((x) => x.uid)).toEqual(['pending-1']);
        });

        it('should accept walk invitation and add volunteer when not yet joined', async () => {
            mockInvitationRepository.findById.mockResolvedValue(makeInvitation());
            mockSurveyWalkRepository.findById.mockResolvedValue({ ...baseWalk, volunteerUids: ['user-z'], leader: '' } as never);
            mockInvitationRepository.update.mockResolvedValue(makeInvitation({ status: 'accepted' }));

            const result = await service.acceptInvitation('inv-1', 'invitee-uid', 'invitee@example.com');

            expect(mockSurveyWalkRepository.update).toHaveBeenCalledWith('walk-1', {
                volunteerUids: ['user-z', 'invitee-uid'],
                leader: 'invitee-uid',
            });
            expect(result.status).toBe('accepted');
        });

        it('should accept leader invitation by updating leader only', async () => {
            mockInvitationRepository.findById.mockResolvedValue(
                makeInvitation({ type: 'leader_invitation', proposedLeaderUid: 'user-a' }),
            );
            mockSurveyWalkRepository.findById.mockResolvedValue({ ...baseWalk, volunteerUids: ['user-a'] } as never);
            mockInvitationRepository.update.mockResolvedValue(makeInvitation({ status: 'accepted' }));

            await service.acceptInvitation('inv-1', 'user-a', 'invitee@example.com');

            expect(mockSurveyWalkRepository.update).toHaveBeenCalledWith('walk-1', { leader: 'user-a' });
        });

        it('should throw NotFoundError when accepting a missing invitation', async () => {
            mockInvitationRepository.findById.mockResolvedValue(null);

            await expect(service.acceptInvitation('inv-missing', 'user-a', 'invitee@example.com')).rejects.toThrow(NotFoundError);
        });

        it('should reject accept when invitation status is not pending', async () => {
            mockInvitationRepository.findById.mockResolvedValue(makeInvitation({ status: 'declined' }));

            await expect(service.acceptInvitation('inv-1', 'user-a', 'invitee@example.com')).rejects.toThrow(BadRequestError);
        });

        it('should throw when walk does not exist while accepting', async () => {
            mockInvitationRepository.findById.mockResolvedValue(makeInvitation());
            mockSurveyWalkRepository.findById.mockResolvedValue(null);

            await expect(service.acceptInvitation('inv-1', 'user-a', 'invitee@example.com')).rejects.toThrow(NotFoundError);
        });

        it('should reject leader invitation when proposedLeaderUid does not match user', async () => {
            mockInvitationRepository.findById.mockResolvedValue(
                makeInvitation({ type: 'leader_invitation', proposedLeaderUid: 'other-user' }),
            );
            mockSurveyWalkRepository.findById.mockResolvedValue({ ...baseWalk, volunteerUids: ['user-a'] } as never);

            await expect(service.acceptInvitation('inv-1', 'user-a', 'invitee@example.com')).rejects.toThrow(BadRequestError);
        });

        it('should reject leader invitation when user is not volunteer in walk', async () => {
            mockInvitationRepository.findById.mockResolvedValue(
                makeInvitation({ type: 'leader_invitation', proposedLeaderUid: 'user-a' }),
            );
            mockSurveyWalkRepository.findById.mockResolvedValue({ ...baseWalk, volunteerUids: ['other-user'] } as never);

            await expect(service.acceptInvitation('inv-1', 'user-a', 'invitee@example.com')).rejects.toThrow(BadRequestError);
        });

        it('should not update walk when accepting regular invitation for already-joined volunteer', async () => {
            mockInvitationRepository.findById.mockResolvedValue(makeInvitation());
            mockSurveyWalkRepository.findById.mockResolvedValue({ ...baseWalk, volunteerUids: ['user-a'], leader: 'leader-1' } as never);
            mockInvitationRepository.update.mockResolvedValue(makeInvitation({ status: 'accepted' }));

            await service.acceptInvitation('inv-1', 'user-a', 'invitee@example.com');

            expect(mockSurveyWalkRepository.update).not.toHaveBeenCalled();
        });

        it('should reject accept when invitation does not belong to user email', async () => {
            mockInvitationRepository.findById.mockResolvedValue(makeInvitation({ inviteeEmail: 'other@example.com' }));

            await expect(service.acceptInvitation('inv-1', 'user-a', 'invitee@example.com')).rejects.toThrow(BadRequestError);
        });

        it('should decline invitation when valid', async () => {
            mockInvitationRepository.findById.mockResolvedValue(makeInvitation());
            mockInvitationRepository.update.mockResolvedValue(makeInvitation({ status: 'declined' }));

            const result = await service.declineInvitation('inv-1', 'invitee@example.com');

            expect(mockInvitationRepository.update).toHaveBeenCalledWith('inv-1', { status: 'declined' });
            expect(result.status).toBe('declined');
        });

        it('should throw NotFoundError when declining missing invitation', async () => {
            mockInvitationRepository.findById.mockResolvedValue(null);

            await expect(service.declineInvitation('inv-missing', 'invitee@example.com')).rejects.toThrow(NotFoundError);
        });

        it('should reject decline when invitation belongs to another email', async () => {
            mockInvitationRepository.findById.mockResolvedValue(makeInvitation({ inviteeEmail: 'other@example.com' }));

            await expect(service.declineInvitation('inv-1', 'invitee@example.com')).rejects.toThrow(BadRequestError);
        });

        it('should reject decline when invitation is no longer pending', async () => {
            mockInvitationRepository.findById.mockResolvedValue(makeInvitation({ status: 'accepted' }));

            await expect(service.declineInvitation('inv-1', 'invitee@example.com')).rejects.toThrow(BadRequestError);
        });
    });
});
