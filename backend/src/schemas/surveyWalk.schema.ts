import { Type, Static } from '@sinclair/typebox';

const volunteerSchema = Type.Object({
    uid: Type.String(),
    name: Type.String(),
    photoURL: Type.Optional(Type.String()),
});

const leaderSchema = Type.Object({
    uid: Type.String(),
    name: Type.String(),
    photoURL: Type.Optional(Type.String()),
});

export const surveyWalkSchema = Type.Object({
    uid: Type.String(),
    surveyPeriodUid: Type.String(),
    surveyPeriodName: Type.String(),
    name: Type.String(),
    date: Type.String({ format: 'date-time' }),
    startTime: Type.String({ pattern: '^([0-1][0-9]|2[0-3]):[0-5][0-9]$' }),
    endTime: Type.String({ pattern: '^([0-1][0-9]|2[0-3]):[0-5][0-9]$' }),
    capacity: Type.Integer({ minimum: 1 }),
    isFinished: Type.Boolean(),
    completedAt: Type.Union([Type.String({ format: 'date-time' }), Type.Null()]),
    volunteerUids: Type.Array(Type.String()),
    attendeeUids: Type.Array(Type.String()),
    volunteers: Type.Array(volunteerSchema),
    attendees: Type.Array(volunteerSchema),
    noShows: Type.Array(volunteerSchema),
    leader: leaderSchema
});

export const SurveyWalkParamsSchema = Type.Object({
    uid: Type.String(),
});

export const SurveyWalkBySurveyPeriodParamsSchema = Type.Object({
    surveyPeriodUid: Type.String(),
});

export const ListSurveyWalksQuerySchema = Type.Object({
    limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 500 })),
});

export const ListSurveyWalksResponseSchema = Type.Object({
    surveyWalks: Type.Array(surveyWalkSchema),
});

export const CreateSurveyWalkBodySchema = Type.Object({
    surveyPeriodUid: Type.String({ minLength: 1 }),
    name: Type.String({ minLength: 1 }),
    date: Type.String({ format: 'date-time' }),
    startTime: Type.String({ pattern: '^([0-1][0-9]|2[0-3]):[0-5][0-9]$' }),
    endTime: Type.String({ pattern: '^([0-1][0-9]|2[0-3]):[0-5][0-9]$' }),
    capacity: Type.Integer({ minimum: 1 }),
    isFinished: Type.Optional(Type.Boolean()),
    leader: Type.Optional(Type.String()),
});

export const BulkSurveyWalkTimeSlotSchema = Type.Object({
    label: Type.Optional(Type.String({ minLength: 1 })),
    startTime: Type.String({ pattern: '^([0-1][0-9]|2[0-3]):[0-5][0-9]$' }),
    endTime: Type.String({ pattern: '^([0-1][0-9]|2[0-3]):[0-5][0-9]$' }),
});

export const BulkCreateSurveyWalksBodySchema = Type.Object({
    namePrefix: Type.String({ minLength: 1 }),
    weekdays: Type.Array(Type.Integer({ minimum: 0, maximum: 6 }), { minItems: 1 }),
    timeSlots: Type.Array(BulkSurveyWalkTimeSlotSchema, { minItems: 1 }),
    capacity: Type.Integer({ minimum: 1 }),
    skipExisting: Type.Optional(Type.Boolean()),
});

export const BulkCreateSurveyWalksResponseSchema = Type.Object({
    success: Type.Boolean(),
    createdCount: Type.Integer({ minimum: 0 }),
    skippedCount: Type.Integer({ minimum: 0 }),
    surveyWalks: Type.Array(surveyWalkSchema),
    skipped: Type.Array(Type.Object({
        date: Type.String({ format: 'date-time' }),
        startTime: Type.String({ pattern: '^([0-1][0-9]|2[0-3]):[0-5][0-9]$' }),
        endTime: Type.String({ pattern: '^([0-1][0-9]|2[0-3]):[0-5][0-9]$' }),
        reason: Type.String(),
        name: Type.String(),
    })),
});

export const UpdateSurveyWalkBodySchema = Type.Partial(CreateSurveyWalkBodySchema);
export const AdminUpdateSurveyWalkBodySchema = Type.Partial(Type.Object({
    surveyPeriodUid: Type.String({ minLength: 1 }),
    name: Type.String({ minLength: 1 }),
    date: Type.String({ format: 'date-time' }),
    startTime: Type.String({ pattern: '^([0-1][0-9]|2[0-3]):[0-5][0-9]$' }),
    endTime: Type.String({ pattern: '^([0-1][0-9]|2[0-3]):[0-5][0-9]$' }),
    capacity: Type.Integer({ minimum: 1 }),
    isFinished: Type.Boolean(),
    volunteerUids: Type.Array(Type.String()),
    attendeeUids: Type.Array(Type.String()),
    completedAt: Type.Union([Type.String({ format: 'date-time' }), Type.Null()]),
    leader: Type.String(),
}));

export const DeleteSurveyWalkResponseSchema = Type.Object({
    success: Type.Boolean(),
    uid: Type.String(),
});

export const JoinQuitSurveyWalkResponseSchema = Type.Object({
    success: Type.Boolean(),
    surveyWalk: surveyWalkSchema,
});

export const ReassignLeaderBodySchema = Type.Object({
    newLeaderUid: Type.String({ minLength: 1 }),
});

export const CompleteSurveyWalkBodySchema = Type.Object({
    attendeeUids: Type.Array(Type.String()),
});

export const ReassignLeaderResponseSchema = Type.Object({
    success: Type.Boolean(),
    surveyWalk: surveyWalkSchema,
});

export const CompleteSurveyWalkResponseSchema = Type.Object({
    success: Type.Boolean(),
    surveyWalk: surveyWalkSchema,
});

export type SurveyWalk = Static<typeof surveyWalkSchema>;
export type SurveyWalkParams = Static<typeof SurveyWalkParamsSchema>;
export type SurveyWalkBySurveyPeriodParams = Static<typeof SurveyWalkBySurveyPeriodParamsSchema>;
export type CreateSurveyWalkBody = Static<typeof CreateSurveyWalkBodySchema>;
export type BulkSurveyWalkTimeSlot = Static<typeof BulkSurveyWalkTimeSlotSchema>;
export type BulkCreateSurveyWalksBody = Static<typeof BulkCreateSurveyWalksBodySchema>;
export type UpdateSurveyWalkBody = Static<typeof UpdateSurveyWalkBodySchema>;
export type ListSurveyWalksResponse = Static<typeof ListSurveyWalksResponseSchema>;
export type BulkCreateSurveyWalksResponse = Static<typeof BulkCreateSurveyWalksResponseSchema>;
export type DeleteSurveyWalkResponse = Static<typeof DeleteSurveyWalkResponseSchema>;
export type JoinQuitSurveyWalkResponse = Static<typeof JoinQuitSurveyWalkResponseSchema>;
export type ReassignLeaderBody = Static<typeof ReassignLeaderBodySchema>;
export type ReassignLeaderResponse = Static<typeof ReassignLeaderResponseSchema>;
export type CompleteSurveyWalkBody = Static<typeof CompleteSurveyWalkBodySchema>;
export type CompleteSurveyWalkResponse = Static<typeof CompleteSurveyWalkResponseSchema>;
