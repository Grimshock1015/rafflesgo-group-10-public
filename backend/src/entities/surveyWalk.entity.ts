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
    attendeeUids: string[];
    completedAt: Date | null;
    leader: string;
}
