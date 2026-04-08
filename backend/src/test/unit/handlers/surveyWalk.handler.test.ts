import { describe, it, expect, vi, beforeEach, Mocked } from 'vitest';
import {
	listSurveyWalksHandler,
	getSurveyWalkHandler,
	listSurveyWalksBySurveyPeriodHandler,
	listSurveyWalksForCurrentUserHandler,
	createSurveyWalkHandler,
	updateSurveyWalkHandler,
	deleteSurveyWalkHandler,
	joinSurveyWalkHandler,
	quitSurveyWalkHandler,
	reassignSurveyWalkLeaderHandler,
	completeSurveyWalkHandler,
} from '../../../handlers/surveyWalks.handlers';
import { getContainer } from '../../../container';
import { SurveyWalkService } from '../../../services/surveyWalk.service';
import { SurveyWalkEntity } from '../../../entities/surveyWalk.entity';
import { SurveyPeriodRepository } from '../../../repositories/surveyPeriod.repository';
import { auth } from '../../../lib/firebase-admin';
import { BadRequestError } from '../../../lib/errors';

vi.mock('../../../container', () => ({
	getContainer: vi.fn(),
}));

vi.mock('../../../lib/firebase-admin', () => ({
	auth: {
		getUser: vi.fn(),
	},
}));

describe('SurveyWalk Handler Unit Tests', () => {
	let mockSurveyWalkService: Mocked<SurveyWalkService>;
	let mockSurveyPeriodRepository: Mocked<SurveyPeriodRepository>;

	const walk: SurveyWalkEntity = {
		uid: 'walk-1',
		surveyPeriodUid: 'period-1',
		name: 'Morning Walk',
		date: new Date('2026-04-01T00:00:00.000Z'),
		startTime: '08:00',
		endTime: '10:00',
		capacity: 4,
		isFinished: false,
		volunteerUids: [],
		attendeeUids: [],
		completedAt: null,
		leader: '',
	};

	beforeEach(() => {
		vi.clearAllMocks();

		mockSurveyWalkService = {
			getAllSurveyWalks: vi.fn(),
			getSurveyWalksBySurveyPeriodUid: vi.fn(),
			getSurveyWalksForJoinedPeriods: vi.fn(),
			getSurveyWalk: vi.fn(),
			createSurveyWalk: vi.fn(),
			updateSurveyWalk: vi.fn(),
			deleteSurveyWalk: vi.fn(),
			joinSurveyWalk: vi.fn(),
			quitSurveyWalk: vi.fn(),
			reassignLeader: vi.fn(),
			completeSurveyWalk: vi.fn(),
		} as unknown as Mocked<SurveyWalkService>;

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

		vi.mocked(getContainer).mockReturnValue({
			surveyWalkService: mockSurveyWalkService,
			surveyPeriodRepository: mockSurveyPeriodRepository,
		} as unknown as ReturnType<typeof getContainer>);

		vi.mocked(auth.getUser).mockResolvedValue({
			displayName: 'Volunteer Name',
			email: 'volunteer@example.com',
		} as never);
	});

	describe('listSurveyWalksHandler', () => {
		it('should return mapped DTO list', async () => {
			mockSurveyWalkService.getAllSurveyWalks.mockResolvedValue([walk]);
			mockSurveyPeriodRepository.findById.mockResolvedValue({ name: 'Spring 2026' } as never);

			const result = await listSurveyWalksHandler(
				{} as Parameters<typeof listSurveyWalksHandler>[0],
				{} as Parameters<typeof listSurveyWalksHandler>[1],
			);

			expect(mockSurveyWalkService.getAllSurveyWalks).toHaveBeenCalledOnce();
			expect(result.surveyWalks).toHaveLength(1);
			expect(result.surveyWalks[0]).toEqual(expect.objectContaining({
				uid: walk.uid,
				surveyPeriodUid: walk.surveyPeriodUid,
				surveyPeriodName: 'Spring 2026',
				date: '2026-04-01T00:00:00.000Z',
				volunteers: [],
				leader: { uid: '', name: '' },
			}));
		});
	});

	describe('getSurveyWalkHandler', () => {
		it('should return mapped DTO for one walk', async () => {
			mockSurveyWalkService.getSurveyWalk.mockResolvedValue({
				...walk,
				volunteerUids: ['volunteer-1'],
				leader: 'volunteer-1',
			});
			mockSurveyPeriodRepository.findById.mockResolvedValue({ name: 'Spring 2026' } as never);

			const request = { params: { uid: walk.uid } } as Parameters<typeof getSurveyWalkHandler>[0];
			const result = await getSurveyWalkHandler(request, {} as Parameters<typeof getSurveyWalkHandler>[1]);

			expect(mockSurveyWalkService.getSurveyWalk).toHaveBeenCalledWith(walk.uid);
			expect(result.surveyPeriodName).toBe('Spring 2026');
			expect(result.volunteers).toEqual([{ uid: 'volunteer-1', name: 'Volunteer Name' }]);
			expect(result.leader).toEqual({ uid: 'volunteer-1', name: 'Volunteer Name' });
		});
	});

	describe('listSurveyWalksBySurveyPeriodHandler', () => {
		it('should return walks by period uid with enriched data', async () => {
			mockSurveyWalkService.getSurveyWalksBySurveyPeriodUid.mockResolvedValue([walk]);
			mockSurveyPeriodRepository.findById.mockResolvedValue({ name: 'Spring 2026' } as never);

			const request = {
				params: { surveyPeriodUid: 'period-1' },
			} as Parameters<typeof listSurveyWalksBySurveyPeriodHandler>[0];

			const result = await listSurveyWalksBySurveyPeriodHandler(
				request,
				{} as Parameters<typeof listSurveyWalksBySurveyPeriodHandler>[1],
			);

			expect(mockSurveyWalkService.getSurveyWalksBySurveyPeriodUid).toHaveBeenCalledWith('period-1');
			expect(result.surveyWalks[0].surveyPeriodName).toBe('Spring 2026');
		});
	});

	describe('listSurveyWalksForCurrentUserHandler', () => {
		it('should throw when request has no user', async () => {
			const request = {} as Parameters<typeof listSurveyWalksForCurrentUserHandler>[0];

			await expect(
				listSurveyWalksForCurrentUserHandler(
					request,
					{} as Parameters<typeof listSurveyWalksForCurrentUserHandler>[1],
				)
			).rejects.toThrow('User not found in request');
		});

		it('should return enriched survey walks for current user', async () => {
			mockSurveyWalkService.getSurveyWalksForJoinedPeriods.mockResolvedValue([
				{ ...walk, volunteerUids: ['user-1'], leader: 'user-1' },
			]);
			mockSurveyPeriodRepository.findById.mockResolvedValue({ name: 'Spring 2026' } as never);

			const request = {
				user: { uid: 'user-1' },
			} as unknown as Parameters<typeof listSurveyWalksForCurrentUserHandler>[0];

			const result = await listSurveyWalksForCurrentUserHandler(
				request,
				{} as Parameters<typeof listSurveyWalksForCurrentUserHandler>[1],
			);

			expect(mockSurveyWalkService.getSurveyWalksForJoinedPeriods).toHaveBeenCalledOnce();
			expect(result.surveyWalks[0].leader).toEqual({ uid: 'user-1', name: 'Volunteer Name' });
		});
	});

	describe('createSurveyWalkHandler', () => {
		const mockReply = {
			code: vi.fn().mockReturnThis(),
			send: vi.fn().mockReturnThis(),
		} as unknown as Parameters<typeof createSurveyWalkHandler>[1];

		it('should throw BadRequestError for invalid date string', async () => {
			const request = {
				body: {
					surveyPeriodUid: 'period-1',
					name: 'Morning Walk',
					date: 'not-a-date',
					startTime: '08:00',
					endTime: '10:00',
					capacity: 4,
					isFinished: false,
				},
			} as Parameters<typeof createSurveyWalkHandler>[0];

			await expect(createSurveyWalkHandler(request, mockReply)).rejects.toThrow(BadRequestError);
			expect(mockSurveyWalkService.createSurveyWalk).not.toHaveBeenCalled();
		});

		it('should parse date, call service and return 201 response', async () => {
			mockSurveyWalkService.createSurveyWalk.mockResolvedValue(walk);
			mockSurveyPeriodRepository.findById.mockResolvedValue({ name: 'Spring 2026' } as never);

			const request = {
				body: {
					surveyPeriodUid: 'period-1',
					name: 'Morning Walk',
					date: '2026-04-01T00:00:00.000Z',
					startTime: '08:00',
					endTime: '10:00',
					capacity: 4,
				},
			} as Parameters<typeof createSurveyWalkHandler>[0];

			await createSurveyWalkHandler(request, mockReply);

			expect(mockSurveyWalkService.createSurveyWalk).toHaveBeenCalledWith(expect.objectContaining({
				surveyPeriodUid: 'period-1',
				date: expect.any(Date),
				isFinished: false,
				volunteerUids: [],
				attendeeUids: [],
				completedAt: null,
				leader: '',
			}));
			expect(mockReply.code).toHaveBeenCalledWith(201);
			expect(mockReply.send).toHaveBeenCalledWith(expect.objectContaining({ uid: walk.uid }));
		});
	});

	describe('updateSurveyWalkHandler', () => {
		it('should throw BadRequestError when date is invalid', async () => {
			const request = {
				params: { uid: walk.uid },
				body: { date: 'invalid-date' },
			} as Parameters<typeof updateSurveyWalkHandler>[0];

			await expect(
				updateSurveyWalkHandler(request, {} as Parameters<typeof updateSurveyWalkHandler>[1])
			).rejects.toThrow(BadRequestError);

			expect(mockSurveyWalkService.updateSurveyWalk).not.toHaveBeenCalled();
		});

		it('should call service with parsed date', async () => {
			mockSurveyWalkService.updateSurveyWalk.mockResolvedValue(walk);
			mockSurveyPeriodRepository.findById.mockResolvedValue({ name: 'Spring 2026' } as never);

			const request = {
				params: { uid: walk.uid },
				body: {
					date: '2026-04-01T00:00:00.000Z',
					name: 'Updated Walk',
				},
			} as Parameters<typeof updateSurveyWalkHandler>[0];

			const result = await updateSurveyWalkHandler(
				request,
				{} as Parameters<typeof updateSurveyWalkHandler>[1],
			);

			expect(mockSurveyWalkService.updateSurveyWalk).toHaveBeenCalledWith(
				walk.uid,
				expect.objectContaining({
					name: 'Updated Walk',
					date: expect.any(Date),
				}),
			);
			expect(result.uid).toBe(walk.uid);
		});
	});

	describe('deleteSurveyWalkHandler', () => {
		it('should pass through service result', async () => {
			mockSurveyWalkService.deleteSurveyWalk.mockResolvedValue({ success: true, uid: walk.uid });

			const result = await deleteSurveyWalkHandler(
				{ params: { uid: walk.uid } } as Parameters<typeof deleteSurveyWalkHandler>[0],
				{} as Parameters<typeof deleteSurveyWalkHandler>[1],
			);

			expect(mockSurveyWalkService.deleteSurveyWalk).toHaveBeenCalledWith(walk.uid);
			expect(result).toEqual({ success: true, uid: walk.uid });
		});

        it('should throw NotFoundError if walk to delete does not exist', async () => {
            mockSurveyWalkService.deleteSurveyWalk.mockRejectedValue(new Error('Not found'));

            await expect(
                deleteSurveyWalkHandler(
                    { params: { uid: walk.uid } } as Parameters<typeof deleteSurveyWalkHandler>[0],
                    {} as Parameters<typeof deleteSurveyWalkHandler>[1],
                )
            ).rejects.toThrow('Not found');
        });
	});

	describe('joinSurveyWalkHandler', () => {
		it('should throw when request has no user', async () => {
			const request = { params: { uid: walk.uid } } as Parameters<typeof joinSurveyWalkHandler>[0];

			await expect(joinSurveyWalkHandler(request, {} as Parameters<typeof joinSurveyWalkHandler>[1]))
				.rejects.toThrow('User not found in request');
		});

		it('should join and return success and become leader', async () => {
			mockSurveyWalkService.joinSurveyWalk.mockResolvedValue({ ...walk, volunteerUids: ['user-1'], leader: 'user-1' });
			mockSurveyPeriodRepository.findById.mockResolvedValue({ name: 'Spring 2026' } as never);

			const request = {
				params: { uid: walk.uid },
				user: { uid: 'user-1' },
			} as unknown as Parameters<typeof joinSurveyWalkHandler>[0];

			const result = await joinSurveyWalkHandler(request, {} as Parameters<typeof joinSurveyWalkHandler>[1]);

			expect(mockSurveyWalkService.joinSurveyWalk).toHaveBeenCalledWith(walk.uid, 'user-1');
			expect(result.success).toBe(true);
			expect(result.surveyWalk.uid).toBe(walk.uid);

            expect(result.surveyWalk.volunteerUids).toContain('user-1');
            expect(result.surveyWalk.leader).toStrictEqual({
                name: 'Volunteer Name',
                uid: 'user-1',
            });
		});

        it('should join and return success without changing leader', async () => {
            mockSurveyWalkService.joinSurveyWalk.mockResolvedValue({ ...walk, volunteerUids: ['user-1', 'user-2'], leader: 'user-1' });
            mockSurveyPeriodRepository.findById.mockResolvedValue({ name: 'Spring 2026' } as never);

            const request = {
                params: { uid: walk.uid },
                user: { uid: 'user-2' },
            } as unknown as Parameters<typeof joinSurveyWalkHandler>[0];

            const result = await joinSurveyWalkHandler(request, {} as Parameters<typeof joinSurveyWalkHandler>[1]);

            expect(mockSurveyWalkService.joinSurveyWalk).toHaveBeenCalledWith(walk.uid, 'user-2');
            expect(result.success).toBe(true);
            expect(result.surveyWalk.uid).toBe(walk.uid);

            expect(result.surveyWalk.volunteerUids).toContain('user-2');
            expect(result.surveyWalk.leader).toStrictEqual({
                name: 'Volunteer Name',
                uid: 'user-1',
            });
        });
	});

	describe('quitSurveyWalkHandler', () => {
        it('should throw when request has no user', async () => {
            const request = { params: { uid: walk.uid } } as Parameters<typeof quitSurveyWalkHandler>[0];

            await expect(quitSurveyWalkHandler(request, {} as Parameters<typeof quitSurveyWalkHandler>[1]))
                .rejects.toThrow('User not found in request');
        });

		it('should quit and return success and change leader', async () => {
			mockSurveyWalkService.quitSurveyWalk.mockResolvedValue({ ...walk, volunteerUids: [], leader: '' });
			mockSurveyPeriodRepository.findById.mockResolvedValue({ name: 'Spring 2026' } as never);

			const request = {
				params: { uid: walk.uid },
				user: { uid: 'user-1' },
			} as unknown as Parameters<typeof quitSurveyWalkHandler>[0];

			const result = await quitSurveyWalkHandler(request, {} as Parameters<typeof quitSurveyWalkHandler>[1]);

			expect(mockSurveyWalkService.quitSurveyWalk).toHaveBeenCalledWith(walk.uid, 'user-1');
			expect(result.success).toBe(true);
			expect(result.surveyWalk.uid).toBe(walk.uid);

            expect(result.surveyWalk.volunteerUids).not.toContain('user-1');
            expect(result.surveyWalk.leader).not.toStrictEqual({
                name: 'Volunteer Name',
                uid: 'user-1',
            });
		});
	});

	describe('reassignSurveyWalkLeaderHandler', () => {
		it('should throw when request has no user', async () => {
			const request = {
				params: { uid: walk.uid },
				body: { newLeaderUid: 'user-2' },
			} as Parameters<typeof reassignSurveyWalkLeaderHandler>[0];

			await expect(
				reassignSurveyWalkLeaderHandler(
					request,
					{} as Parameters<typeof reassignSurveyWalkLeaderHandler>[1],
				)
			).rejects.toThrow('User not found in request');
		});

		it('should reassign and return success with DTO', async () => {
			mockSurveyWalkService.reassignLeader.mockResolvedValue({
				...walk,
				volunteerUids: ['user-1', 'user-2'],
				leader: 'user-2',
			});
			mockSurveyPeriodRepository.findById.mockResolvedValue({ name: 'Spring 2026' } as never);

			const request = {
				params: { uid: walk.uid },
				user: { uid: 'user-1' },
				body: { newLeaderUid: 'user-2' },
			} as unknown as Parameters<typeof reassignSurveyWalkLeaderHandler>[0];

			const result = await reassignSurveyWalkLeaderHandler(
				request,
				{} as Parameters<typeof reassignSurveyWalkLeaderHandler>[1],
			);

			expect(mockSurveyWalkService.reassignLeader).toHaveBeenCalledWith(walk.uid, 'user-1', 'user-2');
			expect(result.success).toBe(true);
			expect(result.surveyWalk.leader).toStrictEqual({ uid: 'user-2', name: 'Volunteer Name' });
		});
	});

	describe('completeSurveyWalkHandler', () => {
		it('should throw when request has no user', async () => {
			const request = {
				params: { uid: walk.uid },
				body: { attendeeUids: [] },
			} as Parameters<typeof completeSurveyWalkHandler>[0];

			await expect(
				completeSurveyWalkHandler(request, {} as Parameters<typeof completeSurveyWalkHandler>[1])
			).rejects.toThrow('User not found in request');
		});

		it('should complete walk and return attendance data', async () => {
			mockSurveyWalkService.completeSurveyWalk.mockResolvedValue({
				...walk,
				volunteerUids: ['user-1', 'user-2'],
				attendeeUids: ['user-1'],
				isFinished: true,
				completedAt: new Date('2026-04-01T11:00:00.000Z'),
				leader: 'user-1',
			});
			mockSurveyPeriodRepository.findById.mockResolvedValue({ name: 'Spring 2026' } as never);

			const request = {
				params: { uid: walk.uid },
				user: { uid: 'user-1', role: 'user' },
				body: { attendeeUids: ['user-1'] },
			} as unknown as Parameters<typeof completeSurveyWalkHandler>[0];

			const result = await completeSurveyWalkHandler(
				request,
				{} as Parameters<typeof completeSurveyWalkHandler>[1],
			);

			expect(mockSurveyWalkService.completeSurveyWalk).toHaveBeenCalledWith(walk.uid, 'user-1', ['user-1'], false);
			expect(result.success).toBe(true);
			expect(result.surveyWalk.attendees).toEqual([{ uid: 'user-1', name: 'Volunteer Name' }]);
			expect(result.surveyWalk.noShows).toEqual([{ uid: 'user-2', name: 'Volunteer Name' }]);
			expect(result.surveyWalk.completedAt).toBe('2026-04-01T11:00:00.000Z');
		});
	});
});
