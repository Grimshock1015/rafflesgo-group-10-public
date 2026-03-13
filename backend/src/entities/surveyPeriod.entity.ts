export interface SurveyPeriodEntity {
    uid: string;
    name: string;
    startDate: Date;
    endDate: Date;
    isFinished: boolean;
    minWalks: number;
    volunteerUids: string[];
}
