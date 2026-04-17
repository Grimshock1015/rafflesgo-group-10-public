import { InvitationEntity } from '../entities/invitation.entity';
import { db } from '../lib/firebase-admin';
import { FIRESTORE_COLLECTIONS } from '../lib/firestore-collections';

type InvitationWrite = Omit<InvitationEntity, 'uid'>;
type InvitationUpdate = Partial<Pick<InvitationEntity, 'status'>>;

export class InvitationRepository {
    private collection() {
        return db.collection(FIRESTORE_COLLECTIONS.INVITATIONS);
    }

    async create(payload: InvitationWrite): Promise<InvitationEntity> {
        const ref = this.collection().doc();
        await ref.set({
            ...payload,
            createdAt: payload.createdAt,
        });
        return { uid: ref.id, ...payload };
    }

    async findById(uid: string): Promise<InvitationEntity | null> {
        const doc = await this.collection().doc(uid).get();
        if (!doc.exists) return null;
        return this.toEntity(doc.id, doc.data() ?? {});
    }

    async findBySurveyWalkUid(surveyWalkUid: string): Promise<InvitationEntity[]> {
        const snapshot = await this.collection()
            .where('surveyWalkUid', '==', surveyWalkUid)
            .get();
        return snapshot.docs.map((doc) => this.toEntity(doc.id, doc.data()));
    }

    async findByInviteeEmail(email: string): Promise<InvitationEntity[]> {
        const snapshot = await this.collection()
            .where('inviteeEmail', '==', email)
            .get();
        return snapshot.docs.map((doc) => this.toEntity(doc.id, doc.data()));
    }

    async findPendingByWalkAndEmail(surveyWalkUid: string, inviteeEmail: string): Promise<InvitationEntity | null> {
        const snapshot = await this.collection()
            .where('surveyWalkUid', '==', surveyWalkUid)
            .where('inviteeEmail', '==', inviteeEmail)
            .where('status', '==', 'pending')
            .get();
        if (snapshot.empty) return null;
        const doc = snapshot.docs[0];
        return this.toEntity(doc.id, doc.data());
    }

    async update(uid: string, payload: InvitationUpdate): Promise<InvitationEntity | null> {
        const ref = this.collection().doc(uid);
        const existing = await ref.get();
        if (!existing.exists) return null;
        await ref.update(payload as Record<string, unknown>);
        const updated = await ref.get();
        if (!updated.exists) return null;
        return this.toEntity(updated.id, updated.data() ?? {});
    }

    async deleteBySurveyWalkUid(surveyWalkUid: string): Promise<number> {
        const snapshot = await this.collection()
            .where('surveyWalkUid', '==', surveyWalkUid)
            .get();

        if (snapshot.empty) {
            return 0;
        }

        const batch = db.batch();
        snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });
        await batch.commit();

        return snapshot.size;
    }

    private toEntity(uid: string, data: Record<string, unknown>): InvitationEntity {
        return {
            uid,
            surveyWalkUid: String(data.surveyWalkUid ?? ''),
            inviterUid: String(data.inviterUid ?? ''),
            inviteeEmail: String(data.inviteeEmail ?? ''),
            type: (data.type as InvitationEntity['type']) ?? 'walk_invitation',
            proposedLeaderUid: data.proposedLeaderUid ? String(data.proposedLeaderUid) : undefined,
            status: (data.status as InvitationEntity['status']) ?? 'pending',
            createdAt: this.toDate(data.createdAt),
        };
    }

    private toDate(value: unknown): Date {
        if (value && typeof value === 'object' && 'toDate' in (value as Record<string, unknown>)) {
            return (value as { toDate: () => Date }).toDate();
        }
        const parsed = new Date(String(value));
        return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
    }
}
