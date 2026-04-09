import { SurveyWalkEntity } from "../entities/surveyWalk.entity";
import { db } from "../lib/firebase-admin";
import { FIRESTORE_COLLECTIONS } from "../lib/firestore-collections";

type SurveyWalkWrite = Omit<SurveyWalkEntity, 'uid'>;
type SurveyWalkUpdate = Partial<SurveyWalkWrite>;

export class SurveyWalkRepository {
    private collection() {
        return db.collection(FIRESTORE_COLLECTIONS.SURVEYWALKS);
    }

    async findAll(): Promise<SurveyWalkEntity[]> {
        const snapshot = await this.collection().get();
        return snapshot.docs.map((doc) => this.toEntity(doc.id, doc.data()));
    }

    async findById(uid: string): Promise<SurveyWalkEntity | null> {
        const doc = await this.collection().doc(uid).get();
        if (!doc.exists) {
            return null;
        }

        return this.toEntity(doc.id, doc.data() ?? {});
    }

    async findBySurveyPeriodUid(surveyPeriodUid: string): Promise<SurveyWalkEntity[]> {
        const snapshot = await this.collection().where('surveyPeriodUid', '==', surveyPeriodUid).get();
        return snapshot.docs.map((doc) => this.toEntity(doc.id, doc.data()));
    }

    async findBySurveyPeriodUids(surveyPeriodUids: string[]): Promise<SurveyWalkEntity[]> {
        if (surveyPeriodUids.length === 0) {
            return [];
        }

        const snapshot = await this.collection().where('surveyPeriodUid', 'in', surveyPeriodUids).get();
        return snapshot.docs.map((doc) => this.toEntity(doc.id, doc.data()));
    }

    async create(payload: SurveyWalkWrite): Promise<SurveyWalkEntity> {
        const ref = this.collection().doc();
        await ref.set(payload);
        return {
            uid: ref.id,
            ...payload,
        };
    }

    async update(uid: string, payload: SurveyWalkUpdate): Promise<SurveyWalkEntity | null> {
        const ref = this.collection().doc(uid);
        const existing = await ref.get();
        if (!existing.exists) {
            return null;
        }

        const safePayload = Object.fromEntries(
            Object.entries(payload).filter(([, value]) => value !== undefined),
        ) as SurveyWalkUpdate;

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

    private toEntity(uid: string, data: Record<string, unknown>): SurveyWalkEntity {
        return {
            uid,
            surveyPeriodUid: String(data.surveyPeriodUid ?? ''),
            name: String(data.name ?? ''),
            date: this.toDate(data.date),
            startTime: String(data.startTime ?? ''),
            endTime: String(data.endTime ?? ''),
            capacity: Number(data.capacity ?? 0),
            isFinished: Boolean(data.isFinished),
            volunteerUids: Array.isArray(data.volunteerUids) ? data.volunteerUids.map((volunteerUid) => String(volunteerUid)) : [],
            attendeeUids: Array.isArray(data.attendeeUids) ? data.attendeeUids.map((attendeeUid) => String(attendeeUid)) : [],
            completedAt: data.completedAt ? this.toDate(data.completedAt) : null,
            leader: String(data.leader ?? ''),
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
