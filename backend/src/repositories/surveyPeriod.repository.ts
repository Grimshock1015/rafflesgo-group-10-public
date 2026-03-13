import { db } from '../lib/firebase-admin';
import { FIRESTORE_COLLECTIONS } from '../lib/firestore-collections';
import { SurveyPeriodEntity } from '../entities/surveyPeriod.entity';
import { FieldValue } from 'firebase-admin/firestore';  // To use arrayUnion for joining volunteers to survey periods

type SurveyPeriodWrite = Omit<SurveyPeriodEntity, 'uid'>;

type SurveyPeriodUpdate = Partial<SurveyPeriodWrite>;

export class SurveyPeriodRepository {
    private collection() {
        return db.collection(FIRESTORE_COLLECTIONS.SURVEYPERIODS);
    }

    async findAll(): Promise<SurveyPeriodEntity[]> {
        const snapshot = await this.collection().get();
        return snapshot.docs.map((doc) => this.toEntity(doc.id, doc.data()));
    }

    async findById(uid: string): Promise<SurveyPeriodEntity | null> {
        const doc = await this.collection().doc(uid).get();
        if (!doc.exists) {
            return null;
        }

        return this.toEntity(doc.id, doc.data() ?? {});
    }

    async create(payload: SurveyPeriodWrite): Promise<SurveyPeriodEntity> {
        const ref = this.collection().doc();
        await ref.set(payload);
        return {
            uid: ref.id,
            ...payload,
        };
    }

    async update(uid: string, payload: SurveyPeriodUpdate): Promise<SurveyPeriodEntity | null> {
        const ref = this.collection().doc(uid);
        const existing = await ref.get();
        if (!existing.exists) {
            return null;
        }

        const safePayload = Object.fromEntries(
            Object.entries(payload).filter(([, value]) => value !== undefined),
        ) as SurveyPeriodUpdate;

        if (Object.keys(safePayload).length > 0) {
            await ref.update(safePayload);
        }

        const updated = await ref.get();
        if (!updated.exists) {
            return null;
        }

        return this.toEntity(updated.id, updated.data() ?? {});
    }

    async delete(uid: string): Promise<boolean> {
        const ref = this.collection().doc(uid);
        const existing = await ref.get();
        if (!existing.exists) {
            return false;
        }

        await ref.delete();
        return true;
    }

    async join(uid: string, volunteerUid: string): Promise<boolean> {
        const ref = this.collection().doc(uid);
        const existing = await ref.get();
        
        if (!existing.exists) {
            return false;
        }

        // Use arrayUnion to prevent race conditions when multiple volunteers join the same survey period simultaneously
        await ref.update({
            volunteerUids: FieldValue.arrayUnion(volunteerUid) 
        });
        return true;
    }

    private toEntity(uid: string, data: Record<string, unknown>): SurveyPeriodEntity {
        return {
            uid,
            name: String(data.name ?? ''),
            startDate: this.toDate(data.startDate),
            endDate: this.toDate(data.endDate),
            isFinished: Boolean(data.isFinished),
            minWalks: Number(data.minWalks ?? 0),
            // Error Handling, because there may be existing survey periods without volunteerUids field (previously created), or with invalid volunteerUids field. In such cases, we default to an empty array.
            volunteerUids: Array.isArray(data.volunteerUids) ? data.volunteerUids : [], 
        };
    }

    private toDate(value: unknown): Date {
        if (value && typeof value === 'object' && 'toDate' in (value as Record<string, unknown>)) {
            return (value as { toDate: () => Date }).toDate();
        }

        const parsed = new Date(String(value));
        return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
    }
}
