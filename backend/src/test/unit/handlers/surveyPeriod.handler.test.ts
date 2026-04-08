import { describe, it, expect, vi, beforeEach, Mocked } from 'vitest';
import { 
    listSurveyPeriodsHandler, 
    getSurveyPeriodHandler,
    createSurveyPeriodHandler,
    updateSurveyPeriodHandler,
    deleteSurveyPeriodHandler,
    activateSurveyPeriodHandler
} from '../../../handlers/surveyPeriod.handler';
import { getContainer } from '../../../container';
import { SurveyPeriodService } from '../../../services/surveyPeriod.service';
import { SurveyPeriodEntity } from '../../../entities/surveyPeriod.entity';
import { BadRequestError } from '../../../lib/errors';

// Mock the getContainer function to inject our fake service
vi.mock('../../../container', () => ({
    getContainer: vi.fn(),
}));

describe('SurveyPeriod Handler Unit Tests', () => {
    let mockSurveyPeriodService: Mocked<SurveyPeriodService>;

    beforeEach(() => {
        // Setup: Reset all mocks before each test
        vi.clearAllMocks();
        
        // Setup: Initialize the mock service using the exact same "as unknown as Mocked" form
        mockSurveyPeriodService = {
            getAllSurveyPeriods: vi.fn(),
            getSurveyPeriod: vi.fn(),
            createSurveyPeriod: vi.fn(),
            updateSurveyPeriod: vi.fn(),
            deleteSurveyPeriod: vi.fn(),
            setActiveSurveyPeriod: vi.fn(),
        } as unknown as Mocked<SurveyPeriodService>;

        vi.mocked(getContainer).mockReturnValue({
            surveyPeriodService: mockSurveyPeriodService,
        } as unknown as ReturnType<typeof getContainer>);
    });

    // ==========================================
    // Test Block 1: listSurveyPeriodsHandler
    // ==========================================
    describe('listSurveyPeriodsHandler', () => {
        // Arrange: Mock Fastify request and reply objects using Parameters utility to avoid 'any'
        const mockRequest = {} as unknown as Parameters<typeof listSurveyPeriodsHandler>[0];
        const mockReply = {} as unknown as Parameters<typeof listSurveyPeriodsHandler>[1];

        it('[TC-SP-HDL-01] should return a list of mapped survey period DTOs when entities exist', async () => {
            // Arrange
            const mockDate1 = new Date('2026-01-01T00:00:00.000Z');
            const mockDate2 = new Date('2026-02-01T00:00:00.000Z');
            const mockEntities: SurveyPeriodEntity[] = [
                {
                    uid: 'test-uid-1',
                    name: 'Test Survey 1',
                    startDate: mockDate1,
                    endDate: mockDate2,
                    isFinished: false,
                    isActive: false,
                    minWalks: 1
                }
            ];
            mockSurveyPeriodService.getAllSurveyPeriods.mockResolvedValue(mockEntities);

            // Act
            const result = await listSurveyPeriodsHandler(mockRequest, mockReply);

            // Assert
            expect(mockSurveyPeriodService.getAllSurveyPeriods).toHaveBeenCalledOnce();
            expect(result).toEqual({
                surveyPeriods: [
                    {
                        uid: 'test-uid-1',
                        name: 'Test Survey 1',
                        startDate: '2026-01-01T00:00:00.000Z', // DTO should be ISO string
                        endDate: '2026-02-01T00:00:00.000Z',
                        isFinished: false,
                        isActive: false,
                        minWalks: 1
                    }
                ]
            });
        });

        it('[TC-SP-HDL-02] should return an empty array when no survey periods exist', async () => {
            // Arrange
            mockSurveyPeriodService.getAllSurveyPeriods.mockResolvedValue([]);

            // Act
            const result = await listSurveyPeriodsHandler(mockRequest, mockReply);

            // Assert
            expect(mockSurveyPeriodService.getAllSurveyPeriods).toHaveBeenCalledOnce();
            expect(result).toEqual({ surveyPeriods: [] });
        });
    });

    // ==========================================
    // Test Block 2: getSurveyPeriodHandler
    // ==========================================
    describe('getSurveyPeriodHandler', () => {
        const mockUid = 'target-uid-123';
        // Arrange: Mock request and reply using Parameters utility 
        const mockRequest = {
            params: { uid: mockUid }
        } as unknown as Parameters<typeof getSurveyPeriodHandler>[0];
        const mockReply = {} as unknown as Parameters<typeof getSurveyPeriodHandler>[1];

        const mockDate1 = new Date('2026-03-01T00:00:00.000Z');
        const mockDate2 = new Date('2026-05-01T00:00:00.000Z');
        
        const mockEntity: SurveyPeriodEntity = {
            uid: mockUid,
            name: 'Spring Survey',
            startDate: mockDate1,
            endDate: mockDate2,
            isFinished: true,
            isActive: false,
            minWalks: 5
        };

        it('[TC-SP-HDL-03] should extract uid from params, call service, and return the mapped DTO', async () => {
            // Arrange
            mockSurveyPeriodService.getSurveyPeriod.mockResolvedValue(mockEntity);

            // Act
            const result = await getSurveyPeriodHandler(mockRequest, mockReply);

            // Assert
            expect(mockSurveyPeriodService.getSurveyPeriod).toHaveBeenCalledWith(mockUid);
            expect(mockSurveyPeriodService.getSurveyPeriod).toHaveBeenCalledOnce();
            expect(result).toEqual({
                uid: mockUid,
                name: 'Spring Survey',
                startDate: '2026-03-01T00:00:00.000Z', // DTO should be ISO string
                endDate: '2026-05-01T00:00:00.000Z',
                isFinished: true,
                isActive: false,
                minWalks: 5
            });
        });

        it('[TC-SP-HDL-04] should propagate the error if the underlying service throws an error', async () => {
            // Arrange
            const mockError = new Error('Survey period not found');
            mockSurveyPeriodService.getSurveyPeriod.mockRejectedValue(mockError);

            // Act & Assert
            await expect(getSurveyPeriodHandler(mockRequest, mockReply)).rejects.toThrow(mockError);
            
            // Assert
            expect(mockSurveyPeriodService.getSurveyPeriod).toHaveBeenCalledWith(mockUid);
            expect(mockSurveyPeriodService.getSurveyPeriod).toHaveBeenCalledOnce();
        });
    });

    // ==========================================
    // Test Block 3: createSurveyPeriodHandler
    // ==========================================
    describe('createSurveyPeriodHandler', () => {
        // Arrange: Mock reply with chainable methods using Parameters utility 
        const mockReply = {
            code: vi.fn().mockReturnThis(),
            send: vi.fn().mockReturnThis(),
        } as unknown as Parameters<typeof createSurveyPeriodHandler>[1];

        const validBody = {
            name: 'New Survey',
            startDate: '2026-01-01T00:00:00.000Z',
            endDate: '2026-02-01T00:00:00.000Z',
            isFinished: false,
            isActive: false,
            minWalks: 3
        };

        it('[TC-SP-HDL-05] should throw BadRequestError if startDate is an invalid date string', async () => {
            // Arrange
            const invalidRequest = {
                body: { ...validBody, startDate: 'not-a-date' }
            } as unknown as Parameters<typeof createSurveyPeriodHandler>[0];

            // Act & Assert
            await expect(createSurveyPeriodHandler(invalidRequest, mockReply))
                .rejects.toThrow(BadRequestError);
            
            await expect(createSurveyPeriodHandler(invalidRequest, mockReply))
                .rejects.toThrow('startDate must be a valid date-time');
            
            // Assert: Ensure service was never called
            expect(mockSurveyPeriodService.createSurveyPeriod).not.toHaveBeenCalled();
        });

        it('[TC-SP-HDL-06] should throw BadRequestError if endDate is an invalid date string', async () => {
            // Arrange
            const invalidRequest = {
                body: { ...validBody, endDate: 'wrong-format' }
            } as unknown as Parameters<typeof createSurveyPeriodHandler>[0];

            // Act & Assert
            await expect(createSurveyPeriodHandler(invalidRequest, mockReply))
                .rejects.toThrow(BadRequestError);
            
            await expect(createSurveyPeriodHandler(invalidRequest, mockReply))
                .rejects.toThrow('endDate must be a valid date-time');
        });

        it('[TC-SP-HDL-07] should parse dates, call service, and return 201 with DTO', async () => {
            // Arrange
            const mockRequest = { body: validBody } as unknown as Parameters<typeof createSurveyPeriodHandler>[0];
            const createdEntity: SurveyPeriodEntity = {
                uid: 'new-uid-999',
                name: validBody.name,
                startDate: new Date(validBody.startDate),
                endDate: new Date(validBody.endDate),
                isFinished: validBody.isFinished,
                isActive: false,
                minWalks: validBody.minWalks
            };
            mockSurveyPeriodService.createSurveyPeriod.mockResolvedValue(createdEntity);

            // Act
            await createSurveyPeriodHandler(mockRequest, mockReply);

            // Assert
            expect(mockSurveyPeriodService.createSurveyPeriod).toHaveBeenCalledWith({
                name: validBody.name,
                startDate: expect.any(Date),
                endDate: expect.any(Date),
                isFinished: validBody.isFinished,
                isActive: false,
                minWalks: validBody.minWalks
            });
            expect(mockReply.code).toHaveBeenCalledWith(201);
            expect(mockReply.send).toHaveBeenCalledWith({
                uid: 'new-uid-999',
                name: validBody.name,
                startDate: validBody.startDate,
                endDate: validBody.endDate,
                isFinished: validBody.isFinished,
                isActive: false,
                minWalks: validBody.minWalks
            });
        });
    });

    // ==========================================
    // Test Block 4: updateSurveyPeriodHandler
    // ==========================================
    describe('updateSurveyPeriodHandler', () => {
        const mockUid = 'update-uid-789';
        // Arrange: Mock reply using Parameters utility to eliminate 'any'
        const mockReply = {} as unknown as Parameters<typeof updateSurveyPeriodHandler>[1];

        it('[TC-SP-HDL-08] should throw BadRequestError if startDate is provided but invalid', async () => {
            // Arrange
            const request = {
                params: { uid: mockUid },
                body: { startDate: 'invalid-date-string' }
            } as unknown as Parameters<typeof updateSurveyPeriodHandler>[0];

            // Act & Assert
            await expect(updateSurveyPeriodHandler(request, mockReply))
                .rejects.toThrow(BadRequestError);
            await expect(updateSurveyPeriodHandler(request, mockReply))
                .rejects.toThrow('startDate must be a valid date-time');
        });

        it('[TC-SP-HDL-09] should throw BadRequestError if endDate is provided but invalid', async () => {
            // Arrange
            const request = {
                params: { uid: mockUid },
                body: { endDate: 'invalid-date-string' }
            } as unknown as Parameters<typeof updateSurveyPeriodHandler>[0];

            // Act & Assert
            await expect(updateSurveyPeriodHandler(request, mockReply))
                .rejects.toThrow(BadRequestError);
            await expect(updateSurveyPeriodHandler(request, mockReply))
                .rejects.toThrow('endDate must be a valid date-time');
        });

        it('[TC-SP-HDL-10] should pass undefined to service when dates are not provided (Partial Update)', async () => {
            // Arrange
            const request = {
                params: { uid: mockUid },
                body: { name: 'Updated Name Only' }
            } as unknown as Parameters<typeof updateSurveyPeriodHandler>[0];

            const mockEntity: SurveyPeriodEntity = {
                uid: mockUid,
                name: 'Updated Name Only',
                startDate: new Date('2026-01-01'),
                endDate: new Date('2026-02-01'),
                isFinished: false,
                isActive: false,
                minWalks: 1
            };
            mockSurveyPeriodService.updateSurveyPeriod.mockResolvedValue(mockEntity);

            // Act
            await updateSurveyPeriodHandler(request, mockReply);

            // Assert: Verify that dates are passed as undefined
            expect(mockSurveyPeriodService.updateSurveyPeriod).toHaveBeenCalledWith(mockUid, {
                name: 'Updated Name Only',
                startDate: undefined,
                endDate: undefined,
                isFinished: undefined,
                isActive: undefined,
                minWalks: undefined
            });
        });

        it('[TC-SP-HDL-11] should parse date strings and call service when dates are provided (Full Update)', async () => {
            // Arrange
            const startDateStr = '2026-05-01T12:00:00.000Z';
            const endDateStr = '2026-06-01T12:00:00.000Z';
            const request = {
                params: { uid: mockUid },
                body: { 
                    name: 'Full Update',
                    startDate: startDateStr,
                    endDate: endDateStr,
                    isFinished: true,
                    isActive: false,
                    minWalks: 10
                }
            } as unknown as Parameters<typeof updateSurveyPeriodHandler>[0];

            const mockEntity: SurveyPeriodEntity = {
                uid: mockUid,
                name: 'Full Update',
                startDate: new Date(startDateStr),
                endDate: new Date(endDateStr),
                isFinished: true,
                isActive: false,
                minWalks: 10
            };
            mockSurveyPeriodService.updateSurveyPeriod.mockResolvedValue(mockEntity);

            // Act
            const result = await updateSurveyPeriodHandler(request, mockReply);

            // Assert
            expect(mockSurveyPeriodService.updateSurveyPeriod).toHaveBeenCalledWith(mockUid, {
                name: 'Full Update',
                startDate: expect.any(Date),
                endDate: expect.any(Date),
                isFinished: true,
                minWalks: 10
            });
            // Assert: Verify the result DTO format
            expect(result.startDate).toBe(startDateStr);
            expect(result.endDate).toBe(endDateStr);
        });
    });

    // ==========================================
    // Test Block 5: activateSurveyPeriodHandler
    // ==========================================
    describe('activateSurveyPeriodHandler', () => {
        const mockUid = 'activate-uid-000';
        const mockRequest = {
            params: { uid: mockUid }
        } as unknown as Parameters<typeof activateSurveyPeriodHandler>[0];
        const mockReply = {} as unknown as Parameters<typeof activateSurveyPeriodHandler>[1];

        it('[TC-SP-HDL-12] should activate a survey period and return the mapped DTO', async () => {
            const mockEntity: SurveyPeriodEntity = {
                uid: mockUid,
                name: 'Activated Survey',
                startDate: new Date('2026-01-01T00:00:00.000Z'),
                endDate: new Date('2026-02-01T00:00:00.000Z'),
                isFinished: false,
                isActive: true,
                minWalks: 2,
            };

            mockSurveyPeriodService.setActiveSurveyPeriod.mockResolvedValue(mockEntity);

            const result = await activateSurveyPeriodHandler(mockRequest, mockReply);

            expect(mockSurveyPeriodService.setActiveSurveyPeriod).toHaveBeenCalledWith(mockUid);
            expect(result).toEqual({
                uid: mockUid,
                name: 'Activated Survey',
                startDate: '2026-01-01T00:00:00.000Z',
                endDate: '2026-02-01T00:00:00.000Z',
                isFinished: false,
                isActive: true,
                minWalks: 2,
            });
        });
    });

    // ==========================================
    // Test Block 6: deleteSurveyPeriodHandler
    // ==========================================
    describe('deleteSurveyPeriodHandler', () => {
        const mockUid = 'delete-uid-000';
        
        // Arrange: Mock request and reply using Parameters utility to eliminate 'any'
        const mockRequest = {
            params: { uid: mockUid }
        } as unknown as Parameters<typeof deleteSurveyPeriodHandler>[0];
        const mockReply = {} as unknown as Parameters<typeof deleteSurveyPeriodHandler>[1];

        it('[TC-SP-HDL-12] should call service with uid from params and return the service result', async () => {
            // Arrange: Use 'as const' to ensure 'success' is treated as literal type 'true' instead of 'boolean'
            const serviceResult = { success: true as const, uid: mockUid };
            mockSurveyPeriodService.deleteSurveyPeriod.mockResolvedValue(serviceResult);

            // Act: Call the handler
            const result = await deleteSurveyPeriodHandler(mockRequest, mockReply);

            // Assert: Verify service interaction and return value
            expect(mockSurveyPeriodService.deleteSurveyPeriod).toHaveBeenCalledWith(mockUid);
            expect(mockSurveyPeriodService.deleteSurveyPeriod).toHaveBeenCalledOnce();
            expect(result).toEqual(serviceResult);
        });

        it('[TC-SP-HDL-13] should propagate errors thrown by the service', async () => {
            // Arrange: Mock the service to throw an error
            const mockError = new Error('Service delete failed');
            mockSurveyPeriodService.deleteSurveyPeriod.mockRejectedValue(mockError);

            // Act & Assert: Verify the handler throws the same error
            await expect(deleteSurveyPeriodHandler(mockRequest, mockReply))
                .rejects.toThrow(mockError);
        });
    });
});