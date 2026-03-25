import { BadRequestError, NotFoundError } from '../lib/errors';
import { SurveyPeriodRepository } from '../repositories/surveyPeriod.repository';
import { SurveyPeriodEntity } from '../entities/surveyPeriod.entity';

export type CreateSurveyPeriodInput = Omit<SurveyPeriodEntity, 'uid'>;

export type UpdateSurveyPeriodInput = Partial<CreateSurveyPeriodInput>;

export class SurveyPeriodService {
    constructor(private surveyPeriodRepository: SurveyPeriodRepository) { }

    async getAllSurveyPeriods(): Promise<SurveyPeriodEntity[]> {
        return this.surveyPeriodRepository.findAll();
    }

    async getSurveyPeriod(uid: string): Promise<SurveyPeriodEntity> {
        const surveyPeriod = await this.surveyPeriodRepository.findById(uid);
        if (!surveyPeriod) {
            throw new NotFoundError('Survey period', uid);
        }

        return surveyPeriod;
    }

    async createSurveyPeriod(input: CreateSurveyPeriodInput): Promise<SurveyPeriodEntity> {
        this.validateDates(input.startDate, input.endDate);
        this.validateMinWalks(input.minWalks);

        return this.surveyPeriodRepository.create(input);
    }

    async updateSurveyPeriod(uid: string, input: UpdateSurveyPeriodInput): Promise<SurveyPeriodEntity> {
        const existing = await this.getSurveyPeriod(uid);

        const nextStartDate = input.startDate ?? existing.startDate;
        const nextEndDate = input.endDate ?? existing.endDate;

        this.validateDates(nextStartDate, nextEndDate);

        if (input.minWalks !== undefined) {
            this.validateMinWalks(input.minWalks);
        }

        const updated = await this.surveyPeriodRepository.update(uid, input);
        if (!updated) {
            throw new NotFoundError('Survey period', uid);
        }

        return updated;
    }

    async deleteSurveyPeriod(uid: string): Promise<{ success: true; uid: string }> {
        const deleted = await this.surveyPeriodRepository.delete(uid);
        if (!deleted) {
            throw new NotFoundError('Survey period', uid);
        }

        return { success: true, uid };
    }

    async joinSurveyPeriod(uid: string, volunteerUid: string): Promise<boolean> {
        // Check if the survey period exists before attempting to join
        await this.getSurveyPeriod(uid);

        const joined = await this.surveyPeriodRepository.join(uid, volunteerUid);
        
        if (!joined) {
            throw new NotFoundError('Fail to join Survey Period', uid);
        }

        return true;
    }

    async unjoinSurveyPeriod(uid: string, volunteerUid: string): Promise<boolean> {
        await this.getSurveyPeriod(uid);

        const unjoined = await this.surveyPeriodRepository.unjoin(uid, volunteerUid);
        
        if (!unjoined) {
            throw new NotFoundError('Fail to unjoin Survey Period', uid);
        }

        return true;
    }

    private validateDates(startDate: Date, endDate: Date): void {
        if (endDate < startDate) {
            throw new BadRequestError('endDate must be greater than or equal to startDate');
        }
    }

    private validateMinWalks(minWalks: number): void {
        if (!Number.isInteger(minWalks) || minWalks < 0) {
            throw new BadRequestError('minWalks must be a non-negative integer');
        }
    }
}
