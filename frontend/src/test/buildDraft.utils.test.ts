import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { buildDraft } from '../utils/buildDraft';
import type { SightingDraftFormData, DraftMedia } from '../types/sightingDrafts';

describe('buildDraft utility', () => {
  // Setup constants for mocking uncontrollable variables (time and UUID)
  const MOCK_TIME = 1700000000000;
  const MOCK_UUID = '123e4567-e89b-12d3-a456-426614174000';

  beforeAll(() => {
    // Lock the system time so Date.now() always returns MOCK_TIME
    vi.useFakeTimers();
    vi.setSystemTime(MOCK_TIME);
    
    // Stub the global crypto object to always return our MOCK_UUID
    vi.stubGlobal('crypto', { randomUUID: () => MOCK_UUID });
  });

  afterAll(() => {
    // Restore everything back to normal after tests are done
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('should use default values (generate UUID and current time) when optional params are missing', () => {
    // Arrange (Setup the test data)
    const mockUserId = 'user-123';
    // Using type assertion 'as' to bypass strict type checking for mock data
    const mockFormData = { species: 'Bird', location: 'Park' } as unknown as SightingDraftFormData;
    const mockMedia = [] as DraftMedia[];

    // Act 
    const result = buildDraft({
      userId: mockUserId,
      formData: mockFormData,
      media: mockMedia,
    });

    // Assert
    expect(result).toEqual({
      id: MOCK_UUID,            // Hits the right branch: draftId ?? crypto.randomUUID()
      userId: mockUserId,
      createdAt: MOCK_TIME,     // Hits the right branch: createdAt ?? now
      updatedAt: MOCK_TIME,     // Always current time
      status: 'draft',          // Default parameter value
      formData: mockFormData,
      media: mockMedia,
      lastError: null,
    });
  });

  it('should use provided values and override defaults when all params are given', () => {
    // Arrange 
    const mockUserId = 'user-456';
    const mockFormData = { species: 'Cat', location: 'Street' } as unknown as SightingDraftFormData;
    const mockMedia = [{ id: 'media-1', file: new File([], 'test.jpg') }] as unknown as DraftMedia[];
    
    const customId = 'custom-draft-id';
    const customTime = 1600000000000; // An older timestamp
    const customStatus = 'pending_sync';

    // Act 
    const result = buildDraft({
      draftId: customId,
      userId: mockUserId,
      formData: mockFormData,
      media: mockMedia,
      status: customStatus,
      createdAt: customTime,
    });

    // Assert 
    expect(result).toEqual({
      id: customId,             // Hits the left branch: keeps custom ID
      userId: mockUserId,
      createdAt: customTime,    // Hits the left branch: keeps custom time
      updatedAt: MOCK_TIME,     // updatedAt must STILL be the current time
      status: customStatus,     // Overrides 'draft'
      formData: mockFormData,
      media: mockMedia,
      lastError: null,
    });
  });
});