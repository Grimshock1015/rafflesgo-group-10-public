import { SurveyWalkEntity } from "../entities/surveyWalk.entity";
import { BadRequestError, NotFoundError } from "../lib/errors";
import { SurveyPeriodRepository } from "../repositories/surveyPeriod.repository";
import { SurveyWalkRepository } from "../repositories/surveyWalk.repository";

export type CreateSurveyWalkInput = Omit<SurveyWalkEntity, 'uid'>;
export type UpdateSurveyWalkInput = Partial<CreateSurveyWalkInput>;

export class SurveyWalkService {
    constructor(
        private surveyWalkRepository: SurveyWalkRepository,
        private surveyPeriodRepository: SurveyPeriodRepository,
    ) { }
    
    async getAllSurveyWalks(): Promise<SurveyWalkEntity[]> {
        return this.surveyWalkRepository.findAll();
    }

    async getSurveyWalksBySurveyPeriodUid(surveyPeriodUid: string): Promise<SurveyWalkEntity[]> {
        const surveyPeriod = await this.surveyPeriodRepository.findById(surveyPeriodUid);
        if (!surveyPeriod) {
            throw new NotFoundError('Survey period', surveyPeriodUid);
        }

        return this.surveyWalkRepository.findBySurveyPeriodUid(surveyPeriodUid);
    }

    async getSurveyWalksForJoinedPeriods(volunteerUid: string): Promise<SurveyWalkEntity[]> {
        const joinedPeriods = await this.surveyPeriodRepository.findByVolunteerUid(volunteerUid);
        const periodUids = joinedPeriods.map((period) => period.uid);

        if (periodUids.length === 0) {
            return [];
        }

        return this.surveyWalkRepository.findBySurveyPeriodUids(periodUids);
    }

    async getSurveyWalk(uid: string): Promise<SurveyWalkEntity> {
        const surveyWalk = await this.surveyWalkRepository.findById(uid);
        if (!surveyWalk) {
            throw new NotFoundError('Survey walk', uid);
        }

        return surveyWalk;
    }

    async createSurveyWalk(input: CreateSurveyWalkInput): Promise<SurveyWalkEntity> {
        await this.validateSurveyPeriodDate(input.surveyPeriodUid, input.date);
        return this.surveyWalkRepository.create(input);
    }

    async updateSurveyWalk(uid: string, input: UpdateSurveyWalkInput): Promise<SurveyWalkEntity> {
        const existing = await this.getSurveyWalk(uid);

        const nextSurveyPeriodUid = input.surveyPeriodUid ?? existing.surveyPeriodUid;
        const nextDate = input.date ?? existing.date;

        await this.validateSurveyPeriodDate(nextSurveyPeriodUid, nextDate);

        const updated = await this.surveyWalkRepository.update(uid, input);
        if (!updated) {
            throw new NotFoundError('Survey walk', uid);
        }

        return updated;
    }

    async deleteSurveyWalk(uid: string): Promise<{ success: true; uid: string }> {
        const deleted = await this.surveyWalkRepository.delete(uid);
        if (!deleted) {
            throw new NotFoundError('Survey walk', uid);
        }

        return { success: true, uid };
    }

    async joinSurveyWalk(uid: string, volunteerUid: string): Promise<SurveyWalkEntity> {
        const surveyWalk = await this.getSurveyWalk(uid);

        if (surveyWalk.volunteerUids.includes(volunteerUid)) {
            return surveyWalk;
        }

        if (surveyWalk.volunteerUids.length >= surveyWalk.capacity) {
            throw new BadRequestError('Survey walk is already at full capacity');
        }

        const leader = surveyWalk.leader || volunteerUid;
        const updated = await this.surveyWalkRepository.update(uid, {
            volunteerUids: [...surveyWalk.volunteerUids, volunteerUid],
            leader,
        });

        if (!updated) {
            throw new NotFoundError('Survey walk', uid);
        }

        return updated;
    }

    async quitSurveyWalk(uid: string, volunteerUid: string): Promise<SurveyWalkEntity> {
        const surveyWalk = await this.getSurveyWalk(uid);

        if (!surveyWalk.volunteerUids.includes(volunteerUid)) {
            throw new BadRequestError('Volunteer is not part of this survey walk');
        }

        const remainingVolunteers = surveyWalk.volunteerUids.filter((uidItem) => uidItem !== volunteerUid);

        let nextLeader = surveyWalk.leader;
        if (surveyWalk.leader === volunteerUid) {
            if (remainingVolunteers.length === 0) {
                nextLeader = '';
            } else {
                const randomIndex = Math.floor(Math.random() * remainingVolunteers.length);
                nextLeader = remainingVolunteers[randomIndex];
            }
        }

        const updated = await this.surveyWalkRepository.update(uid, {
            volunteerUids: remainingVolunteers,
            leader: nextLeader,
        });

        if (!updated) {
            throw new NotFoundError('Survey walk', uid);
        }

        return updated;
    }

    async reassignLeader(uid: string, requesterUid: string, newLeaderUid: string): Promise<SurveyWalkEntity> {
        const surveyWalk = await this.getSurveyWalk(uid);

        if (surveyWalk.leader !== requesterUid) {
            throw new BadRequestError('Only the current leader can reassign the leader');
        }

        if (!surveyWalk.volunteerUids.includes(newLeaderUid)) {
            throw new BadRequestError('newLeaderUid must be a volunteer in this survey walk');
        }

        const updated = await this.surveyWalkRepository.update(uid, {
            leader: newLeaderUid,
        });

        if (!updated) {
            throw new NotFoundError('Survey walk', uid);
        }

        return updated;
    }

    private async validateSurveyPeriodDate(surveyPeriodUid: string, date: Date): Promise<void> {
        const surveyPeriod = await this.surveyPeriodRepository.findById(surveyPeriodUid);
        if (!surveyPeriod) {
            throw new NotFoundError('Survey period', surveyPeriodUid);
        }

        if (date < surveyPeriod.startDate || date > surveyPeriod.endDate) {
            throw new BadRequestError('Date must be within the associated survey period date range');
        }
    }
}