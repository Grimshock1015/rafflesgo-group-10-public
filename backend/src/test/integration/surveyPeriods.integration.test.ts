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

describe('Survey Periods Integration', () => {
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
        // @ts-ignore
        } );
    }

    function mockRegularUser() {
      // @ts-ignore
        vi.mocked(auth.verifyIdToken).mockResolvedValue({
            uid: 'user-456',
            email: 'user@example.com',
            role: 'user',
        } );
    }

    const mockPeriod = {
        name: 'Test Period 1',
        startDate: '2026-03-24T00:00:00.000Z',
        endDate: '2026-03-30T00:00:00.000Z',
        isFinished: false,
        minWalks: 5,
    };

    it('POST /api/surveyPeriods should create a new period (Admin)', async () => {
        mockAdminUser();

        const response = await app.inject({
            method: 'POST',
            url: '/api/surveyPeriods',
            headers: { authorization: 'Bearer fake-token' },
            payload: mockPeriod,
        });

        expect(response.statusCode).toBe(201);
        const data = response.json();
        expect(data.name).toBe(mockPeriod.name);
        expect(data.uid).toBeDefined();

        // Verify in DB
        const doc = await db.collection(FIRESTORE_COLLECTIONS.SURVEYPERIODS).doc(data.uid).get();
        expect(doc.exists).toBe(true);
        expect(doc.data()?.name).toBe(mockPeriod.name);
    });

    it('POST /api/surveyPeriods should return 400 for missing fields (Admin)', async () => {
        mockAdminUser();

        const response = await app.inject({
            method: 'POST',
            url: '/api/surveyPeriods',
            headers: { authorization: 'Bearer fake-token' },
            payload: { ...mockPeriod, name: '' }, // Missing name
        });

        expect(response.statusCode).toBe(400);
    });

    it('POST /api/surveyPeriods should return 400 for invalid date range (Admin)', async () => {
        mockAdminUser();

        const response = await app.inject({
            method: 'POST',
            url: '/api/surveyPeriods',
            headers: { authorization: 'Bearer fake-token' },
            payload: { ...mockPeriod, startDate: '2026-03-30T00:00:00.000Z', endDate: '2026-03-24T00:00:00.000Z' }, // endDate before startDate
        });

        expect(response.statusCode).toBe(400);
    });

    it('POST /api/surveyPeriods should return 403 for non-admin', async () => {
        mockRegularUser();

        const response = await app.inject({
            method: 'POST',
            url: '/api/surveyPeriods',
            headers: { authorization: 'Bearer fake-token' },
            payload: mockPeriod,
        });

        expect(response.statusCode).toBe(403);
    });

    it('GET /api/surveyPeriods should list all periods (Admin)', async () => {
        mockAdminUser();

        await db.collection(FIRESTORE_COLLECTIONS.SURVEYPERIODS).add({ ...mockPeriod, volunteerUids: [] });
        await db.collection(FIRESTORE_COLLECTIONS.SURVEYPERIODS).add({ ...mockPeriod, name: 'Test Period 2', volunteerUids: [] });

        const response = await app.inject({
            method: 'GET',
            url: '/api/surveyPeriods',
            headers: { authorization: 'Bearer fake-token' },
        });

        expect(response.statusCode).toBe(200);
        const data = response.json();
        expect(data.surveyPeriods.length).toBe(2);
        // ensure names match

        const names = data.surveyPeriods.map((p: { name: string }) => p.name);
        expect(names).toContain('Test Period 1');
        expect(names).toContain('Test Period 2');
    });

    it('GET /api/surveyPeriods/:uid should fetch a single period by ID (Admin)', async () => {
        mockAdminUser();

        const docRef = await db.collection(FIRESTORE_COLLECTIONS.SURVEYPERIODS).add({ ...mockPeriod, volunteerUids: [] });

        const response = await app.inject({
            method: 'GET',
            url: `/api/surveyPeriods/${docRef.id}`,
            headers: { authorization: 'Bearer fake-token' },
        });

        expect(response.statusCode).toBe(200);
        const data = response.json();
        expect(data.uid).toBe(docRef.id);
        expect(data.name).toBe(mockPeriod.name);
    });

    it('GET /api/surveyPeriods/:uid should return 404 when period does not exist (Admin)', async () => {
        mockAdminUser();

        const response = await app.inject({
            method: 'GET',
            url: '/api/surveyPeriods/non-existent-id',
            headers: { authorization: 'Bearer fake-token' },
        });

        expect(response.statusCode).toBe(404);
    });

    it('PUT /api/surveyPeriods/:uid should update an existing period (Admin)', async () => {
        mockAdminUser();

        const docRef = await db.collection(FIRESTORE_COLLECTIONS.SURVEYPERIODS).add({ ...mockPeriod, volunteerUids: [] });

        const response = await app.inject({
            method: 'PUT',
            url: `/api/surveyPeriods/${docRef.id}`,
            headers: { authorization: 'Bearer fake-token' },
            payload: { name: 'Updated Period Name' },
        });

        expect(response.statusCode).toBe(200);
        const data = response.json();
        expect(data.name).toBe('Updated Period Name');

        // Verify in DB
        const doc = await docRef.get();
        expect(doc.data()?.name).toBe('Updated Period Name');
    });

    it('POST /api/surveyPeriods should return 400 when minWalks is negative (Admin)', async () => {
        mockAdminUser();

        const response = await app.inject({
            method: 'POST',
            url: '/api/surveyPeriods',
            headers: { authorization: 'Bearer fake-token' },
            payload: {
                ...mockPeriod,
                minWalks: -1,
            },
        });

        expect(response.statusCode).toBe(400);
    });

    it('PUT /api/surveyPeriods/:uid should return 404 for non-existent period (Admin)', async () => {
        mockAdminUser();

        const response = await app.inject({
            method: 'PUT',
            url: `/api/surveyPeriods/nonexistent-id`,
            headers: { authorization: 'Bearer fake-token' },
            payload: { name: 'Updated Period Name' },
        });

        expect(response.statusCode).toBe(404);
    });

    it('DELETE /api/surveyPeriods/:uid should delete a period (Admin)', async () => {
        mockAdminUser();

        const docRef = await db.collection(FIRESTORE_COLLECTIONS.SURVEYPERIODS).add({ ...mockPeriod, volunteerUids: [] });

        const response = await app.inject({
            method: 'DELETE',
            url: `/api/surveyPeriods/${docRef.id}`,
            headers: { authorization: 'Bearer fake-token' },
        });

        expect(response.statusCode).toBe(200);
        expect(response.json().success).toBe(true);
        expect(response.json().uid).toBe(docRef.id);

        // Verify in DB
        const doc = await docRef.get();
        expect(doc.exists).toBe(false);
    });

    it('DELETE /api/surveyPeriods/:uid should return 404 for non-existent period (Admin)', async () => {
        mockAdminUser();

        const response = await app.inject({
            method: 'DELETE',
            url: `/api/surveyPeriods/nonexistent-id`,
            headers: { authorization: 'Bearer fake-token' },
        });

        expect(response.statusCode).toBe(404);
    });

    it('POST /api/surveyPeriods/:uid/join should add user to volunteers array (User)', async () => {
        mockRegularUser();

        const docRef = await db.collection(FIRESTORE_COLLECTIONS.SURVEYPERIODS).add({ ...mockPeriod, volunteerUids: [] });

        const response = await app.inject({
            method: 'POST',
            url: `/api/surveyPeriods/${docRef.id}/join`,
            headers: { authorization: 'Bearer fake-token' },
            payload: { volunteerUid: 'user-456' },
        });

        expect(response.statusCode).toBe(200);
        expect(response.json().success).toBe(true);

        // Verify in DB
        const doc = await docRef.get();
        expect(doc.data()?.volunteerUids).toContain('user-456');
    });

    it('POST /api/surveyPeriods/:uid/join should return 404 for non-existent period (User)', async () => {
        mockRegularUser();

        const response = await app.inject({
            method: 'POST',
            url: `/api/surveyPeriods/nonexistent-id/join`,
            headers: { authorization: 'Bearer fake-token' },
            payload: { volunteerUid: 'user-456' },
        });

        expect(response.statusCode).toBe(404);
    });

    it('POST /api/surveyPeriods/:uid/join should return 400 for missing volunteerUid (User)', async () => {
        mockRegularUser();

        const docRef = await db.collection(FIRESTORE_COLLECTIONS.SURVEYPERIODS).add({ ...mockPeriod, volunteerUids: [] });

        const response = await app.inject({
            method: 'POST',
            url: `/api/surveyPeriods/${docRef.id}/join`,
            headers: { authorization: 'Bearer fake-token' },
            payload: {}, // Missing volunteerUid
        });

        expect(response.statusCode).toBe(400);
    });

    it('POST /api/surveyPeriods/:uid/join should not add duplicate volunteerUid (User)', async () => {
        mockRegularUser();

        const docRef = await db.collection(FIRESTORE_COLLECTIONS.SURVEYPERIODS).add({ ...mockPeriod, volunteerUids: ['user-456'] });

        const response = await app.inject({
            method: 'POST',
            url: `/api/surveyPeriods/${docRef.id}/join`,
            headers: { authorization: 'Bearer fake-token' },
            payload: { volunteerUid: 'user-456' },
        });

        expect(response.statusCode).toBe(200);
        expect(response.json().success).toBe(true);

        // Verify in DB - should still only have one instance of 'user-456'
        const doc = await docRef.get();
        const volunteerUids = doc.data()?.volunteerUids || [];
        expect(volunteerUids.filter((uid: string) => uid === 'user-456').length).toBe(1);
    });

    it('POST /api/surveyPeriods/:uid/unjoin should remove user from volunteers array (User)', async () => {
        mockRegularUser();

        const docRef = await db.collection(FIRESTORE_COLLECTIONS.SURVEYPERIODS).add({ ...mockPeriod, volunteerUids: ['user-456', 'other-user'] });

        const response = await app.inject({
            method: 'POST',
            url: `/api/surveyPeriods/${docRef.id}/unjoin`,
            headers: { authorization: 'Bearer fake-token' },
            payload: { volunteerUid: 'user-456' },
        });

        expect(response.statusCode).toBe(200);
        expect(response.json().success).toBe(true);

        // Verify in DB
        const doc = await docRef.get();
        expect(doc.data()?.volunteerUids).not.toContain('user-456');
        expect(doc.data()?.volunteerUids).toContain('other-user');
    });

    it('POST /api/surveyPeriods/:uid/unjoin should return 404 for non-existent period (User)', async () => {
        mockRegularUser();

        const response = await app.inject({
            method: 'POST',
            url: `/api/surveyPeriods/nonexistent-id/unjoin`,
            headers: { authorization: 'Bearer fake-token' },
            payload: { volunteerUid: 'user-456' },
        });

        expect(response.statusCode).toBe(404);
    });
});
