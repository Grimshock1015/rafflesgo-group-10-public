import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	acceptInvitationHandler,
	declineInvitationHandler,
	listInvitationsForWalkHandler,
	listMyInvitationsHandler,
	sendInvitationHandler,
} from '../../../handlers/invitation.handler';
import { getContainer } from '../../../container';
import { auth } from '../../../lib/firebase-admin';
import type { InvitationEntity } from '../../../entities/invitation.entity';

vi.mock('../../../container', () => ({
	getContainer: vi.fn(),
}));

vi.mock('../../../lib/firebase-admin', () => ({
	auth: {
		getUser: vi.fn(),
	},
}));

describe('Invitation Handler Unit Tests', () => {
	const createdAt = new Date('2026-04-16T10:30:00.000Z');

	const makeInvitation = (overrides: Partial<InvitationEntity> = {}): InvitationEntity => ({
		uid: 'inv-1',
		surveyWalkUid: 'walk-1',
		inviterUid: 'inviter-1',
		inviteeEmail: 'invitee@example.com',
		type: 'walk_invitation',
		status: 'pending',
		createdAt,
		...overrides,
	});

	let mockInvitationService: {
		sendInvitation: ReturnType<typeof vi.fn>;
		getInvitationsForWalk: ReturnType<typeof vi.fn>;
		getMyInvitations: ReturnType<typeof vi.fn>;
		acceptInvitation: ReturnType<typeof vi.fn>;
		declineInvitation: ReturnType<typeof vi.fn>;
	};

	const mockSurveyWalkRepository = {
		findById: vi.fn(),
	};

	beforeEach(() => {
		vi.clearAllMocks();

		mockInvitationService = {
			sendInvitation: vi.fn(),
			getInvitationsForWalk: vi.fn(),
			getMyInvitations: vi.fn(),
			acceptInvitation: vi.fn(),
			declineInvitation: vi.fn(),
		};

		vi.mocked(getContainer).mockReturnValue({
			invitationService: mockInvitationService,
			surveyWalkRepository: mockSurveyWalkRepository,
		} as unknown as ReturnType<typeof getContainer>);
	});

	describe('sendInvitationHandler', () => {
		it('should throw when request has no user', async () => {
			const request = {
				params: { uid: 'walk-1' },
				body: { inviteeEmail: 'invitee@example.com' },
			} as Parameters<typeof sendInvitationHandler>[0];

			const reply = {} as Parameters<typeof sendInvitationHandler>[1];

			await expect(sendInvitationHandler(request, reply)).rejects.toThrow('User not found in request');
			expect(mockInvitationService.sendInvitation).not.toHaveBeenCalled();
		});

		it('should call service and send 201 with mapped invitation dto', async () => {
			const invitation = makeInvitation();
			mockInvitationService.sendInvitation.mockResolvedValue(invitation);

			const request = {
				params: { uid: 'walk-1' },
				body: { inviteeEmail: 'invitee@example.com' },
				user: { uid: 'inviter-1' },
			} as unknown as Parameters<typeof sendInvitationHandler>[0];

			const send = vi.fn();
			const reply = {
				code: vi.fn().mockReturnValue({ send }),
			} as unknown as Parameters<typeof sendInvitationHandler>[1];

			await sendInvitationHandler(request, reply);

			expect(mockInvitationService.sendInvitation).toHaveBeenCalledWith('walk-1', 'inviter-1', 'invitee@example.com');
			expect(reply.code).toHaveBeenCalledWith(201);
			expect(send).toHaveBeenCalledWith({
				success: true,
				invitation: {
					uid: 'inv-1',
					surveyWalkUid: 'walk-1',
					surveyWalkName: '',
					inviterUid: 'inviter-1',
					inviterName: '',
					inviteeEmail: 'invitee@example.com',
					type: 'walk_invitation',
					proposedLeaderUid: undefined,
					status: 'pending',
					createdAt: '2026-04-16T10:30:00.000Z',
				},
			});
		});
	});

	describe('listInvitationsForWalkHandler', () => {
		it('should return dto list for survey walk invitations', async () => {
			mockInvitationService.getInvitationsForWalk.mockResolvedValue([
				makeInvitation(),
				makeInvitation({
					uid: 'inv-2',
					inviteeEmail: 'other@example.com',
					status: 'accepted',
				}),
			]);

			const request = {
				params: { uid: 'walk-1' },
			} as Parameters<typeof listInvitationsForWalkHandler>[0];

			const result = await listInvitationsForWalkHandler(
				request,
				{} as Parameters<typeof listInvitationsForWalkHandler>[1],
			);

			expect(mockInvitationService.getInvitationsForWalk).toHaveBeenCalledWith('walk-1');
			expect(result.invitations).toHaveLength(2);
			expect(result.invitations[0].createdAt).toBe('2026-04-16T10:30:00.000Z');
			expect(result.invitations[0].surveyWalkName).toBe('');
			expect(result.invitations[0].inviterName).toBe('');
		});
	});

	describe('listMyInvitationsHandler', () => {
		it('should throw when request has no user', async () => {
			const request = {} as Parameters<typeof listMyInvitationsHandler>[0];

			await expect(
				listMyInvitationsHandler(request, {} as Parameters<typeof listMyInvitationsHandler>[1]),
			).rejects.toThrow('User not found in request');
		});

		it('should throw when request user has no email', async () => {
			const request = {
				user: { uid: 'user-1' },
			} as unknown as Parameters<typeof listMyInvitationsHandler>[0];

			await expect(
				listMyInvitationsHandler(request, {} as Parameters<typeof listMyInvitationsHandler>[1]),
			).rejects.toThrow('User email not found in request');
		});

		it('should enrich invitations with walk and inviter names', async () => {
			mockInvitationService.getMyInvitations.mockResolvedValue([makeInvitation()]);
			mockSurveyWalkRepository.findById.mockResolvedValue({ name: 'Sunrise Walk' });
			vi.mocked(auth.getUser).mockResolvedValue({
				displayName: 'Alex Volunteer',
				email: 'alex@example.com',
			} as never);

			const request = {
				user: { uid: 'user-1', email: 'invitee@example.com' },
			} as unknown as Parameters<typeof listMyInvitationsHandler>[0];

			const result = await listMyInvitationsHandler(
				request,
				{} as Parameters<typeof listMyInvitationsHandler>[1],
			);

			expect(mockInvitationService.getMyInvitations).toHaveBeenCalledWith('invitee@example.com');
			expect(mockSurveyWalkRepository.findById).toHaveBeenCalledWith('walk-1');
			expect(auth.getUser).toHaveBeenCalledWith('inviter-1');
			expect(result.invitations[0]).toEqual(expect.objectContaining({
				surveyWalkName: 'Sunrise Walk',
				inviterName: 'Alex Volunteer',
			}));
		});

		it('should use fallback names when enrichment fails', async () => {
			mockInvitationService.getMyInvitations.mockResolvedValue([makeInvitation()]);
			mockSurveyWalkRepository.findById.mockResolvedValue({ name: 'Sunrise Walk' });
			vi.mocked(auth.getUser).mockRejectedValue(new Error('Firebase unavailable'));

			const request = {
				user: { uid: 'user-1', email: 'invitee@example.com' },
			} as unknown as Parameters<typeof listMyInvitationsHandler>[0];

			const result = await listMyInvitationsHandler(
				request,
				{} as Parameters<typeof listMyInvitationsHandler>[1],
			);

			expect(result.invitations[0]).toEqual(expect.objectContaining({
				surveyWalkName: 'Unknown walk',
				inviterName: 'A volunteer',
			}));
		});

		it('should fallback inviter name to inviter email when displayName is missing', async () => {
			mockInvitationService.getMyInvitations.mockResolvedValue([makeInvitation()]);
			mockSurveyWalkRepository.findById.mockResolvedValue({ name: 'Sunrise Walk' });
			vi.mocked(auth.getUser).mockResolvedValue({
				displayName: '',
				email: 'inviter@example.com',
			} as never);

			const request = {
				user: { uid: 'user-1', email: 'invitee@example.com' },
			} as unknown as Parameters<typeof listMyInvitationsHandler>[0];

			const result = await listMyInvitationsHandler(
				request,
				{} as Parameters<typeof listMyInvitationsHandler>[1],
			);

			expect(result.invitations[0]).toEqual(expect.objectContaining({
				surveyWalkName: 'Sunrise Walk',
				inviterName: 'inviter@example.com',
			}));
		});

		it('should fallback walk name when walk lookup returns null', async () => {
			mockInvitationService.getMyInvitations.mockResolvedValue([makeInvitation()]);
			mockSurveyWalkRepository.findById.mockResolvedValue(null);
			vi.mocked(auth.getUser).mockResolvedValue({
				displayName: 'Alex Volunteer',
				email: 'alex@example.com',
			} as never);

			const request = {
				user: { uid: 'user-1', email: 'invitee@example.com' },
			} as unknown as Parameters<typeof listMyInvitationsHandler>[0];

			const result = await listMyInvitationsHandler(
				request,
				{} as Parameters<typeof listMyInvitationsHandler>[1],
			);

			expect(result.invitations[0]).toEqual(expect.objectContaining({
				surveyWalkName: 'Unknown walk',
				inviterName: 'Alex Volunteer',
			}));
		});
	});

	describe('acceptInvitationHandler', () => {
		it('should throw when request has no user', async () => {
			const request = {
				params: { uid: 'inv-1' },
			} as Parameters<typeof acceptInvitationHandler>[0];

			await expect(
				acceptInvitationHandler(request, {} as Parameters<typeof acceptInvitationHandler>[1]),
			).rejects.toThrow('User not found in request');
		});

		it('should throw when request user has no email', async () => {
			const request = {
				params: { uid: 'inv-1' },
				user: { uid: 'user-1' },
			} as unknown as Parameters<typeof acceptInvitationHandler>[0];

			await expect(
				acceptInvitationHandler(request, {} as Parameters<typeof acceptInvitationHandler>[1]),
			).rejects.toThrow('User email not found in request');
		});

		it('should call service with uid, user uid, and user email', async () => {
			const accepted = makeInvitation({ status: 'accepted' });
			mockInvitationService.acceptInvitation.mockResolvedValue(accepted);

			const request = {
				params: { uid: 'inv-1' },
				user: { uid: 'user-1', email: 'invitee@example.com' },
			} as unknown as Parameters<typeof acceptInvitationHandler>[0];

			const result = await acceptInvitationHandler(
				request,
				{} as Parameters<typeof acceptInvitationHandler>[1],
			);

			expect(mockInvitationService.acceptInvitation).toHaveBeenCalledWith('inv-1', 'user-1', 'invitee@example.com');
			expect(result).toEqual(expect.objectContaining({
				success: true,
				invitation: expect.objectContaining({
					status: 'accepted',
					createdAt: '2026-04-16T10:30:00.000Z',
				}),
			}));
		});
	});

	describe('declineInvitationHandler', () => {
		it('should throw when request has no user', async () => {
			const request = {
				params: { uid: 'inv-1' },
			} as Parameters<typeof declineInvitationHandler>[0];

			await expect(
				declineInvitationHandler(request, {} as Parameters<typeof declineInvitationHandler>[1]),
			).rejects.toThrow('User not found in request');
		});

		it('should throw when request user has no email', async () => {
			const request = {
				params: { uid: 'inv-1' },
				user: { uid: 'user-1' },
			} as unknown as Parameters<typeof declineInvitationHandler>[0];

			await expect(
				declineInvitationHandler(request, {} as Parameters<typeof declineInvitationHandler>[1]),
			).rejects.toThrow('User email not found in request');
		});

		it('should call service with invitation uid and user email', async () => {
			const declined = makeInvitation({ status: 'declined' });
			mockInvitationService.declineInvitation.mockResolvedValue(declined);

			const request = {
				params: { uid: 'inv-1' },
				user: { uid: 'user-1', email: 'invitee@example.com' },
			} as unknown as Parameters<typeof declineInvitationHandler>[0];

			const result = await declineInvitationHandler(
				request,
				{} as Parameters<typeof declineInvitationHandler>[1],
			);

			expect(mockInvitationService.declineInvitation).toHaveBeenCalledWith('inv-1', 'invitee@example.com');
			expect(result).toEqual(expect.objectContaining({
				success: true,
				invitation: expect.objectContaining({ status: 'declined' }),
			}));
		});
	});
});
