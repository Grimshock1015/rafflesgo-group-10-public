import { Type, Static } from '@sinclair/typebox';

export const surveyPeriodSchema = Type.Object({
    uid: Type.String(),
    name: Type.String(),
    startDate: Type.String({ format: 'date-time' }),
    endDate: Type.String({ format: 'date-time' }),
    isFinished: Type.Boolean(),
    isActive: Type.Boolean(),
    minWalks: Type.Integer(),
});

export const SurveyPeriodParamsSchema = Type.Object({
    uid: Type.String(),
});

export const CreateSurveyPeriodBodySchema = Type.Object({
    name: Type.String({ minLength: 1 }),
    startDate: Type.String({ format: 'date-time' }),
    endDate: Type.String({ format: 'date-time' }),
    isFinished: Type.Boolean(),
    isActive: Type.Optional(Type.Boolean()),
    minWalks: Type.Integer({ minimum: 0 }),
});

export const UpdateSurveyPeriodBodySchema = Type.Partial(CreateSurveyPeriodBodySchema);

export const ListSurveyPeriodsResponseSchema = Type.Object({
    surveyPeriods: Type.Array(surveyPeriodSchema),
});

export const ListSurveyPeriodsQuerySchema = Type.Object({
    limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 500 })),
});

export const DeleteSurveyPeriodResponseSchema = Type.Object({
    success: Type.Boolean(),
    uid: Type.String(),
});



export type SurveyPeriod = Static<typeof surveyPeriodSchema>
export type SurveyPeriodParams = Static<typeof SurveyPeriodParamsSchema>;
export type CreateSurveyPeriodBody = Static<typeof CreateSurveyPeriodBodySchema>;
export type UpdateSurveyPeriodBody = Static<typeof UpdateSurveyPeriodBodySchema>;
export type ListSurveyPeriods = Static<typeof ListSurveyPeriodsResponseSchema>;
export type DeleteSurveyPeriodResponse = Static<typeof DeleteSurveyPeriodResponseSchema>;

// Lightweight active period info accessible by volunteers (no admin required)
export const ActiveSurveyPeriodResponseSchema = Type.Union([
    Type.Object({
        uid: Type.String(),
        name: Type.String(),
        minWalks: Type.Integer(),
    }),
    Type.Null(),
]);

export type ActiveSurveyPeriodResponse = Static<typeof ActiveSurveyPeriodResponseSchema>;