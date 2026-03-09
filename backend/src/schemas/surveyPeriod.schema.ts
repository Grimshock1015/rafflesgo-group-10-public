import { Type, Static } from '@sinclair/typebox';

export const surveyPeriodSchema = Type.Object({
    uid: Type.String(),
    name: Type.String(),
    startDate: Type.String({ format: 'date-time' }),
    endDate: Type.String({ format: 'date-time' }),
    isFinished: Type.Boolean(),
    minWalks: Type.Integer()
})

export const ListSurveyPeriodsResponseSchema = Type.Object({
    surveyPeriods: Type.Array(surveyPeriodSchema),
});

export type SurveyPeriod = Static<typeof surveyPeriodSchema>
export type ListSurveyPeriods = Static<typeof ListSurveyPeriodsResponseSchema>