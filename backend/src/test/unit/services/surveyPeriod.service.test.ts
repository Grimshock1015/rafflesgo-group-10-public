import { describe, it, expect, vi, beforeEach, Mocked } from 'vitest';
import { SurveyPeriodService } from '../../../services/surveyPeriod.service';
import { SurveyPeriodRepository } from '../../../repositories/surveyPeriod.repository';
import { SurveyPeriodEntity } from '../../../entities/surveyPeriod.entity';
import { NotFoundError, BadRequestError } from '../../../lib/errors';

describe('SurveyPeriodService Unit Tests', () => {
    let service: SurveyPeriodService;
    let mockRepository: Mocked<SurveyPeriodRepository>;

    beforeEach(() => {
        // Setup: Mock all necessary repository methods as vitest functions
        mockRepository = {
            findAll: vi.fn(),
            findById: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
            setActive: vi.fn(),
            join: vi.fn(),
            unjoin: vi.fn(),
        } as unknown as Mocked<SurveyPeriodRepository>;

        // Setup: Inject the mocked repository into the service instance
        service = new SurveyPeriodService(mockRepository);
    });

    // ==========================================
    // Test Block 1: getAllSurveyPeriods
    // ==========================================
    describe('getAllSurveyPeriods', () => {
        it('[TC-SP-SRV-01] should return an array of all survey periods', async () => {
            // Arrange: Prepare mock database response
            const mockData: SurveyPeriodEntity[] = [
                { 
                    uid: '1', name: 'Spring Survey', 
                    startDate: new Date('2026-03-01'), endDate: new Date('2026-05-01'), 
                    isFinished: false, isActive: false, minWalks: 2
                },
                { 
                    uid: '2', name: 'Summer Survey', 
                    startDate: new Date('2026-06-01'), endDate: new Date('2026-08-01'), 
                    isFinished: false, isActive: false, minWalks: 3
                }
            ];
            mockRepository.findAll.mockResolvedValue(mockData);

            // Act: Call the target method
            const result = await service.getAllSurveyPeriods();

            // Assert: Verify the return value and database interaction
            expect(result).toEqual(mockData);
            expect(mockRepository.findAll).toHaveBeenCalledOnce();
        });

        it('[TC-SP-SRV-02] should return an empty array when no survey periods exist in the database', async () => {
            // Arrange: Mock the database to return an empty array
            mockRepository.findAll.mockResolvedValue([]);

            // Act: Call the target method
            const result = await service.getAllSurveyPeriods();

            // Assert: Verify the return value and database interaction
            expect(result).toEqual([]);
            expect(mockRepository.findAll).toHaveBeenCalledOnce();
        });
    });

    // ==========================================
    // Test Block 2: getSurveyPeriod
    // ==========================================
    describe('getSurveyPeriod', () => {
        it('[TC-SP-SRV-03] should successfully return the survey period when given an existing uid', async () => {
            // Arrange: Prepare a mock uid and corresponding mock data
            const mockUid = 'valid-uid-123';
            const mockData: SurveyPeriodEntity = { 
                uid: mockUid, 
                name: 'Autumn Survey', 
                startDate: new Date('2026-09-01'), 
                endDate: new Date('2026-11-01'), 
                isFinished: false, 
                isActive: false,
                minWalks: 1
            };
            mockRepository.findById.mockResolvedValue(mockData);

            // Act: Call the target method
            const result = await service.getSurveyPeriod(mockUid);

            // Assert: Verify the returned data and that the repository was called correctly
            expect(result).toEqual(mockData);
            expect(mockRepository.findById).toHaveBeenCalledWith(mockUid);
            expect(mockRepository.findById).toHaveBeenCalledOnce();
        });

        it('[TC-SP-SRV-04] should throw NotFoundError when the survey period does not exist', async () => {
            // Arrange: Mock the repository to return null for an invalid uid
            const invalidUid = 'non-existent-uid';
            mockRepository.findById.mockResolvedValue(null);

            // Act & Assert: Verify that the service throws the expected error
            await expect(service.getSurveyPeriod(invalidUid)).rejects.toThrow(NotFoundError);
            
            // Assert: Verify the repository was still called with the invalid uid
            expect(mockRepository.findById).toHaveBeenCalledWith(invalidUid);
            expect(mockRepository.findById).toHaveBeenCalledOnce();
        });
    });

    // ==========================================
    // Test Block 3: createSurveyPeriod
    // ==========================================
    describe('createSurveyPeriod', () => {
        
        // Validation Path (it.each): Test invalid minWalks
        it.each([
            [-1],       // Negative number
            [1.5],      // Decimal number
            [NaN],      // Not a Number
        ])('[TC-SP-SRV-05] should throw BadRequestError when minWalks is invalid (%s)', async (invalidMinWalks) => {
            // Arrange: Prepare input with invalid minWalks
            const invalidInput = {
                name: 'Test Survey',
                startDate: new Date('2026-01-01'),
                endDate: new Date('2026-02-01'),
                isFinished: false,
                isActive: false,
                minWalks: invalidMinWalks,
                volunteerUids: []
            };

            // Act & Assert: Verify that the validation catches the error
            await expect(service.createSurveyPeriod(invalidInput)).rejects.toThrow(BadRequestError);
            
            // Assert: Ensure the database create method was NEVER called because validation failed
            expect(mockRepository.create).not.toHaveBeenCalled();
        });

        // Validation Path: Test invalid dates
        it('[TC-SP-SRV-06] should throw BadRequestError when endDate is before startDate', async () => {
            // Arrange: Prepare input where endDate is earlier than startDate
            const invalidInput = {
                name: 'Test Survey',
                startDate: new Date('2026-02-01'), // February
                endDate: new Date('2026-01-01'),   // January (Invalid)
                isFinished: false,
                isActive: false,
                minWalks: 1,
                volunteerUids: []
            };

            // Act & Assert: Verify that the date validation catches the error
            await expect(service.createSurveyPeriod(invalidInput)).rejects.toThrow(BadRequestError);
            
            // Assert: Ensure the database create method was NEVER called
            expect(mockRepository.create).not.toHaveBeenCalled();
        });

        // Success Path
        it('[TC-SP-SRV-07] should successfully call repository.create and return the new entity when all parameters are valid', async () => {
            // Arrange: Prepare valid input and mock database response
            const validInput = {
                name: 'Valid Survey',
                startDate: new Date('2026-01-01'),
                endDate: new Date('2026-02-01'),
                isFinished: false,
                isActive: false,
                minWalks: 2,
                volunteerUids: []
            };
            const mockCreatedEntity: SurveyPeriodEntity = { 
                uid: 'new-generated-uid', 
                ...validInput 
            };
            mockRepository.create.mockResolvedValue(mockCreatedEntity);

            // Act: Call the target method  
            const result = await service.createSurveyPeriod(validInput);

            // Assert: Verify the returned data and database interaction
            expect(result).toEqual(mockCreatedEntity);
            expect(mockRepository.create).toHaveBeenCalledWith(validInput);
            expect(mockRepository.create).toHaveBeenCalledOnce();
        });
    });

    // ==========================================
    // Test Block 4: updateSurveyPeriod
    // ==========================================
    describe('updateSurveyPeriod', () => {
        const mockUid = 'update-uid-123';
        const existingSurveyPeriod: SurveyPeriodEntity = {
            uid: mockUid,
            name: 'Original Survey',
            startDate: new Date('2026-03-01'),
            endDate: new Date('2026-05-01'),
            isFinished: false,
            isActive: false,
            minWalks: 2
        };

        // Failure Path 1: Target period doesn't exist
        it('[TC-SP-SRV-08] should throw NotFoundError when the survey period to update does not exist', async () => {
            // Arrange: Mock findById to return null (simulating getSurveyPeriod failing)
            mockRepository.findById.mockResolvedValue(null);
            const updateInput = { name: 'New Name' };

            // Act & Assert: Verify it throws NotFoundError early
            await expect(service.updateSurveyPeriod(mockUid, updateInput)).rejects.toThrow(NotFoundError);
            
            // Assert: Ensure repository.update is never reached
            expect(mockRepository.update).not.toHaveBeenCalled();
        });

        // Validation Path 1: Invalid cross-dates
        it('[TC-SP-SRV-09] should throw BadRequestError when updating only endDate makes it earlier than existing startDate', async () => {
            // Arrange: Mock findById to return the existing record
            mockRepository.findById.mockResolvedValue(existingSurveyPeriod);
            
            // Prepare input where the new endDate (Feb) is before existing startDate (Mar)
            const invalidDateInput = { endDate: new Date('2026-02-01') };

            // Act & Assert: Verify date validation catches the error
            await expect(service.updateSurveyPeriod(mockUid, invalidDateInput)).rejects.toThrow(BadRequestError);
            
            // Assert: Ensure repository.update is never reached
            expect(mockRepository.update).not.toHaveBeenCalled();
        });

        // Validation Path 2: Invalid minWalks
        it('[TC-SP-SRV-10] should throw BadRequestError when minWalks is invalid', async () => {
            // Arrange: Mock findById to return the existing record
            mockRepository.findById.mockResolvedValue(existingSurveyPeriod);
            
            // Prepare input with invalid minWalks
            const invalidMinWalksInput = { minWalks: -1 };

            // Act & Assert: Verify minWalks validation catches the error
            await expect(service.updateSurveyPeriod(mockUid, invalidMinWalksInput)).rejects.toThrow(BadRequestError);
            
            // Assert: Ensure repository.update is never reached
            expect(mockRepository.update).not.toHaveBeenCalled();
        });

        // Failure Path 2: repository.update returns null
        it('[TC-SP-SRV-11] should throw NotFoundError when repository.update fails and returns null', async () => {
            // Arrange: Mock findById to pass validation, but mock update to return null
            mockRepository.findById.mockResolvedValue(existingSurveyPeriod);
            mockRepository.update.mockResolvedValue(null);
            
            const validInput = { name: 'Valid Update' };

            // Act & Assert: Verify it throws NotFoundError
            await expect(service.updateSurveyPeriod(mockUid, validInput)).rejects.toThrow(NotFoundError);
            
            // Assert: Ensure repository.update WAS called, but failed
            expect(mockRepository.update).toHaveBeenCalledWith(mockUid, validInput);
        });

        // Success Path 1: Update with an empty payload (no fields updated)
        it('[TC-SP-SRV-12] should successfully process when no fields are updated', async () => {
            // Arrange
            mockRepository.findById.mockResolvedValue(existingSurveyPeriod);
            const emptyInput = {};
            mockRepository.update.mockResolvedValue(existingSurveyPeriod);

            // Act
            const result = await service.updateSurveyPeriod(mockUid, emptyInput);

            // Assert
            expect(result).toEqual(existingSurveyPeriod);
            expect(mockRepository.update).toHaveBeenCalledWith(mockUid, emptyInput);
            expect(mockRepository.update).toHaveBeenCalledOnce();
        });

        // Success Path 2: Update without providing dates (fallback to existing dates)
        it('[TC-SP-SRV-13] should successfully update when dates are not provided', async () => {
            // Arrange
            mockRepository.findById.mockResolvedValue(existingSurveyPeriod);
            const noDateInput = { 
                name: 'New Name', 
                minWalks: 10 
            };
            const updatedEntity: SurveyPeriodEntity = { 
                ...existingSurveyPeriod, 
                ...noDateInput 
            };
            mockRepository.update.mockResolvedValue(updatedEntity);

            // Act
            const result = await service.updateSurveyPeriod(mockUid, noDateInput);

            // Assert
            expect(result).toEqual(updatedEntity);
            expect(mockRepository.update).toHaveBeenCalledWith(mockUid, noDateInput);
            expect(mockRepository.update).toHaveBeenCalledOnce();
        });

        // Success Path 3: Update without providing minWalks (only updating dates)
        it('[TC-SP-SRV-14] should successfully update dates without triggering minWalks validation', async () => {
            // Arrange
            mockRepository.findById.mockResolvedValue(existingSurveyPeriod);
            const onlyDatesInput = { 
                startDate: new Date('2026-04-01'), 
                endDate: new Date('2026-06-01') 
            };
            const updatedEntity: SurveyPeriodEntity = { 
                ...existingSurveyPeriod, 
                ...onlyDatesInput 
            };
            mockRepository.update.mockResolvedValue(updatedEntity);

            // Act
            const result = await service.updateSurveyPeriod(mockUid, onlyDatesInput);

            // Assert
            expect(result).toEqual(updatedEntity);
            expect(mockRepository.update).toHaveBeenCalledWith(mockUid, onlyDatesInput);
            expect(mockRepository.update).toHaveBeenCalledOnce();
        });

        // Success Path 4: Update all fields
        it('[TC-SP-SRV-15] should successfully update when all fields are provided', async () => {
            // Arrange
            mockRepository.findById.mockResolvedValue(existingSurveyPeriod);
            const allFieldsInput = { 
                name: 'Totally New Survey',
                startDate: new Date('2026-07-01'),
                endDate: new Date('2026-12-01'),
                minWalks: 5
            };
            const updatedEntity: SurveyPeriodEntity = { 
                ...existingSurveyPeriod, 
                ...allFieldsInput 
            };
            mockRepository.update.mockResolvedValue(updatedEntity);

            // Act
            const result = await service.updateSurveyPeriod(mockUid, allFieldsInput);

            // Assert
            expect(result).toEqual(updatedEntity);
            expect(mockRepository.update).toHaveBeenCalledWith(mockUid, allFieldsInput);
            expect(mockRepository.update).toHaveBeenCalledOnce();
        });
    });

    // ==========================================
    // Test Block 5: deleteSurveyPeriod
    // ==========================================
    describe('deleteSurveyPeriod', () => {
        const mockUid = 'delete-uid-123';

        // Failure Path: repository returns false
        it('[TC-SP-SRV-16] should throw NotFoundError when the survey period to delete does not exist', async () => {
            // Arrange
            mockRepository.delete.mockResolvedValue(false);

            // Act & Assert
            await expect(service.deleteSurveyPeriod(mockUid)).rejects.toThrow(NotFoundError);
            
            // Assert
            expect(mockRepository.delete).toHaveBeenCalledWith(mockUid);
            expect(mockRepository.delete).toHaveBeenCalledOnce();
        });

        // Success Path: repository returns true
        it('[TC-SP-SRV-17] should return a success object when the survey period is successfully deleted', async () => {
            // Arrange
            mockRepository.delete.mockResolvedValue(true);

            // Act
            const result = await service.deleteSurveyPeriod(mockUid);

            // Assert
            expect(result).toEqual({ success: true, uid: mockUid });
            expect(mockRepository.delete).toHaveBeenCalledWith(mockUid);
            expect(mockRepository.delete).toHaveBeenCalledOnce();
        });
    });


});