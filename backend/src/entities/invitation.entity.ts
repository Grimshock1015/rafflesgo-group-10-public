export interface InvitationEntity {
    uid: string;
    surveyWalkUid: string;
    inviterUid: string;
    inviteeEmail: string;
    status: 'pending' | 'accepted' | 'declined';
    createdAt: Date;
}