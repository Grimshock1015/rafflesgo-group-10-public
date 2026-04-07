export interface SurveyPeriodEntity {
    uid: string;
    name: string;
    startDate: Date;
    endDate: Date;
    isFinished: boolean;
    isActive: boolean;
    minWalks: number;
}
