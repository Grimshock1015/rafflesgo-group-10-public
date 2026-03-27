import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { initializeFirebaseEmulator, clearFirebaseEmulator, getFirestore } from '../setup-emulator';
import { buildApp } from '../../app';
import { auth } from '../../lib/firebase-admin';

vi.mock('../../lib/firebase-admin', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../lib/firebase-admin')>();
    return {
        ...actual,
        auth: {
            ...actual.auth,
            verifyIdToken: vi.fn(),
        },
    };
});

describe('Sighting Submissions Integration', () => {
    let app: FastifyInstance;
    let db: FirebaseFirestore.Firestore;

    beforeAll(async () => {
        initializeFirebaseEmulator();
        db = getFirestore();
        app = await buildApp({ logger: false, serveStatic: false });
        await app.ready();
    });

    afterEach(async () => {
        await clearFirebaseEmulator();
        vi.mocked(auth.verifyIdToken).mockReset();
    });

    function mockRegularUser() {
        // @ts-ignore
        vi.mocked(auth.verifyIdToken).mockResolvedValue({
            uid: 'user-456',
            email: 'user@example.com',
            role: 'user',
        });
    }

    const validSightedPayload = {
        result: 'sighted',
        date: '2026-03-24',
        time: '14:30',
        location: 'Location A',
        species: 'Species X',
        latitude: 1.3521,
        longitude: 103.8198,
        adults: 2,
        juveniles: 1,
        behaviour: 'Foraging',
        notes: 'Some notes here',
        mediaUrl: 'http://example.com/image.jpg',
    };

    const validNotSightedPayload = {
        result: 'not_sighted',
        date: '2026-03-24',
        time: '14:30',
        location: 'Location B',
    };

    it('POST /api/sightings should successfully create a sighting for authenticated user (sighted)', async () => {
        mockRegularUser();

        const response = await app.inject({
            method: 'POST',
            url: '/api/sightings',
            headers: { authorization: 'Bearer fake-token' },
            payload: validSightedPayload,
        });

        expect(response.statusCode).toBe(201);
        const data = response.json();
        expect(data.message).toBe('Sighting submitted successfully');
        expect(data.sighting).toBeDefined();
        expect(data.sighting.id).toBeDefined();
        expect(data.sighting.submittedBy).toBe('user@example.com');
        expect(data.sighting.species).toBe('Species X');

        // Verify in DB
        const doc = await db.collection('sightings').doc(data.sighting.id).get();
        expect(doc.exists).toBe(true);
        const docData = doc.data();
        expect(docData?.submittedBy).toBe('user@example.com');
        expect(docData?.result).toBe('sighted');
        expect(docData?.adults).toBe(2);
    });

    it('POST /api/sightings should successfully create a sighting for authenticated user (not_sighted)', async () => {
        mockRegularUser();

        const response = await app.inject({
            method: 'POST',
            url: '/api/sightings',
            headers: { authorization: 'Bearer fake-token' },
            payload: validNotSightedPayload,
        });

        expect(response.statusCode).toBe(201);
        const data = response.json();
        expect(data.message).toBe('Sighting submitted successfully');
        expect(data.sighting).toBeDefined();
        expect(data.sighting.id).toBeDefined();
        expect(data.sighting.submittedBy).toBe('user@example.com');
        expect(data.sighting.result).toBe('not_sighted');

        // Verify in DB
        const doc = await db.collection('sightings').doc(data.sighting.id).get();
        expect(doc.exists).toBe(true);
        expect(doc.data()?.result).toBe('not_sighted');
    });

    it('POST /api/sightings should return 400 when missing required fields', async () => {
        mockRegularUser();

        const response = await app.inject({
            method: 'POST',
            url: '/api/sightings',
            headers: { authorization: 'Bearer fake-token' },
            payload: {
                // missing result, date, time, location
                notes: 'Just notes',
            },
        });

        expect(response.statusCode).toBe(400);
    });

    it('POST /api/sightings should return 400 when given an invalid result enum value', async () => {
        mockRegularUser();

        const response = await app.inject({
            method: 'POST',
            url: '/api/sightings',
            headers: { authorization: 'Bearer fake-token' },
            payload: {
                ...validSightedPayload,
                result: 'invalid_status',
            },
        });

        expect(response.statusCode).toBe(400);
    });

    it('POST /api/sightings should return 401 when the user is unauthenticated', async () => {
        // No mock token setup -> verifyIdToken throws or we don't send auth header

        const response = await app.inject({
            method: 'POST',
            url: '/api/sightings',
            // No auth header
            payload: validSightedPayload,
        });

        expect(response.statusCode).toBe(401);
    });
});
