import { Type, Static } from '@sinclair/typebox';

export const surveyWalkSchema = Type.Object({
    uid: Type.String(),
    surveyPeriodUid: Type.String(),
    name: Type.String(),
    date: Type.String({ format: 'date-time' }),
    isFinished: Type.Boolean(),
    volunteerUids: Type.Array(Type.String()),
    leader: Type.String()
});

export const SurveyWalkParamsSchema = Type.Object({
    uid: Type.String(),
});

export const SurveyWalkBySurveyPeriodParamsSchema = Type.Object({
    surveyPeriodUid: Type.String(),
});

export const ListSurveyWalksResponseSchema = Type.Object({
    surveyWalks: Type.Array(surveyWalkSchema),
});

export const CreateSurveyWalkBodySchema = Type.Object({
    surveyPeriodUid: Type.String({ minLength: 1 }),
    name: Type.String({ minLength: 1 }),
    date: Type.String({ format: 'date-time' }),
    isFinished: Type.Optional(Type.Boolean()),
    leader: Type.Optional(Type.String()),
});

export const UpdateSurveyWalkBodySchema = Type.Partial(CreateSurveyWalkBodySchema);

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

export const ReassignLeaderResponseSchema = Type.Object({
    success: Type.Boolean(),
    surveyWalk: surveyWalkSchema,
});

export type SurveyWalk = Static<typeof surveyWalkSchema>;
export type SurveyWalkParams = Static<typeof SurveyWalkParamsSchema>;
export type SurveyWalkBySurveyPeriodParams = Static<typeof SurveyWalkBySurveyPeriodParamsSchema>;
export type CreateSurveyWalkBody = Static<typeof CreateSurveyWalkBodySchema>;
export type UpdateSurveyWalkBody = Static<typeof UpdateSurveyWalkBodySchema>;
export type ListSurveyWalksResponse = Static<typeof ListSurveyWalksResponseSchema>;
export type DeleteSurveyWalkResponse = Static<typeof DeleteSurveyWalkResponseSchema>;
export type JoinQuitSurveyWalkResponse = Static<typeof JoinQuitSurveyWalkResponseSchema>;
export type ReassignLeaderBody = Static<typeof ReassignLeaderBodySchema>;
export type ReassignLeaderResponse = Static<typeof ReassignLeaderResponseSchema>;