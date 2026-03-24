export interface SurveyWalkEntity {
    uid: string;
    surveyPeriodUid: string;
    name: string;
    date: Date;
    isFinished: boolean;
    volunteerUids: string[];
    leader: string;
}