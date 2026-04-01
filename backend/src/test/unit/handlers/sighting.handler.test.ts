import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { createSightingHandler, getMySightingsHandler } from '../../../handlers/sighting.handler';
import * as SightingService from '../../../services/sighting.service';

vi.mock('../../../services/sighting.service', () => ({
    createSighting: vi.fn(),
    getMySightingsDashboard: vi.fn(),
}));

describe('Sighting Handler', () => {
    let mockRequest: FastifyRequest & { user?: { email?: string } };
    let mockReply: FastifyReply;
    let mockSend: ReturnType<typeof vi.fn>;
    let mockCode: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.clearAllMocks();

        mockSend = vi.fn();
        mockCode = vi.fn().mockReturnValue({ send: mockSend });

        mockReply = {
            code: mockCode,
        } as unknown as FastifyReply;

        mockRequest = {
            body: {
                result: 'sighted',
                date: '2026-03-24',
                time: '12:00',
                location: 'Forest',
            },
            user: { email: 'test@example.com' },
            log: {
                error: vi.fn(),
            } as unknown as FastifyRequest['log'],
        } as unknown as FastifyRequest & { user?: { email?: string } };
    });

    describe('createSightingHandler', () => {
        it('should create sighting successfully and return HTTP 201', async () => {
            const mockCreatedSighting = { id: 'mock-uuid', result: 'sighted' };
            vi.mocked(SightingService.createSighting).mockResolvedValue(mockCreatedSighting as unknown as Awaited<ReturnType<typeof SightingService.createSighting>>);

            await createSightingHandler(mockRequest, mockReply);

            // Ensure appropriate attributes are picked from body and user contexts
            expect(SightingService.createSighting).toHaveBeenCalledWith(expect.objectContaining({
                result: 'sighted',
                date: '2026-03-24',
                time: '12:00',
                location: 'Forest',
                submittedBy: 'test@example.com',
            }));

            expect(mockCode).toHaveBeenCalledWith(201);
            expect(mockSend).toHaveBeenCalledWith({
                message: 'Sighting submitted successfully',
                sighting: mockCreatedSighting,
            });
        });

        it('should fall back to "unknown" submittedBy if user is not authenticated or lacks an email', async () => {
            mockRequest.user = undefined; // E.g., not authenticated payload

            vi.mocked(SightingService.createSighting).mockResolvedValue({ id: 'uuid-123' } as unknown as Awaited<ReturnType<typeof SightingService.createSighting>>);

            await createSightingHandler(mockRequest, mockReply);

            // Should default to 'unknown' in the request logic
            expect(SightingService.createSighting).toHaveBeenCalledWith(expect.objectContaining({
                submittedBy: 'unknown',
            }));
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
        it('should return the current user dashboard when email is available', async () => {
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

            expect(SightingService.getMySightingsDashboard).toHaveBeenCalledWith('test@example.com');
            expect(mockCode).toHaveBeenCalledWith(200);
            expect(mockSend).toHaveBeenCalledWith(dashboard);
        });

        it('should return 400 when the authenticated user has no email', async () => {
            mockRequest.user = {};

            await getMySightingsHandler(mockRequest, mockReply);

            expect(SightingService.getMySightingsDashboard).not.toHaveBeenCalled();
            expect(mockCode).toHaveBeenCalledWith(400);
            expect(mockSend).toHaveBeenCalledWith({
                message: 'Authenticated user does not have an email address',
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
    });
});
