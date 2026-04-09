import { getContainer } from "../container";
import { SurveyWalkEntity } from "../entities/surveyWalk.entity";
import { BadRequestError } from "../lib/errors";
import { auth } from "../lib/firebase-admin";
import {
    CompleteSurveyWalkBodySchema,
    CompleteSurveyWalkResponseSchema,
    CreateSurveyWalkBodySchema,
    DeleteSurveyWalkResponseSchema,
    JoinQuitSurveyWalkResponseSchema,
    ListSurveyWalksResponseSchema,
    ReassignLeaderBodySchema,
    ReassignLeaderResponseSchema,
    SurveyWalkBySurveyPeriodParamsSchema,
    SurveyWalkParamsSchema,
    UpdateSurveyWalkBodySchema,
    surveyWalkSchema,
} from "../schemas/surveyWalk.schema";
import { FastifyReplyTypeBox, FastifyRequestTypeBox } from "../types/fastify";

const ListSurveyWalksSchema = {
    response: {
        200: ListSurveyWalksResponseSchema,
    },
};

const GetSurveyWalkSchema = {
    params: SurveyWalkParamsSchema,
    response: {
        200: surveyWalkSchema,
    },
};

const ListSurveyWalksBySurveyPeriodSchema = {
    params: SurveyWalkBySurveyPeriodParamsSchema,
    response: {
        200: ListSurveyWalksResponseSchema,
    },
};

const CreateSurveyWalkSchema = {
    body: CreateSurveyWalkBodySchema,
    response: {
        201: surveyWalkSchema,
    },
};

const UpdateSurveyWalkSchema = {
    params: SurveyWalkParamsSchema,
    body: UpdateSurveyWalkBodySchema,
    response: {
        200: surveyWalkSchema,
    },
};

const DeleteSurveyWalkSchema = {
    params: SurveyWalkParamsSchema,
    response: {
        200: DeleteSurveyWalkResponseSchema,
    },
};

const JoinQuitSurveyWalkSchema = {
    params: SurveyWalkParamsSchema,
    response: {
        200: JoinQuitSurveyWalkResponseSchema,
    },
};

const ReassignLeaderSchema = {
    params: SurveyWalkParamsSchema,
    body: ReassignLeaderBodySchema,
    response: {
        200: ReassignLeaderResponseSchema,
    },
};

const CompleteSurveyWalkSchema = {
    params: SurveyWalkParamsSchema,
    body: CompleteSurveyWalkBodySchema,
    response: {
        200: CompleteSurveyWalkResponseSchema,
    },
};

type UserSummary = {
    uid: string;
    name: string;
    photoURL?: string;
};

function toDto(surveyWalk: SurveyWalkEntity, surveyPeriodName: string, volunteersData: UserSummary[], leaderData?: UserSummary) {
    const attendees = volunteersData.filter((volunteer) => surveyWalk.attendeeUids.includes(volunteer.uid));
    const noShows = volunteersData.filter((volunteer) => !surveyWalk.attendeeUids.includes(volunteer.uid));

    return {
        uid: surveyWalk.uid,
        surveyPeriodUid: surveyWalk.surveyPeriodUid,
        surveyPeriodName,
        name: surveyWalk.name,
        date: surveyWalk.date.toISOString(),
        startTime: surveyWalk.startTime,
        endTime: surveyWalk.endTime,
        capacity: surveyWalk.capacity,
        isFinished: surveyWalk.isFinished,
        completedAt: surveyWalk.completedAt ? surveyWalk.completedAt.toISOString() : null,
        volunteerUids: surveyWalk.volunteerUids,
        attendeeUids: surveyWalk.attendeeUids,
        volunteers: volunteersData,
        attendees,
        noShows,
        leader: leaderData || { uid: "", name: "" },
    };
}

function parseDateString(value: string): Date {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        throw new BadRequestError('date must be a valid date-time');
    }
    return parsed;
}

async function getUserSummary(uid: string): Promise<UserSummary | undefined> {
    if (!uid) {
        return undefined;
    }

    try {
        const user = await auth.getUser(uid);
        return {
            uid,
            name: user.displayName || user.email || "",
            photoURL: user.photoURL || undefined,
        };
    } catch {
        return undefined;
    }
}

async function getVolunteersData(volunteerUids: string[]): Promise<UserSummary[]> {
    const volunteersData = await Promise.all(
        volunteerUids.map(async (uid) => (await getUserSummary(uid)) || {
            uid,
            name: "",
        })
    );
    return volunteersData;
}

async function getLeaderData(leaderUid: string): Promise<UserSummary | undefined> {
    if (!leaderUid) {
        return undefined;
    }
    return (await getUserSummary(leaderUid)) || {
        uid: leaderUid,
        name: "",
    };
}

async function getSurveyPeriodName(surveyPeriodUid: string): Promise<string> {
    const { surveyPeriodRepository } = getContainer();
    const surveyPeriod = await surveyPeriodRepository.findById(surveyPeriodUid);
    return surveyPeriod?.name || 'Unknown';
}

export async function listSurveyWalksHandler(
    _request: FastifyRequestTypeBox<typeof ListSurveyWalksSchema>,
    _reply: FastifyReplyTypeBox<typeof ListSurveyWalksSchema>
) {
    const { surveyWalkService } = getContainer();
    const surveyWalks = await surveyWalkService.getAllSurveyWalks();
    const enrichedWalks = await Promise.all(
        surveyWalks.map(async (walk) => {
            const periodName = await getSurveyPeriodName(walk.surveyPeriodUid);
            const volunteersData = await getVolunteersData(walk.volunteerUids);
            const leaderData = await getLeaderData(walk.leader);
            return toDto(walk, periodName, volunteersData, leaderData);
        })
    );
    return { surveyWalks: enrichedWalks };
}

export async function getSurveyWalkHandler(
    request: FastifyRequestTypeBox<typeof GetSurveyWalkSchema>,
    _reply: FastifyReplyTypeBox<typeof GetSurveyWalkSchema>
) {
    const { surveyWalkService } = getContainer();
    const surveyWalk = await surveyWalkService.getSurveyWalk(request.params.uid);
    const periodName = await getSurveyPeriodName(surveyWalk.surveyPeriodUid);
    const volunteersData = await getVolunteersData(surveyWalk.volunteerUids);
    const leaderData = await getLeaderData(surveyWalk.leader);
    return toDto(surveyWalk, periodName, volunteersData, leaderData);
}

export async function listSurveyWalksBySurveyPeriodHandler(
    request: FastifyRequestTypeBox<typeof ListSurveyWalksBySurveyPeriodSchema>,
    _reply: FastifyReplyTypeBox<typeof ListSurveyWalksBySurveyPeriodSchema>
) {
    const { surveyWalkService } = getContainer();
    const surveyWalks = await surveyWalkService.getSurveyWalksBySurveyPeriodUid(request.params.surveyPeriodUid);
    const periodName = await getSurveyPeriodName(request.params.surveyPeriodUid);
    const enrichedWalks = await Promise.all(
        surveyWalks.map(async (walk) => {
            const volunteersData = await getVolunteersData(walk.volunteerUids);
            const leaderData = await getLeaderData(walk.leader);
            return toDto(walk, periodName, volunteersData, leaderData);
        })
    );
    return { surveyWalks: enrichedWalks };
}

export async function listSurveyWalksForCurrentUserHandler(
    request: FastifyRequestTypeBox<typeof ListSurveyWalksSchema>,
    _reply: FastifyReplyTypeBox<typeof ListSurveyWalksSchema>
) {
    if (!request.user) {
        throw new Error('User not found in request');
    }

    const { surveyWalkService } = getContainer();
    const surveyWalks = await surveyWalkService.getSurveyWalksForJoinedPeriods();
    const enrichedWalks = await Promise.all(
        surveyWalks.map(async (walk) => {
            const [periodName, volunteersData] = await Promise.all([
                getSurveyPeriodName(walk.surveyPeriodUid),
                getVolunteersData(walk.volunteerUids),
            ]);

            const leaderFromVolunteers = walk.leader
                ? volunteersData.find((volunteer) => volunteer.uid === walk.leader)
                : undefined;
            const leaderData = leaderFromVolunteers || (await getLeaderData(walk.leader));

            return toDto(walk, periodName, volunteersData, leaderData);
        })
    );

    return { surveyWalks: enrichedWalks };
}

export async function createSurveyWalkHandler(
    request: FastifyRequestTypeBox<typeof CreateSurveyWalkSchema>,
    reply: FastifyReplyTypeBox<typeof CreateSurveyWalkSchema>
) {
    const { surveyWalkService } = getContainer();
    const created = await surveyWalkService.createSurveyWalk({
        surveyPeriodUid: request.body.surveyPeriodUid,
        name: request.body.name,
        date: parseDateString(request.body.date),
        startTime: request.body.startTime,
        endTime: request.body.endTime,
        capacity: request.body.capacity,
        isFinished: request.body.isFinished ?? false,
        volunteerUids: [],
        attendeeUids: [],
        completedAt: null,
        leader: request.body.leader ?? '',
    });

    const periodName = await getSurveyPeriodName(created.surveyPeriodUid);
    const volunteersData = await getVolunteersData(created.volunteerUids);
    const leaderData = await getLeaderData(created.leader);
    return reply.code(201).send(toDto(created, periodName, volunteersData, leaderData));
}

export async function updateSurveyWalkHandler(
    request: FastifyRequestTypeBox<typeof UpdateSurveyWalkSchema>,
    _reply: FastifyReplyTypeBox<typeof UpdateSurveyWalkSchema>
) {
    const { surveyWalkService } = getContainer();
    const updated = await surveyWalkService.updateSurveyWalk(request.params.uid, {
        surveyPeriodUid: request.body.surveyPeriodUid,
        name: request.body.name,
        date: request.body.date ? parseDateString(request.body.date) : undefined,
        startTime: request.body.startTime,
        endTime: request.body.endTime,
        capacity: request.body.capacity,
        isFinished: request.body.isFinished,
        leader: request.body.leader,
    });

    const periodName = await getSurveyPeriodName(updated.surveyPeriodUid);
    const volunteersData = await getVolunteersData(updated.volunteerUids);
    const leaderData = await getLeaderData(updated.leader);
    return toDto(updated, periodName, volunteersData, leaderData);
}

export async function deleteSurveyWalkHandler(
    request: FastifyRequestTypeBox<typeof DeleteSurveyWalkSchema>,
    _reply: FastifyReplyTypeBox<typeof DeleteSurveyWalkSchema>
) {
    const { surveyWalkService } = getContainer();
    return surveyWalkService.deleteSurveyWalk(request.params.uid);
}

export async function joinSurveyWalkHandler(
    request: FastifyRequestTypeBox<typeof JoinQuitSurveyWalkSchema>,
    _reply: FastifyReplyTypeBox<typeof JoinQuitSurveyWalkSchema>
) {
    if (!request.user) {
        throw new Error('User not found in request');
    }

    const { surveyWalkService } = getContainer();
    const surveyWalk = await surveyWalkService.joinSurveyWalk(request.params.uid, request.user.uid);
    const periodName = await getSurveyPeriodName(surveyWalk.surveyPeriodUid);
    const volunteersData = await getVolunteersData(surveyWalk.volunteerUids);
    const leaderData = await getLeaderData(surveyWalk.leader);
    return { success: true, surveyWalk: toDto(surveyWalk, periodName, volunteersData, leaderData) };
}

export async function quitSurveyWalkHandler(
    request: FastifyRequestTypeBox<typeof JoinQuitSurveyWalkSchema>,
    _reply: FastifyReplyTypeBox<typeof JoinQuitSurveyWalkSchema>
) {
    if (!request.user) {
        throw new Error('User not found in request');
    }

    const { surveyWalkService } = getContainer();
    const surveyWalk = await surveyWalkService.quitSurveyWalk(request.params.uid, request.user.uid);
    const periodName = await getSurveyPeriodName(surveyWalk.surveyPeriodUid);
    const volunteersData = await getVolunteersData(surveyWalk.volunteerUids);
    const leaderData = await getLeaderData(surveyWalk.leader);
    return { success: true, surveyWalk: toDto(surveyWalk, periodName, volunteersData, leaderData) };
}

export async function reassignSurveyWalkLeaderHandler(
    request: FastifyRequestTypeBox<typeof ReassignLeaderSchema>,
    _reply: FastifyReplyTypeBox<typeof ReassignLeaderSchema>
) {
    if (!request.user) {
        throw new Error('User not found in request');
    }

    const { surveyWalkService } = getContainer();
    const surveyWalk = await surveyWalkService.reassignLeader(
        request.params.uid,
        request.user.uid,
        request.body.newLeaderUid,
    );

    const periodName = await getSurveyPeriodName(surveyWalk.surveyPeriodUid);
    const volunteersData = await getVolunteersData(surveyWalk.volunteerUids);
    const leaderData = await getLeaderData(surveyWalk.leader);
    return { success: true, surveyWalk: toDto(surveyWalk, periodName, volunteersData, leaderData) };
}

export async function completeSurveyWalkHandler(
    request: FastifyRequestTypeBox<typeof CompleteSurveyWalkSchema>,
    _reply: FastifyReplyTypeBox<typeof CompleteSurveyWalkSchema>
) {
    if (!request.user) {
        throw new Error('User not found in request');
    }

    const { surveyWalkService } = getContainer();
    const surveyWalk = await surveyWalkService.completeSurveyWalk(
        request.params.uid,
        request.user.uid,
        request.body.attendeeUids,
        request.user.role === 'admin',
    );
    const periodName = await getSurveyPeriodName(surveyWalk.surveyPeriodUid);
    const volunteersData = await getVolunteersData(surveyWalk.volunteerUids);
    const leaderData = await getLeaderData(surveyWalk.leader);
    return { success: true, surveyWalk: toDto(surveyWalk, periodName, volunteersData, leaderData) };
}
