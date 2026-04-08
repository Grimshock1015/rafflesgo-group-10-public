import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { initializeFirebaseEmulator, clearFirebaseEmulator, getFirestore } from '../setup-emulator';
import { buildApp } from '../../app';
import { auth } from '../../lib/firebase-admin';
import { FIRESTORE_COLLECTIONS } from '../../lib/firestore-collections';

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

describe('Survey Walks Integration', () => {
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

    function mockAdminUser() {
        // @ts-ignore
        vi.mocked(auth.verifyIdToken).mockResolvedValue({
            uid: 'admin-123',
            email: 'admin@example.com',
            role: 'admin',
        });
    }

    function mockUser(uid: string, role: 'user' | 'admin' = 'user') {
        // @ts-ignore
        vi.mocked(auth.verifyIdToken).mockResolvedValue({
            uid,
            email: `${uid}@example.com`,
            role,
        });
    }

    async function createSurveyPeriod(isActive = false): Promise<string> {
        const periodRef = await db.collection(FIRESTORE_COLLECTIONS.SURVEYPERIODS).add({
            name: 'Spring 2026',
            startDate: new Date('2026-03-01T00:00:00.000Z'),
            endDate: new Date('2026-05-31T00:00:00.000Z'),
            isFinished: false,
            isActive,
            minWalks: 2,
            volunteerUids: [],
        });

        return periodRef.id;
    }

    it('POST /api/surveyWalks should create a survey walk when times are valid', async () => {
        mockAdminUser();
        const surveyPeriodUid = await createSurveyPeriod();

        const payload = {
            surveyPeriodUid,
            name: 'Morning Walk',
            date: '2026-04-10T00:00:00.000Z',
            startTime: '08:00',
            endTime: '10:00',
            capacity: 4,
            isFinished: false,
        };

        const response = await app.inject({
            method: 'POST',
            url: '/api/surveyWalks',
            headers: { authorization: 'Bearer fake-token' },
            payload,
        });

        expect(response.statusCode).toBe(201);
        const data = response.json();
        expect(data.uid).toBeDefined();
        expect(data.name).toBe(payload.name);
        expect(data.startTime).toBe('08:00');
        expect(data.endTime).toBe('10:00');

        const doc = await db.collection(FIRESTORE_COLLECTIONS.SURVEYWALKS).doc(data.uid).get();
        expect(doc.exists).toBe(true);
        expect(doc.data()?.name).toBe(payload.name);
        expect(doc.data()?.attendeeUids).toEqual([]);
        expect(doc.data()?.completedAt ?? null).toBeNull();
    });

    it('POST /api/surveyWalks should return 400 when startTime is after endTime', async () => {
        mockAdminUser();
        const surveyPeriodUid = await createSurveyPeriod();

        const response = await app.inject({
            method: 'POST',
            url: '/api/surveyWalks',
            headers: { authorization: 'Bearer fake-token' },
            payload: {
                surveyPeriodUid,
                name: 'Invalid Time Walk',
                date: '2026-04-10T00:00:00.000Z',
                startTime: '11:00',
                endTime: '09:00',
                capacity: 4,
                isFinished: false,
            },
        });

        expect(response.statusCode).toBe(400);

        const snapshot = await db.collection(FIRESTORE_COLLECTIONS.SURVEYWALKS).get();
        expect(snapshot.docs).toHaveLength(0);
    });

    it('PUT /api/surveyWalks/:uid should return 400 when updated times are out-of-order', async () => {
        mockAdminUser();
        const surveyPeriodUid = await createSurveyPeriod();

        const existingWalkRef = await db.collection(FIRESTORE_COLLECTIONS.SURVEYWALKS).add({
            surveyPeriodUid,
            name: 'Existing Walk',
            date: new Date('2026-04-10T00:00:00.000Z'),
            startTime: '08:00',
            endTime: '10:00',
            capacity: 4,
            isFinished: false,
            volunteerUids: [],
            attendeeUids: [],
            completedAt: null,
            leader: '',
        });

        const response = await app.inject({
            method: 'PUT',
            url: `/api/surveyWalks/${existingWalkRef.id}`,
            headers: { authorization: 'Bearer fake-token' },
            payload: {
                startTime: '12:00',
                endTime: '09:00',
            },
        });

        expect(response.statusCode).toBe(400);

        const doc = await existingWalkRef.get();
        expect(doc.data()?.startTime).toBe('08:00');
        expect(doc.data()?.endTime).toBe('10:00');
    });

    it('GET /api/surveyWalks/joined should return only walks from active periods', async () => {
        mockAdminUser();

        const activePeriodUid = await createSurveyPeriod(true);
        const inactivePeriodUid = await createSurveyPeriod(false);

        await db.collection(FIRESTORE_COLLECTIONS.SURVEYWALKS).add({
            surveyPeriodUid: activePeriodUid,
            name: 'Active Period Walk',
            date: new Date('2026-04-10T00:00:00.000Z'),
            startTime: '08:00',
            endTime: '10:00',
            capacity: 4,
            isFinished: false,
            volunteerUids: [],
            attendeeUids: [],
            completedAt: null,
            leader: '',
        });

        await db.collection(FIRESTORE_COLLECTIONS.SURVEYWALKS).add({
            surveyPeriodUid: inactivePeriodUid,
            name: 'Inactive Period Walk',
            date: new Date('2026-04-10T00:00:00.000Z'),
            startTime: '08:00',
            endTime: '10:00',
            capacity: 4,
            isFinished: false,
            volunteerUids: [],
            attendeeUids: [],
            completedAt: null,
            leader: '',
        });

        const response = await app.inject({
            method: 'GET',
            url: '/api/surveyWalks/joined',
            headers: { authorization: 'Bearer fake-token' },
        });

        expect(response.statusCode).toBe(200);
        const data = response.json();
        expect(data.surveyWalks).toHaveLength(1);
        expect(data.surveyWalks[0].name).toBe('Active Period Walk');
    });

    it('POST /api/surveyWalks/:uid/complete should mark the walk complete and store attendees', async () => {
        mockUser('leader-1');
        const surveyPeriodUid = await createSurveyPeriod(true);

        const walkRef = await db.collection(FIRESTORE_COLLECTIONS.SURVEYWALKS).add({
            surveyPeriodUid,
            name: 'Attendance Walk',
            date: new Date('2026-04-10T00:00:00.000Z'),
            startTime: '08:00',
            endTime: '10:00',
            capacity: 4,
            isFinished: false,
            volunteerUids: ['leader-1', 'user-2'],
            attendeeUids: [],
            completedAt: null,
            leader: 'leader-1',
        });

        const response = await app.inject({
            method: 'POST',
            url: `/api/surveyWalks/${walkRef.id}/complete`,
            headers: { authorization: 'Bearer fake-token' },
            payload: {
                attendeeUids: ['leader-1'],
            },
        });

        expect(response.statusCode).toBe(200);
        const data = response.json();
        expect(data.success).toBe(true);
        expect(data.surveyWalk.attendeeUids).toEqual(['leader-1']);
        expect(data.surveyWalk.noShows).toEqual([{ uid: 'user-2', name: '' }]);

        const saved = await walkRef.get();
        expect(saved.data()?.isFinished).toBe(true);
        expect(saved.data()?.attendeeUids).toEqual(['leader-1']);
        expect(saved.data()?.completedAt).toBeTruthy();
    });
});
