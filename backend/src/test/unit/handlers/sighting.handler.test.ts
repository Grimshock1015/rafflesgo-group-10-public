import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FastifyRequest, FastifyReply } from 'fastify';
import {
    createSightingHandler,
    deleteSightingHandler,
    getAllSightingsHandler,
    getMySightingsHandler,
} from '../../../handlers/sighting.handler';
import * as SightingService from '../../../services/sighting.service';
import { getContainer } from '../../../container';

vi.mock('../../../services/sighting.service', () => ({
    createSighting: vi.fn(),
    deleteSighting: vi.fn(),
    getAllSightings: vi.fn(),
    getMySightingsDashboard: vi.fn(),
}));

vi.mock('../../../container', () => ({
    getContainer: vi.fn(),
}));

describe('Sighting Handler', () => {
    let mockRequest: FastifyRequest & { user?: { uid?: string; email?: string } };
    let mockReply: FastifyReply;
    let mockSend: ReturnType<typeof vi.fn>;
    let mockCode: ReturnType<typeof vi.fn>;
    const mockGetSurveyWalk = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();

        mockSend = vi.fn();
        mockCode = vi.fn().mockReturnValue({ send: mockSend });

        mockReply = {
            code: mockCode,
        } as unknown as FastifyReply;

        mockRequest = {
            body: {
                surveyWalkUid: 'walk-123',
                result: 'sighted',
                date: '2026-03-24',
                time: '12:00',
                location: 'Forest',
            },
            user: { uid: 'leader-uid', email: 'test@example.com' },
            log: {
                error: vi.fn(),
            } as unknown as FastifyRequest['log'],
        } as unknown as FastifyRequest & { user?: { uid?: string; email?: string } };

        vi.mocked(getContainer).mockReturnValue({
            surveyWalkService: {
                getSurveyWalk: mockGetSurveyWalk,
            },
        } as unknown as ReturnType<typeof getContainer>);
        mockGetSurveyWalk.mockResolvedValue({ uid: 'walk-123', leader: 'leader-uid' });
    });

    describe('createSightingHandler', () => {
        it('should create sighting successfully and return HTTP 201', async () => {
            const mockCreatedSighting = { id: 'mock-uuid', result: 'sighted' };
            vi.mocked(SightingService.createSighting).mockResolvedValue(mockCreatedSighting as unknown as Awaited<ReturnType<typeof SightingService.createSighting>>);

            await createSightingHandler(mockRequest, mockReply);

            // Ensure appropriate attributes are picked from body and user contexts
            expect(SightingService.createSighting).toHaveBeenCalledWith(expect.objectContaining({
                surveyWalkUid: 'walk-123',
                result: 'sighted',
                date: '2026-03-24',
                time: '12:00',
                location: 'Forest',
                submittedBy: 'leader-uid',
            }));

            expect(mockCode).toHaveBeenCalledWith(201);
            expect(mockSend).toHaveBeenCalledWith({
                message: 'Sighting submitted successfully',
                sighting: mockCreatedSighting,
            });
        });

        it('should return 401 when user uid is missing', async () => {
            mockRequest.user = undefined; // E.g., not authenticated payload

            await createSightingHandler(mockRequest, mockReply);

            expect(SightingService.createSighting).not.toHaveBeenCalled();
            expect(mockCode).toHaveBeenCalledWith(401);
            expect(mockSend).toHaveBeenCalledWith({
                message: 'User is not authenticated',
            });
        });

        it('should return 403 when requester is not the survey walk leader', async () => {
            mockRequest.user = { uid: 'not-leader', email: 'test@example.com' };
            mockGetSurveyWalk.mockResolvedValue({ uid: 'walk-123', leader: 'leader-uid' });

            await createSightingHandler(mockRequest, mockReply);

            expect(SightingService.createSighting).not.toHaveBeenCalled();
            expect(mockCode).toHaveBeenCalledWith(403);
            expect(mockSend).toHaveBeenCalledWith({
                message: 'Only the survey walk leader can submit sightings for this walk',
            });
        });

        it('should return HTTP 500 when service throws a runtime exception/Database error', async () => {
            const dbError = new Error('Firestore connection unavailable!');
            vi.mocked(SightingService.createSighting).mockRejectedValue(dbError);

            await createSightingHandler(mockRequest, mockReply);

            // Verify failure cases explicitly trace an error and give generic rejection
            expect(mockRequest.log?.error).toHaveBeenCalledWith(dbError);
            expect(mockCode).toHaveBeenCalledWith(500);
            expect(mockSend).toHaveBeenCalledWith({
                message: 'Failed to submit sighting',
            });
        });
    });

    describe('getMySightingsHandler', () => {
        it('should return the current user dashboard when uid is available', async () => {
            const dashboard = {
                stats: {
                    totalSubmissions: 1,
                    sightedCount: 1,
                    notSightedCount: 0,
                    uniqueLocations: 1,
                    totalAdults: 2,
                    totalJuveniles: 0,
                    latestSubmissionAt: '2026-03-24T12:00:00.000Z',
                    speciesBreakdown: [{ species: 'Raffles Banded Langur', count: 1 }],
                },
                sightings: [],
            };

            vi.mocked(SightingService.getMySightingsDashboard).mockResolvedValue(
                dashboard as Awaited<ReturnType<typeof SightingService.getMySightingsDashboard>>
            );

            await getMySightingsHandler(mockRequest, mockReply);

            expect(SightingService.getMySightingsDashboard).toHaveBeenCalledWith('leader-uid', { limit: undefined });
            expect(mockCode).toHaveBeenCalledWith(200);
            expect(mockSend).toHaveBeenCalledWith(dashboard);
        });

        it('should return 400 when the authenticated user has no uid', async () => {
            mockRequest.user = {};

            await getMySightingsHandler(mockRequest, mockReply);

            expect(SightingService.getMySightingsDashboard).not.toHaveBeenCalled();
            expect(mockCode).toHaveBeenCalledWith(400);
            expect(mockSend).toHaveBeenCalledWith({
                message: 'Authenticated user does not have a uid',
            });
        });

        it('should return 500 when fetching the dashboard fails', async () => {
            const serviceError = new Error('Firestore unavailable');
            vi.mocked(SightingService.getMySightingsDashboard).mockRejectedValue(serviceError);

            await getMySightingsHandler(mockRequest, mockReply);

            expect(mockRequest.log?.error).toHaveBeenCalledWith(serviceError);
            expect(mockCode).toHaveBeenCalledWith(500);
            expect(mockSend).toHaveBeenCalledWith({
                message: 'Failed to fetch your sightings',
            });
        });

        it('should clamp query limit to 500 when limit is too large', async () => {
            const dashboard = { stats: {}, sightings: [] };
            vi.mocked(SightingService.getMySightingsDashboard).mockResolvedValue(
                dashboard as unknown as Awaited<ReturnType<typeof SightingService.getMySightingsDashboard>>
            );

            mockRequest.query = { limit: 999 } as unknown as FastifyRequest['query'];
            await getMySightingsHandler(mockRequest, mockReply);

            expect(SightingService.getMySightingsDashboard).toHaveBeenCalledWith('leader-uid', { limit: 500 });
            expect(mockCode).toHaveBeenCalledWith(200);
        });
    });

    describe('getAllSightingsHandler', () => {
        it('should return all sightings with parsed limit', async () => {
            const allSightings = [{ id: 's-1' }, { id: 's-2' }];
            vi.mocked(SightingService.getAllSightings).mockResolvedValue(
                allSightings as Awaited<ReturnType<typeof SightingService.getAllSightings>>
            );

            mockRequest.query = { limit: 10 } as unknown as FastifyRequest['query'];
            await getAllSightingsHandler(mockRequest, mockReply);

            expect(SightingService.getAllSightings).toHaveBeenCalledWith({ limit: 10 });
            expect(mockCode).toHaveBeenCalledWith(200);
            expect(mockSend).toHaveBeenCalledWith({ sightings: allSightings });
        });

        it('should ignore non-integer limit values', async () => {
            vi.mocked(SightingService.getAllSightings).mockResolvedValue([]);

            mockRequest.query = { limit: 1.5 } as unknown as FastifyRequest['query'];
            await getAllSightingsHandler(mockRequest, mockReply);

            expect(SightingService.getAllSightings).toHaveBeenCalledWith({ limit: undefined });
        });

        it('should return 500 when listing sightings fails', async () => {
            const listError = new Error('query failed');
            vi.mocked(SightingService.getAllSightings).mockRejectedValue(listError);

            await getAllSightingsHandler(mockRequest, mockReply);

            expect(mockRequest.log?.error).toHaveBeenCalledWith(listError);
            expect(mockCode).toHaveBeenCalledWith(500);
            expect(mockSend).toHaveBeenCalledWith({
                message: 'Failed to fetch sightings',
            });
        });
    });

    describe('deleteSightingHandler', () => {
        it('should delete a sighting and return success payload', async () => {
            vi.mocked(SightingService.deleteSighting).mockResolvedValue(undefined);

            mockRequest.params = { id: 'sighting-1' } as unknown as FastifyRequest['params'];
            await deleteSightingHandler(mockRequest, mockReply);

            expect(SightingService.deleteSighting).toHaveBeenCalledWith('sighting-1');
            expect(mockCode).toHaveBeenCalledWith(200);
            expect(mockSend).toHaveBeenCalledWith({ success: true, id: 'sighting-1' });
        });

        it('should return 500 when deleting sighting fails', async () => {
            const deleteError = new Error('delete failed');
            vi.mocked(SightingService.deleteSighting).mockRejectedValue(deleteError);

            mockRequest.params = { id: 'sighting-2' } as unknown as FastifyRequest['params'];
            await deleteSightingHandler(mockRequest, mockReply);

            expect(mockRequest.log?.error).toHaveBeenCalledWith(deleteError);
            expect(mockCode).toHaveBeenCalledWith(500);
            expect(mockSend).toHaveBeenCalledWith({ message: 'Failed to delete sighting' });
        });
    });
});
