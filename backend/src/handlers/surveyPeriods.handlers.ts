import { FastifyRequestTypeBox, FastifyReplyTypeBox } from '../types/fastify';
import { ListSurveyPeriodsResponseSchema } from '../schemas/surveyPeriod.schema';
import { db } from '../lib/firebase-admin';
import { FIRESTORE_COLLECTIONS } from '../lib/firestore-collections';

const ListSurveyPeriodsSchema = {
    response: {
        200: ListSurveyPeriodsResponseSchema,
    },
};

export async function listSurveyPeriodsHandler(
    _request: FastifyRequestTypeBox<typeof ListSurveyPeriodsSchema>,
    _reply: FastifyReplyTypeBox<typeof ListSurveyPeriodsSchema>
) {
    const snapshot = await db.collection(FIRESTORE_COLLECTIONS.SURVEYPERIODS).get();

    const surveyPeriods = snapshot.docs.map((doc) => {
        const data = doc.data();
        const startDateValue = data.startDate;
        const endDateValue = data.endDate;

        return {
            uid: doc.id,
            name: String(data.name ?? ''),
            startDate: startDateValue?.toDate?.() ?? new Date(startDateValue),
            endDate: endDateValue?.toDate?.() ?? new Date(endDateValue),
            isFinished: Boolean(data.isFinished),
            minWalks: Number(data.minWalks ?? 0),
        };
    });

    return { surveyPeriods };
}