import { SurveyWalkEntity } from "../entities/surveyWalk.entity";
import { BadRequestError, NotFoundError } from "../lib/errors";
import { SurveyPeriodRepository } from "../repositories/surveyPeriod.repository";
import { SurveyWalkRepository } from "../repositories/surveyWalk.repository";
import { InvitationService } from "./invitation.service";
import { WalkCompletionService } from "./walkCompletion.service";

export type CreateSurveyWalkInput = Omit<SurveyWalkEntity, 'uid'>;
export type UpdateSurveyWalkInput = Partial<CreateSurveyWalkInput>;
export type BulkCreateSurveyWalksInput = {
    surveyPeriodUid: string;
    namePrefix: string;
    weekdays: number[];
    timeSlots: Array<{
        label?: string;
        startTime: string;
        endTime: string;
    }>;
    capacity: number;
    skipExisting?: boolean;
};

export type BulkCreateSurveyWalksResult = {
    created: SurveyWalkEntity[];
    skipped: Array<{
        date: Date;
        startTime: string;
        endTime: string;
        reason: string;
        name: string;
    }>;
};

export class SurveyWalkService {
    constructor(
        private surveyWalkRepository: SurveyWalkRepository,
        private surveyPeriodRepository: SurveyPeriodRepository,
        private walkCompletionService: WalkCompletionService,
        private invitationService: InvitationService,
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

    async getSurveyWalksForJoinedPeriods(): Promise<SurveyWalkEntity[]> {
        const allPeriods = await this.surveyPeriodRepository.findAll();
        const activePeriodsUids = allPeriods.filter((period) => period.isActive).map((period) => period.uid);

        if (activePeriodsUids.length === 0) {
            return [];
        }

        return this.surveyWalkRepository.findBySurveyPeriodUids(activePeriodsUids);
    }

    async getSurveyWalk(uid: string): Promise<SurveyWalkEntity> {
        const surveyWalk = await this.surveyWalkRepository.findById(uid);
        if (!surveyWalk) {
            throw new NotFoundError('Survey walk', uid);
        }

        return surveyWalk;
    }

    async createSurveyWalk(input: CreateSurveyWalkInput): Promise<SurveyWalkEntity> {
        this.validateTimeRange(input.startTime, input.endTime);
        await this.validateSurveyPeriodDate(input.surveyPeriodUid, input.date);
        return this.surveyWalkRepository.create(input);
    }

    async bulkCreateSurveyWalks(input: BulkCreateSurveyWalksInput): Promise<BulkCreateSurveyWalksResult> {
        const surveyPeriod = await this.surveyPeriodRepository.findById(input.surveyPeriodUid);
        if (!surveyPeriod) {
            throw new NotFoundError('Survey period', input.surveyPeriodUid);
        }

        const weekdays = [...new Set(input.weekdays)];
        if (weekdays.length === 0) {
            throw new BadRequestError('At least one weekday must be selected');
        }

        weekdays.forEach((weekday) => {
            if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
                throw new BadRequestError('weekdays must be integers between 0 and 6');
            }
        });

        const trimmedNamePrefix = input.namePrefix.trim();
        if (!trimmedNamePrefix) {
            throw new BadRequestError('namePrefix must not be empty');
        }

        if (!Number.isInteger(input.capacity) || input.capacity < 1) {
            throw new BadRequestError('capacity must be a positive integer');
        }

        if (input.timeSlots.length === 0) {
            throw new BadRequestError('At least one time slot must be provided');
        }

        const normalizedSlots = input.timeSlots.map((slot) => {
            this.validateTimeRange(slot.startTime, slot.endTime);
            return {
                label: slot.label?.trim() || undefined,
                startTime: slot.startTime,
                endTime: slot.endTime,
            };
        });

        const existingWalks = await this.surveyWalkRepository.findBySurveyPeriodUid(input.surveyPeriodUid);
        const existingKeys = new Set(
            existingWalks.map((walk) => this.toWalkSlotKey(walk.date, walk.startTime, walk.endTime)),
        );

        const created: SurveyWalkEntity[] = [];
        const skipped: BulkCreateSurveyWalksResult['skipped'] = [];
        const cursor = this.toUtcMidnight(surveyPeriod.startDate);
        const end = this.toUtcMidnight(surveyPeriod.endDate);

        while (cursor.getTime() <= end.getTime()) {
            if (weekdays.includes(cursor.getUTCDay())) {
                for (const slot of normalizedSlots) {
                    const walkDate = new Date(cursor);
                    const name = this.buildBulkWalkName(trimmedNamePrefix, walkDate, slot.label, slot.startTime);
                    const key = this.toWalkSlotKey(walkDate, slot.startTime, slot.endTime);

                    if ((input.skipExisting ?? true) && existingKeys.has(key)) {
                        skipped.push({
                            date: walkDate,
                            startTime: slot.startTime,
                            endTime: slot.endTime,
                            reason: 'A walk already exists for this date and time',
                            name,
                        });
                        continue;
                    }

                    const createdWalk = await this.surveyWalkRepository.create({
                        surveyPeriodUid: input.surveyPeriodUid,
                        name,
                        date: walkDate,
                        startTime: slot.startTime,
                        endTime: slot.endTime,
                        capacity: input.capacity,
                        isFinished: false,
                        volunteerUids: [],
                        attendeeUids: [],
                        completedAt: null,
                        leader: '',
                    });
                    created.push(createdWalk);
                    existingKeys.add(key);
                }
            }

            cursor.setUTCDate(cursor.getUTCDate() + 1);
        }

        return { created, skipped };
    }

    async updateSurveyWalk(uid: string, input: UpdateSurveyWalkInput): Promise<SurveyWalkEntity> {
        const existing = await this.getSurveyWalk(uid);

        const nextSurveyPeriodUid = input.surveyPeriodUid ?? existing.surveyPeriodUid;
        const nextDate = input.date ?? existing.date;
        const nextStartTime = input.startTime ?? existing.startTime;
        const nextEndTime = input.endTime ?? existing.endTime;
        const nextVolunteerUids = this.normalizeUids(input.volunteerUids ?? existing.volunteerUids);
        const nextCapacity = input.capacity ?? existing.capacity;
        const nextIsFinished = input.isFinished ?? existing.isFinished;

        this.validateTimeRange(nextStartTime, nextEndTime);
        await this.validateSurveyPeriodDate(nextSurveyPeriodUid, nextDate);
        this.validateCapacity(nextCapacity, nextVolunteerUids);

        const nextLeader = this.resolveLeader(nextVolunteerUids, input.leader ?? existing.leader);
        const attendanceUpdate = this.resolveAttendance({
            existing,
            attendeeUids: input.attendeeUids,
            completedAt: input.completedAt,
            isFinished: nextIsFinished,
            volunteerUids: nextVolunteerUids,
        });

        const updated = await this.surveyWalkRepository.update(uid, {
            ...input,
            volunteerUids: nextVolunteerUids,
            capacity: nextCapacity,
            leader: nextLeader,
            ...attendanceUpdate,
        });
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

        if (surveyWalk.isFinished) {
            throw new BadRequestError('Cannot join a survey walk that has been marked complete');
        }

        // Check if the survey period is finished
        const surveyPeriod = await this.surveyPeriodRepository.findById(surveyWalk.surveyPeriodUid);
        if (!surveyPeriod) {
            throw new NotFoundError('Survey period', surveyWalk.surveyPeriodUid);
        }
        if (surveyPeriod.isFinished) {
            throw new BadRequestError('Cannot join a survey walk from a finished survey period');
        }

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

        if (surveyWalk.isFinished) {
            throw new BadRequestError('Cannot quit a survey walk that has been marked complete');
        }

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

    async completeSurveyWalk(
        uid: string,
        requesterUid: string,
        attendeeUids: string[],
        isAdmin: boolean,
    ): Promise<SurveyWalkEntity> {
        const surveyWalk = await this.getSurveyWalk(uid);

        if (!isAdmin && surveyWalk.leader !== requesterUid) {
            throw new BadRequestError('Only the survey walk leader can mark attendance');
        }

        const normalizedAttendeeUids = [...new Set(attendeeUids)];
        const invalidAttendeeUids = normalizedAttendeeUids.filter(
            (attendeeUid) => !surveyWalk.volunteerUids.includes(attendeeUid),
        );

        if (invalidAttendeeUids.length > 0) {
            throw new BadRequestError('Attendance can only be recorded for registered volunteers');
        }

        const updated = await this.surveyWalkRepository.update(uid, {
            isFinished: true,
            attendeeUids: normalizedAttendeeUids,
            completedAt: new Date(),
        });

        if (!updated) {
            throw new NotFoundError('Survey walk', uid);
        }

        // Send attendance emails in the background — don't block the response if it fails
        this.walkCompletionService.sendAttendanceEmails(updated).catch((err) => {
            console.error(`[SurveyWalkService] Failed to send attendance emails for walk "${updated.name}":`, err);
        });

        return updated;
    }

    async reassignLeader(uid: string, requesterUid: string, newLeaderUid: string): Promise<SurveyWalkEntity> {
        await this.invitationService.sendLeaderInvitation(uid, requesterUid, newLeaderUid);
        return this.getSurveyWalk(uid);
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

    private validateTimeRange(startTime: string, endTime: string): void {
        // Times are in HH:mm format, so lexicographic comparison is valid.
        if (startTime >= endTime) {
            throw new BadRequestError('startTime must be before endTime');
        }
    }

    private validateCapacity(capacity: number, volunteerUids: string[]): void {
        if (capacity < volunteerUids.length) {
            throw new BadRequestError('capacity cannot be smaller than the number of registered volunteers');
        }
    }

    private normalizeUids(uids: string[]): string[] {
        return [...new Set(uids)];
    }

    private resolveLeader(volunteerUids: string[], requestedLeader: string): string {
        if (volunteerUids.length === 0) {
            return '';
        }

        if (requestedLeader && volunteerUids.includes(requestedLeader)) {
            return requestedLeader;
        }

        return volunteerUids[0];
    }

    private resolveAttendance({
        existing,
        attendeeUids,
        completedAt,
        isFinished,
        volunteerUids,
    }: {
        existing: SurveyWalkEntity;
        attendeeUids: string[] | undefined;
        completedAt: Date | null | undefined;
        isFinished: boolean;
        volunteerUids: string[];
    }): Pick<SurveyWalkEntity, 'attendeeUids' | 'completedAt' | 'isFinished'> {
        if (!isFinished) {
            return {
                isFinished: false,
                attendeeUids: [],
                completedAt: null,
            };
        }

        const nextAttendeeUids = this.normalizeUids(attendeeUids ?? existing.attendeeUids);
        const invalidAttendeeUids = nextAttendeeUids.filter((attendeeUid) => !volunteerUids.includes(attendeeUid));

        if (invalidAttendeeUids.length > 0) {
            throw new BadRequestError('Attendance can only be recorded for registered volunteers');
        }

        return {
            isFinished: true,
            attendeeUids: nextAttendeeUids,
            completedAt: completedAt ?? existing.completedAt ?? new Date(),
        };
    }

    private toUtcMidnight(value: Date): Date {
        return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
    }

    private toWalkSlotKey(date: Date, startTime: string, endTime: string): string {
        return `${this.toUtcMidnight(date).toISOString()}|${startTime}|${endTime}`;
    }

    private buildBulkWalkName(namePrefix: string, date: Date, label: string | undefined, startTime: string): string {
        const formattedDate = date.toLocaleDateString('en-SG', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            timeZone: 'UTC',
        });

        return label
            ? `${namePrefix} - ${formattedDate} ${label}`
            : `${namePrefix} - ${formattedDate} ${startTime}`;
    }
}
