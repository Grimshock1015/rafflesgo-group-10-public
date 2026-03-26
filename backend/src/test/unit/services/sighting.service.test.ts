import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSighting } from '../../../services/sighting.service';
import { db } from '../../../lib/firebase-admin';

// Mock crypto module to generate deterministic ID
vi.mock('crypto', () => ({
    randomUUID: () => 'mock-uuid-1234',
}));

// Mock Firebase implementation details for tracking arguments and interactions
vi.mock('../../../lib/firebase-admin', () => {
    const set = vi.fn().mockResolvedValue(undefined);
    const doc = vi.fn(() => ({ set }));
    const collection = vi.fn(() => ({ doc }));
    return {
        db: {
            collection,
        },
    };
});

describe('Sighting Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('createSighting', () => {
        it('should create and save a sighting with all optional fields provided', async () => {
            const input = {
                result: 'sighted' as const,
                date: '2026-03-24',
                time: '12:00',
                location: 'Nature Reserve',
                species: 'Raffles Banded Langur',
                latitude: 1.3521,
                longitude: 103.8198,
                adults: 2,
                juveniles: 1,
                behaviour: 'Feeding',
                notes: 'Saw them high up in the canopy.',
                mediaUrl: 'https://example.com/image.jpg',
                submittedBy: 'user@example.com',
            };

            const result = await createSighting(input);

            // Verify the returned sighting has all fields properly mapped
            expect(result.id).toBe('mock-uuid-1234');
            expect(result.result).toBe('sighted');
            expect(result.species).toBe('Raffles Banded Langur');
            expect(result.latitude).toBe(1.3521);
            expect(result.longitude).toBe(103.8198);
            expect(result.adults).toBe(2);
            expect(result.juveniles).toBe(1);
            expect(result.behaviour).toBe('Feeding');
            expect(result.notes).toBe('Saw them high up in the canopy.');
            expect(result.mediaUrl).toBe('https://example.com/image.jpg');
            expect(result.submittedBy).toBe('user@example.com');
            expect(result.createdAt).toEqual(expect.any(String));

            // Verify Firebase interaction
            const mockCollection = db.collection as unknown as ReturnType<typeof vi.fn>;
            expect(mockCollection).toHaveBeenCalledWith('sightings');

            const mockDoc = mockCollection().doc;
            expect(mockDoc).toHaveBeenCalledWith('mock-uuid-1234');

            const mockSet = mockDoc().set;
            expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({
                id: 'mock-uuid-1234',
                result: 'sighted',
                species: 'Raffles Banded Langur',
                submittedBy: 'user@example.com',
            }));
        });

        it('should create a sighting fallback for coalesced or missing fields', async () => {
            const input = {
                result: 'not_sighted' as const,
                date: '2026-03-24',
                time: '14:00',
                location: 'Park',
                submittedBy: 'anonymous',
            };

            const result = await createSighting(input);

            // Verify fields fallback to appropriate defaults (null or empty string based on handler)
            expect(result.id).toBe('mock-uuid-1234');
            expect(result.result).toBe('not_sighted');
            expect(result.species).toBeNull();
            expect(result.latitude).toBeNull();
            expect(result.longitude).toBeNull();
            expect(result.adults).toBeNull();
            expect(result.juveniles).toBeNull();
            expect(result.behaviour).toBeNull();
            expect(result.notes).toBe('');
            expect(result.mediaUrl).toBe('');
            expect(result.submittedBy).toBe('anonymous');

            // Verify Firebase Database operation applies default values appropriately
            const mockSet = (db.collection as unknown as ReturnType<typeof vi.fn>)().doc().set;
            expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({
                id: 'mock-uuid-1234',
                result: 'not_sighted',
                species: null,
            }));
        });
    });
});
