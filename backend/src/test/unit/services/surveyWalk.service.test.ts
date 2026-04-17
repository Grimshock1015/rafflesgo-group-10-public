import { describe, it, expect, vi, beforeEach, Mocked } from 'vitest';
import { SurveyWalkService } from '../../../services/surveyWalk.service';
import { SurveyWalkRepository } from '../../../repositories/surveyWalk.repository';
import { SurveyPeriodRepository } from '../../../repositories/surveyPeriod.repository';
import { WalkCompletionService } from '../../../services/walkCompletion.service';
import { InvitationService } from '../../../services/invitation.service';
import { SurveyWalkEntity } from '../../../entities/surveyWalk.entity';
import { SurveyPeriodEntity } from '../../../entities/surveyPeriod.entity';
import { BadRequestError, ConflictError, NotFoundError } from '../../../lib/errors';
import * as SightingService from '../../../services/sighting.service';

vi.mock('../../../services/sighting.service', async () => {
	const actual = await vi.importActual<typeof import('../../../services/sighting.service')>('../../../services/sighting.service');
	return {
		...actual,
		countSightingsBySurveyWalkUid: vi.fn(),
	};
});

describe('SurveyWalkService Unit Tests', () => {
	let service: SurveyWalkService;
	let mockSurveyWalkRepository: Mocked<SurveyWalkRepository>;
	let mockSurveyPeriodRepository: Mocked<SurveyPeriodRepository>;
	let mockWalkCompletionService: Mocked<WalkCompletionService>;
	let mockInvitationService: Mocked<InvitationService>;

	const period: SurveyPeriodEntity = {
		uid: 'period-1',
		name: 'Spring 2026',
		startDate: new Date('2026-03-01T00:00:00.000Z'),
		endDate: new Date('2026-05-31T00:00:00.000Z'),
		isFinished: false,
		isActive: true,
		minWalks: 2
	};

	const walk: SurveyWalkEntity = {
		uid: 'walk-1',
		surveyPeriodUid: period.uid,
		name: 'Morning Walk',
		date: new Date('2026-04-01T00:00:00.000Z'),
		startTime: '08:00',
		endTime: '10:00',
		capacity: 2,
		isFinished: false,
		volunteerUids: [],
		attendeeUids: [],
		completedAt: null,
		leader: '',
	};

	beforeEach(() => {
		vi.clearAllMocks();

		mockSurveyWalkRepository = {
			findAll: vi.fn(),
			findById: vi.fn(),
			findBySurveyPeriodUid: vi.fn(),
			findBySurveyPeriodUids: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
		} as unknown as Mocked<SurveyWalkRepository>;

		mockSurveyPeriodRepository = {
			findAll: vi.fn(),
			findById: vi.fn(),
			findByVolunteerUid: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
			join: vi.fn(),
			unjoin: vi.fn(),
		} as unknown as Mocked<SurveyPeriodRepository>;

		mockWalkCompletionService = {
			sendAttendanceEmails: vi.fn().mockResolvedValue(undefined),
		} as unknown as Mocked<WalkCompletionService>;

		mockInvitationService = {
			sendLeaderInvitation: vi.fn().mockResolvedValue({
				uid: 'inv-1',
				surveyWalkUid: walk.uid,
				inviterUid: 'volunteer-1',
				inviteeEmail: 'volunteer-2@example.com',
				type: 'leader_invitation',
				proposedLeaderUid: 'volunteer-2',
				status: 'pending',
				createdAt: new Date('2026-04-01T00:00:00.000Z'),
			}),
			deleteInvitationsForWalk: vi.fn().mockResolvedValue(0),
		} as unknown as Mocked<InvitationService>;

		vi.mocked(SightingService.countSightingsBySurveyWalkUid).mockResolvedValue(0);

		service = new SurveyWalkService(mockSurveyWalkRepository, mockSurveyPeriodRepository, mockWalkCompletionService, mockInvitationService);
	});

	describe('getAllSurveyWalks', () => {
		it('should return all survey walks', async () => {
			mockSurveyWalkRepository.findAll.mockResolvedValue([walk]);

			const result = await service.getAllSurveyWalks();

			expect(result).toEqual([walk]);
			expect(mockSurveyWalkRepository.findAll).toHaveBeenCalledOnce();
		});
	});

	describe('getSurveyWalksBySurveyPeriodUid', () => {
		it('should throw NotFoundError when survey period does not exist', async () => {
			mockSurveyPeriodRepository.findById.mockResolvedValue(null);

			await expect(service.getSurveyWalksBySurveyPeriodUid(period.uid)).rejects.toThrow(NotFoundError);
			expect(mockSurveyWalkRepository.findBySurveyPeriodUid).not.toHaveBeenCalled();
		});

		it('should return survey walks for an existing survey period', async () => {
			mockSurveyPeriodRepository.findById.mockResolvedValue(period);
			mockSurveyWalkRepository.findBySurveyPeriodUid.mockResolvedValue([walk]);

			const result = await service.getSurveyWalksBySurveyPeriodUid(period.uid);

			expect(result).toEqual([walk]);
			expect(mockSurveyWalkRepository.findBySurveyPeriodUid).toHaveBeenCalledWith(period.uid);
		});
	});

	describe('getSurveyWalksForJoinedPeriods', () => {
		it('should return empty array when user has no joined periods', async () => {
			mockSurveyPeriodRepository.findAll.mockResolvedValue([]);

			const result = await service.getSurveyWalksForJoinedPeriods();

			expect(result).toEqual([]);
			expect(mockSurveyWalkRepository.findBySurveyPeriodUids).not.toHaveBeenCalled();
		});

		it('should query walk repository with joined period uids', async () => {
			mockSurveyPeriodRepository.findAll.mockResolvedValue([
				period,
				{ ...period, uid: 'period-2', name: 'Summer 2026', isActive: false },
			]);
			mockSurveyWalkRepository.findBySurveyPeriodUids.mockResolvedValue([walk]);

			const result = await service.getSurveyWalksForJoinedPeriods();

			expect(result).toEqual([walk]);
			expect(mockSurveyWalkRepository.findBySurveyPeriodUids).toHaveBeenCalledWith(['period-1']);
		});
	});

	describe('getSurveyWalk', () => {
		it('should return survey walk when it exists', async () => {
			mockSurveyWalkRepository.findById.mockResolvedValue(walk);

			const result = await service.getSurveyWalk(walk.uid);

			expect(result).toEqual(walk);
			expect(mockSurveyWalkRepository.findById).toHaveBeenCalledWith(walk.uid);
		});

		it('should throw NotFoundError when survey walk does not exist', async () => {
			mockSurveyWalkRepository.findById.mockResolvedValue(null);

			await expect(service.getSurveyWalk('missing-walk')).rejects.toThrow(NotFoundError);
		});
	});

	describe('createSurveyWalk', () => {
		it('should throw NotFoundError when related survey period does not exist', async () => {
			mockSurveyPeriodRepository.findById.mockResolvedValue(null);

			await expect(service.createSurveyWalk({ ...walk, surveyPeriodUid: 'non-existent' })).rejects.toThrow(NotFoundError);
			expect(mockSurveyWalkRepository.create).not.toHaveBeenCalled();
		});

		it('should throw BadRequestError when start time is after end time', async () => {
			mockSurveyPeriodRepository.findById.mockResolvedValue(period);

			await expect(
				service.createSurveyWalk({
					surveyPeriodUid: period.uid,
					name: 'Invalid Time Walk',
					date: walk.date,
					startTime: '10:00',
					endTime: '08:00',
					capacity: 3,
					isFinished: false,
					volunteerUids: [],
					attendeeUids: [],
					completedAt: null,
					leader: '',
				})
			).rejects.toThrow(BadRequestError);

			expect(mockSurveyWalkRepository.create).not.toHaveBeenCalled();
		});

		it('should throw BadRequestError when date is outside period range', async () => {
			mockSurveyPeriodRepository.findById.mockResolvedValue(period);

			await expect(
				service.createSurveyWalk({
					surveyPeriodUid: period.uid,
					name: 'Bad Date Walk',
					date: new Date('2026-06-15T00:00:00.000Z'),
					startTime: '08:00',
					endTime: '10:00',
					capacity: 3,
					isFinished: false,
					volunteerUids: [],
					attendeeUids: [],
					completedAt: null,
					leader: '',
				})
			).rejects.toThrow(BadRequestError);

			expect(mockSurveyWalkRepository.create).not.toHaveBeenCalled();
		});

		it('should create survey walk when input is valid', async () => {
			const input = {
				surveyPeriodUid: period.uid,
				name: walk.name,
				date: walk.date,
				startTime: walk.startTime,
				endTime: walk.endTime,
				capacity: walk.capacity,
				isFinished: walk.isFinished,
				volunteerUids: walk.volunteerUids,
				leader: walk.leader,
				attendeeUids: walk.attendeeUids,
				completedAt: walk.completedAt,
			};
			mockSurveyPeriodRepository.findById.mockResolvedValue(period);
			mockSurveyWalkRepository.create.mockResolvedValue(walk);

			const result = await service.createSurveyWalk(input);

			expect(result).toEqual(walk);
			expect(mockSurveyWalkRepository.create).toHaveBeenCalledWith(input);
		});
	});

	describe('bulkCreateSurveyWalks', () => {
		it('should create walks for selected weekend days and skip duplicate slots', async () => {
			mockSurveyPeriodRepository.findById.mockResolvedValue({
				...period,
				startDate: new Date('2026-04-03T00:00:00.000Z'),
				endDate: new Date('2026-04-12T00:00:00.000Z'),
			});
			mockSurveyWalkRepository.findBySurveyPeriodUid.mockResolvedValue([
				{
					...walk,
					date: new Date('2026-04-05T00:00:00.000Z'),
					startTime: '08:00',
					endTime: '10:00',
				},
			]);
			let createIndex = 0;
			mockSurveyWalkRepository.create.mockImplementation(async (payload) => ({
				uid: `walk-${++createIndex}`,
				...payload,
			}));

			const result = await service.bulkCreateSurveyWalks({
				surveyPeriodUid: period.uid,
				namePrefix: 'Spring 2026',
				weekdays: [6, 0],
				timeSlots: [
					{ label: 'Morning', startTime: '08:00', endTime: '10:00' },
					{ label: 'Afternoon', startTime: '16:00', endTime: '18:00' },
				],
				capacity: 4,
			});

			expect(result.created).toHaveLength(7);
			expect(result.skipped).toEqual([
				expect.objectContaining({
					date: new Date('2026-04-05T00:00:00.000Z'),
					startTime: '08:00',
					endTime: '10:00',
					reason: 'A walk already exists for this date and time',
				}),
			]);
			expect(mockSurveyWalkRepository.create).toHaveBeenCalledWith(expect.objectContaining({
				surveyPeriodUid: period.uid,
				capacity: 4,
				name: expect.stringContaining('Morning'),
			}));
		});

		it('should reject empty weekday selections', async () => {
			mockSurveyPeriodRepository.findById.mockResolvedValue(period);

			await expect(service.bulkCreateSurveyWalks({
				surveyPeriodUid: period.uid,
				namePrefix: 'Spring 2026',
				weekdays: [],
				timeSlots: [{ startTime: '08:00', endTime: '10:00' }],
				capacity: 4,
			})).rejects.toThrow(BadRequestError);

			expect(mockSurveyWalkRepository.create).not.toHaveBeenCalled();
		});
	});

	describe('updateSurveyWalk', () => {
		it('should throw NotFoundError when target walk does not exist', async () => {
			mockSurveyWalkRepository.findById.mockResolvedValue(null);

			await expect(service.updateSurveyWalk('missing', { name: 'New' })).rejects.toThrow(NotFoundError);
			expect(mockSurveyWalkRepository.update).not.toHaveBeenCalled();
		});

		it('should validate date with existing period/date defaults', async () => {
			mockSurveyWalkRepository.findById.mockResolvedValue(walk);
			mockSurveyPeriodRepository.findById.mockResolvedValue(period);
			mockSurveyWalkRepository.update.mockResolvedValue({ ...walk, name: 'Renamed Walk' });

			const result = await service.updateSurveyWalk(walk.uid, { name: 'Renamed Walk' });

			expect(result.name).toBe('Renamed Walk');
			expect(mockSurveyWalkRepository.update).toHaveBeenCalledWith(walk.uid, expect.objectContaining({
				name: 'Renamed Walk',
				volunteerUids: walk.volunteerUids,
				attendeeUids: walk.attendeeUids,
				leader: walk.leader,
				capacity: walk.capacity,
				isFinished: walk.isFinished,
			}));
		});

		it('should throw BadRequestError when updated date is outside period range', async () => {
			mockSurveyWalkRepository.findById.mockResolvedValue(walk);
			mockSurveyPeriodRepository.findById.mockResolvedValue(period);

			await expect(
				service.updateSurveyWalk(walk.uid, { date: new Date('2027-01-01T00:00:00.000Z') })
			).rejects.toThrow(BadRequestError);

			expect(mockSurveyWalkRepository.update).not.toHaveBeenCalled();
		});

		it('should throw BadRequestError when updated times are out-of-order', async () => {
			mockSurveyWalkRepository.findById.mockResolvedValue(walk);
			mockSurveyPeriodRepository.findById.mockResolvedValue(period);

			await expect(
				service.updateSurveyWalk(walk.uid, { startTime: '11:00', endTime: '09:00' })
			).rejects.toThrow(BadRequestError);

			expect(mockSurveyWalkRepository.update).not.toHaveBeenCalled();
		});

		it('should normalize admin edits when volunteers are removed and leader becomes invalid', async () => {
			const joinedWalk = {
				...walk,
				volunteerUids: ['volunteer-1', 'volunteer-2'],
				attendeeUids: ['volunteer-1'],
				leader: 'volunteer-2',
			};
			mockSurveyWalkRepository.findById.mockResolvedValue(joinedWalk);
			mockSurveyPeriodRepository.findById.mockResolvedValue(period);
			mockSurveyWalkRepository.update.mockResolvedValue({
				...joinedWalk,
				volunteerUids: ['volunteer-1'],
				attendeeUids: ['volunteer-1'],
				leader: 'volunteer-1',
			});

			await service.updateSurveyWalk(walk.uid, {
				volunteerUids: ['volunteer-1'],
			});

			expect(mockSurveyWalkRepository.update).toHaveBeenCalledWith(walk.uid, expect.objectContaining({
				volunteerUids: ['volunteer-1'],
				attendeeUids: [],
				leader: 'volunteer-1',
			}));
		});

		it('should clear attendance data when an admin reopens a completed walk', async () => {
			const completedWalk = {
				...walk,
				isFinished: true,
				volunteerUids: ['volunteer-1'],
				attendeeUids: ['volunteer-1'],
				completedAt: new Date('2026-04-01T11:00:00.000Z'),
				leader: 'volunteer-1',
			};
			mockSurveyWalkRepository.findById.mockResolvedValue(completedWalk);
			mockSurveyPeriodRepository.findById.mockResolvedValue(period);
			mockSurveyWalkRepository.update.mockResolvedValue({
				...completedWalk,
				isFinished: false,
				attendeeUids: [],
				completedAt: null,
			});

			await service.updateSurveyWalk(walk.uid, {
				isFinished: false,
			});

			expect(mockSurveyWalkRepository.update).toHaveBeenCalledWith(walk.uid, expect.objectContaining({
				isFinished: false,
				attendeeUids: [],
				completedAt: null,
			}));
		});

		it('should reject admin updates when attendance includes removed volunteers', async () => {
			const joinedWalk = {
				...walk,
				isFinished: true,
				volunteerUids: ['volunteer-1', 'volunteer-2'],
				attendeeUids: ['volunteer-1'],
				completedAt: new Date('2026-04-01T11:00:00.000Z'),
				leader: 'volunteer-1',
			};
			mockSurveyWalkRepository.findById.mockResolvedValue(joinedWalk);
			mockSurveyPeriodRepository.findById.mockResolvedValue(period);

			await expect(
				service.updateSurveyWalk(walk.uid, {
					volunteerUids: ['volunteer-1'],
					attendeeUids: ['volunteer-2'],
					isFinished: true,
				})
			).rejects.toThrow(BadRequestError);

			expect(mockSurveyWalkRepository.update).not.toHaveBeenCalled();
		});

		it('should reject admin updates when capacity drops below registered volunteers', async () => {
			const joinedWalk = {
				...walk,
				volunteerUids: ['volunteer-1', 'volunteer-2'],
				leader: 'volunteer-1',
			};
			mockSurveyWalkRepository.findById.mockResolvedValue(joinedWalk);
			mockSurveyPeriodRepository.findById.mockResolvedValue(period);

			await expect(
				service.updateSurveyWalk(walk.uid, {
					capacity: 1,
				})
			).rejects.toThrow(BadRequestError);

			expect(mockSurveyWalkRepository.update).not.toHaveBeenCalled();
		});

		it('should throw NotFoundError when repository update returns null', async () => {
			mockSurveyWalkRepository.findById.mockResolvedValue(walk);
			mockSurveyPeriodRepository.findById.mockResolvedValue(period);
			mockSurveyWalkRepository.update.mockResolvedValue(null);

			await expect(service.updateSurveyWalk(walk.uid, { name: 'Updated' })).rejects.toThrow(NotFoundError);
		});
	});

	describe('deleteSurveyWalk', () => {
		it('should return success object when delete succeeds', async () => {
			mockSurveyWalkRepository.findById.mockResolvedValue(walk);
			vi.mocked(SightingService.countSightingsBySurveyWalkUid).mockResolvedValue(0);
			mockSurveyWalkRepository.delete.mockResolvedValue(true);

			const result = await service.deleteSurveyWalk(walk.uid);

			expect(result).toEqual({ success: true, uid: walk.uid });
			expect(SightingService.countSightingsBySurveyWalkUid).toHaveBeenCalledWith(walk.uid);
			expect(mockInvitationService.deleteInvitationsForWalk).toHaveBeenCalledWith(walk.uid);
			expect(mockSurveyWalkRepository.delete).toHaveBeenCalledWith(walk.uid);
		});

		it('should throw NotFoundError when walk does not exist', async () => {
			mockSurveyWalkRepository.findById.mockResolvedValue(null);

			await expect(service.deleteSurveyWalk(walk.uid)).rejects.toThrow(NotFoundError);
			expect(mockSurveyWalkRepository.delete).not.toHaveBeenCalled();
			expect(mockInvitationService.deleteInvitationsForWalk).not.toHaveBeenCalled();
		});

		it('should throw ConflictError when sightings still reference the walk', async () => {
			mockSurveyWalkRepository.findById.mockResolvedValue(walk);
			vi.mocked(SightingService.countSightingsBySurveyWalkUid).mockResolvedValue(1);

			await expect(service.deleteSurveyWalk(walk.uid)).rejects.toThrow(ConflictError);
			expect(mockSurveyWalkRepository.delete).not.toHaveBeenCalled();
			expect(mockInvitationService.deleteInvitationsForWalk).not.toHaveBeenCalled();
		});

		it('should throw NotFoundError when delete fails after checks', async () => {
			mockSurveyWalkRepository.findById.mockResolvedValue(walk);
			vi.mocked(SightingService.countSightingsBySurveyWalkUid).mockResolvedValue(0);
			mockSurveyWalkRepository.delete.mockResolvedValue(false);

			await expect(service.deleteSurveyWalk(walk.uid)).rejects.toThrow(NotFoundError);
		});
	});

	describe('joinSurveyWalk', () => {
		it('should return existing walk when volunteer already joined', async () => {
			const joinedWalk = { ...walk, volunteerUids: ['volunteer-1'], leader: 'volunteer-1' };
			mockSurveyWalkRepository.findById.mockResolvedValue(joinedWalk);
			mockSurveyPeriodRepository.findById.mockResolvedValue(period);

			const result = await service.joinSurveyWalk(joinedWalk.uid, 'volunteer-1');

			expect(result).toEqual(joinedWalk);
			expect(mockSurveyWalkRepository.update).not.toHaveBeenCalled();
		});

		it('should throw BadRequestError when walk is at capacity', async () => {
			const fullWalk = { ...walk, capacity: 1, volunteerUids: ['volunteer-1'], leader: 'volunteer-1' };
			mockSurveyWalkRepository.findById.mockResolvedValue(fullWalk);
			mockSurveyPeriodRepository.findById.mockResolvedValue(period);

			await expect(service.joinSurveyWalk(fullWalk.uid, 'volunteer-2')).rejects.toThrow(BadRequestError);
			expect(mockSurveyWalkRepository.update).not.toHaveBeenCalled();
		});

		it('should add volunteer and assign leader when none exists', async () => {
			const updatedWalk = { ...walk, volunteerUids: ['volunteer-1'], leader: 'volunteer-1' };
			mockSurveyWalkRepository.findById.mockResolvedValue(walk);
			mockSurveyPeriodRepository.findById.mockResolvedValue(period);
			mockSurveyWalkRepository.update.mockResolvedValue(updatedWalk);

			const result = await service.joinSurveyWalk(walk.uid, 'volunteer-1');

			expect(result).toEqual(updatedWalk);
			expect(mockSurveyWalkRepository.update).toHaveBeenCalledWith(walk.uid, {
				volunteerUids: ['volunteer-1'],
				leader: 'volunteer-1',
			});
		});
	});

	describe('quitSurveyWalk', () => {
		it('should throw BadRequestError when volunteer is not part of walk', async () => {
			const joinedWalk = { ...walk, volunteerUids: ['volunteer-1'], leader: 'volunteer-1' };
			mockSurveyWalkRepository.findById.mockResolvedValue(joinedWalk);

			await expect(service.quitSurveyWalk(joinedWalk.uid, 'volunteer-2')).rejects.toThrow(BadRequestError);
		});

		it('should set leader to empty string when leader quits and no volunteers remain', async () => {
			const joinedWalk = { ...walk, volunteerUids: ['volunteer-1'], leader: 'volunteer-1' };
			const updated = { ...walk, volunteerUids: [], leader: '' };
			mockSurveyWalkRepository.findById.mockResolvedValue(joinedWalk);
			mockSurveyWalkRepository.update.mockResolvedValue(updated);

			const result = await service.quitSurveyWalk(joinedWalk.uid, 'volunteer-1');

			expect(result).toEqual(updated);
			expect(mockSurveyWalkRepository.update).toHaveBeenCalledWith(joinedWalk.uid, {
				volunteerUids: [],
				leader: '',
			});
		});

		it('should pick a new leader when current leader quits and volunteers remain', async () => {
			const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.9);
			const joinedWalk = {
				...walk,
				volunteerUids: ['volunteer-1', 'volunteer-2', 'volunteer-3'],
				leader: 'volunteer-1',
			};
			const updated = {
				...walk,
				volunteerUids: ['volunteer-2', 'volunteer-3'],
				leader: 'volunteer-3',
			};

			mockSurveyWalkRepository.findById.mockResolvedValue(joinedWalk);
			mockSurveyWalkRepository.update.mockResolvedValue(updated);

			const result = await service.quitSurveyWalk(joinedWalk.uid, 'volunteer-1');

			expect(result).toEqual(updated);
			expect(mockSurveyWalkRepository.update).toHaveBeenCalledWith(joinedWalk.uid, {
				volunteerUids: ['volunteer-2', 'volunteer-3'],
				leader: 'volunteer-3',
			});

			randomSpy.mockRestore();
		});
	});

	describe('reassignLeader', () => {
		it('should send a leader invitation and keep the current leader until acceptance', async () => {
			const joinedWalk = { ...walk, volunteerUids: ['volunteer-1', 'volunteer-2'], leader: 'volunteer-1' };
			mockSurveyWalkRepository.findById.mockResolvedValue(joinedWalk);

			const result = await service.reassignLeader(joinedWalk.uid, 'volunteer-1', 'volunteer-2');

			expect(mockInvitationService.sendLeaderInvitation).toHaveBeenCalledWith(joinedWalk.uid, 'volunteer-1', 'volunteer-2');
			expect(mockSurveyWalkRepository.update).not.toHaveBeenCalled();
			expect(result).toEqual(joinedWalk);
		});
	});

	describe('completeSurveyWalk', () => {
		it('should throw when requester is not leader or admin', async () => {
			const joinedWalk = { ...walk, volunteerUids: ['volunteer-1'], leader: 'volunteer-1' };
			mockSurveyWalkRepository.findById.mockResolvedValue(joinedWalk);

			await expect(
				service.completeSurveyWalk(joinedWalk.uid, 'volunteer-2', ['volunteer-1'], false)
			).rejects.toThrow(BadRequestError);
		});

		it('should throw when attendees include users who did not register', async () => {
			const joinedWalk = { ...walk, volunteerUids: ['volunteer-1'], leader: 'volunteer-1' };
			mockSurveyWalkRepository.findById.mockResolvedValue(joinedWalk);

			await expect(
				service.completeSurveyWalk(joinedWalk.uid, 'volunteer-1', ['volunteer-2'], false)
			).rejects.toThrow(BadRequestError);
		});

		it('should mark walk complete and save unique attendee uids', async () => {
			const joinedWalk = {
				...walk,
				volunteerUids: ['volunteer-1', 'volunteer-2'],
				leader: 'volunteer-1',
			};
			const updated = {
				...joinedWalk,
				isFinished: true,
				attendeeUids: ['volunteer-1'],
				completedAt: new Date('2026-04-01T11:00:00.000Z'),
			};
			mockSurveyWalkRepository.findById.mockResolvedValue(joinedWalk);
			mockSurveyWalkRepository.update.mockResolvedValue(updated);

			const result = await service.completeSurveyWalk(
				joinedWalk.uid,
				'volunteer-1',
				['volunteer-1', 'volunteer-1'],
				false,
			);

			expect(result).toEqual(updated);
			expect(mockSurveyWalkRepository.update).toHaveBeenCalledWith(joinedWalk.uid, {
				isFinished: true,
				attendeeUids: ['volunteer-1'],
				completedAt: expect.any(Date),
			});
		});
	});
});
