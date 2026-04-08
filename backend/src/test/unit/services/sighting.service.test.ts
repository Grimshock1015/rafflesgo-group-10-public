import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSighting, deleteSighting, getAllSightings, getMySightingsDashboard } from '../../../services/sighting.service';
import { db } from '../../../lib/firebase-admin';
import { FIRESTORE_COLLECTIONS } from '../../../lib/firestore-collections';

// Mock crypto module to generate deterministic ID
vi.mock('crypto', () => ({
    randomUUID: () => 'mock-uuid-1234',
}));

// Mock Firebase implementation details for tracking arguments and interactions
vi.mock('../../../lib/firebase-admin', () => {
    const set = vi.fn().mockResolvedValue(undefined);
    const deleteFn = vi.fn().mockResolvedValue(undefined);
    const get = vi.fn().mockResolvedValue({ docs: [] });
    const where = vi.fn(() => ({ get }));
    const doc = vi.fn(() => ({ set, delete: deleteFn }));
    const collection = vi.fn(() => ({ doc, where, get }));
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
                surveyWalkUid: 'walk-123',
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
                submittedBy: 'user-uid-123',
            };

            const result = await createSighting(input);

            // Verify the returned sighting has all fields properly mapped
            expect(result.id).toBe('mock-uuid-1234');
            expect(result.surveyWalkUid).toBe('walk-123');
            expect(result.result).toBe('sighted');
            expect(result.species).toBe('Raffles Banded Langur');
            expect(result.latitude).toBe(1.3521);
            expect(result.longitude).toBe(103.8198);
            expect(result.adults).toBe(2);
            expect(result.juveniles).toBe(1);
            expect(result.behaviour).toBe('Feeding');
            expect(result.notes).toBe('Saw them high up in the canopy.');
            expect(result.mediaUrl).toBe('https://example.com/image.jpg');
            expect(result.submittedBy).toBe('user-uid-123');
            expect(result.createdAt).toEqual(expect.any(String));

            // Verify Firebase interaction
            const mockCollection = db.collection as unknown as () => {
                doc: () => { set: ReturnType<typeof vi.fn> };
                where: () => { get: ReturnType<typeof vi.fn> };
            };
            expect(mockCollection).toHaveBeenCalledWith(FIRESTORE_COLLECTIONS.SIGHTINGS);

            const mockDoc = mockCollection().doc;
            expect(mockDoc).toHaveBeenCalledWith('mock-uuid-1234');

            const mockSet = mockDoc().set;
            expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({
                id: 'mock-uuid-1234',
                surveyWalkUid: 'walk-123',
                result: 'sighted',
                species: 'Raffles Banded Langur',
                submittedBy: 'user-uid-123',
            }));
        });

        it('should create a sighting fallback for coalesced or missing fields', async () => {
            const input = {
                surveyWalkUid: 'walk-999',
                result: 'not_sighted' as const,
                date: '2026-03-24',
                time: '14:00',
                location: 'Park',
                submittedBy: 'anonymous-uid',
            };

            const result = await createSighting(input);

            // Verify fields fallback to appropriate defaults (null or empty string based on handler)
            expect(result.id).toBe('mock-uuid-1234');
            expect(result.surveyWalkUid).toBe('walk-999');
            expect(result.result).toBe('not_sighted');
            expect(result.species).toBeNull();
            expect(result.latitude).toBeNull();
            expect(result.longitude).toBeNull();
            expect(result.adults).toBeNull();
            expect(result.juveniles).toBeNull();
            expect(result.behaviour).toBeNull();
            expect(result.notes).toBe('');
            expect(result.mediaUrl).toBe('');
            expect(result.submittedBy).toBe('anonymous-uid');

            // Verify Firebase Database operation applies default values appropriately
            const mockCollection = db.collection as unknown as () => {
                doc: () => { set: ReturnType<typeof vi.fn> };
                where: () => { get: ReturnType<typeof vi.fn> };
            };
            const mockSet = mockCollection().doc().set;
            expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({
                id: 'mock-uuid-1234',
                result: 'not_sighted',
                species: null,
                submittedBy: 'anonymous-uid',
            }));
        });
    });

    describe('getMySightingsDashboard', () => {
        it('should return sorted sightings and aggregate stats for the current user', async () => {
            const docs = [
                {
                    data: () => ({
                        id: 'older',
                        surveyWalkUid: 'walk-a',
                        result: 'not_sighted',
                        date: '2026-03-24',
                        time: '09:00',
                        location: 'Route A',
                        species: null,
                        latitude: null,
                        longitude: null,
                        adults: null,
                        juveniles: null,
                        behaviour: null,
                        notes: '',
                        mediaUrl: '',
                        submittedBy: 'user-uid-123',
                        createdAt: '2026-03-24T09:00:00.000Z',
                    }),
                },
                {
                    data: () => ({
                        id: 'newer',
                        surveyWalkUid: 'walk-a',
                        result: 'sighted',
                        date: '2026-03-25',
                        time: '10:30',
                        location: 'Route B',
                        species: 'Raffles Banded Langur',
                        latitude: 1.3,
                        longitude: 103.8,
                        adults: 2,
                        juveniles: 1,
                        behaviour: 'Resting',
                        notes: 'Observed in canopy',
                        mediaUrl: '',
                        submittedBy: 'user-uid-123',
                        createdAt: '2026-03-25T10:30:00.000Z',
                    }),
                },
                {
                    data: () => ({
                        id: 'same-species',
                        surveyWalkUid: 'walk-b',
                        result: 'sighted',
                        date: '2026-03-26',
                        time: '07:30',
                        location: 'Route B',
                        species: 'Raffles Banded Langur',
                        latitude: 1.31,
                        longitude: 103.81,
                        adults: 1,
                        juveniles: 0,
                        behaviour: 'Moving',
                        notes: '',
                        mediaUrl: '',
                        submittedBy: 'user-uid-123',
                        createdAt: '2026-03-26T07:30:00.000Z',
                    }),
                },
            ];

            const mockCollection = db.collection as unknown as () => {
                doc: () => { set: ReturnType<typeof vi.fn> };
                where: () => { get: ReturnType<typeof vi.fn> };
            };
            const collectionResult = mockCollection();
            collectionResult.where().get.mockResolvedValue({ docs });

            const result = await getMySightingsDashboard('user-uid-123');

            expect(mockCollection).toHaveBeenCalledWith(FIRESTORE_COLLECTIONS.SIGHTINGS);
            expect(collectionResult.where).toHaveBeenCalledWith('submittedBy', '==', 'user-uid-123');
            expect(result.sightings.map((sighting) => sighting.id)).toEqual(['same-species', 'newer', 'older']);
            expect(result.stats).toEqual({
                totalSubmissions: 3,
                sightedCount: 2,
                notSightedCount: 1,
                uniqueLocations: 2,
                totalAdults: 3,
                totalJuveniles: 1,
                latestSubmissionAt: '2026-03-26T07:30:00.000Z',
                speciesBreakdown: [
                    { species: 'Raffles Banded Langur', count: 2 },
                ],
            });
        });
    });

    describe('getAllSightings', () => {
        it('should return all sightings sorted by createdAt descending', async () => {
            const docs = [
                { data: () => ({ id: 'older', createdAt: '2026-03-24T09:00:00.000Z' }) },
                { data: () => ({ id: 'newer', createdAt: '2026-03-25T09:00:00.000Z' }) },
            ];

            const mockCollection = db.collection as unknown as ReturnType<typeof vi.fn>;
            mockCollection().get.mockResolvedValue({ docs });

            const result = await getAllSightings();

            expect(result.map((sighting) => sighting.id)).toEqual(['newer', 'older']);
        });
    });

    describe('deleteSighting', () => {
        it('should delete a sighting by id', async () => {
            const mockCollection = db.collection as unknown as ReturnType<typeof vi.fn>;

            await deleteSighting('sighting-123');

            expect(mockCollection).toHaveBeenCalledWith(FIRESTORE_COLLECTIONS.SIGHTINGS);
            expect(mockCollection().doc).toHaveBeenCalledWith('sighting-123');
            expect(mockCollection().doc().delete).toHaveBeenCalledOnce();
        });
    });
});
