export interface SurveyWalkEntity {
    uid: string;
    surveyPeriodUid: string;
    name: string;
    date: Date;
    startTime: string;
    endTime: string;
    capacity: number;
    isFinished: boolean;
    volunteerUids: string[];
    leader: string;
}