import { getContainer } from "../container";
import { SurveyWalkEntity } from "../entities/surveyWalk.entity";
import { BadRequestError } from "../lib/errors";
import {
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

function toDto(surveyWalk: SurveyWalkEntity) {
    return {
        uid: surveyWalk.uid,
        surveyPeriodUid: surveyWalk.surveyPeriodUid,
        name: surveyWalk.name,
        date: surveyWalk.date.toISOString(),
        isFinished: surveyWalk.isFinished,
        volunteerUids: surveyWalk.volunteerUids,
        leader: surveyWalk.leader,
    };
}

function parseDateString(value: string): Date {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        throw new BadRequestError('date must be a valid date-time');
    }
    return parsed;
}

export async function listSurveyWalksHandler(
    _request: FastifyRequestTypeBox<typeof ListSurveyWalksSchema>,
    _reply: FastifyReplyTypeBox<typeof ListSurveyWalksSchema>
) {
    const { surveyWalkService } = getContainer();
    const surveyWalks = await surveyWalkService.getAllSurveyWalks();
    return { surveyWalks: surveyWalks.map(toDto) };
}

export async function getSurveyWalkHandler(
    request: FastifyRequestTypeBox<typeof GetSurveyWalkSchema>,
    _reply: FastifyReplyTypeBox<typeof GetSurveyWalkSchema>
) {
    const { surveyWalkService } = getContainer();
    const surveyWalk = await surveyWalkService.getSurveyWalk(request.params.uid);
    return toDto(surveyWalk);
}

export async function listSurveyWalksBySurveyPeriodHandler(
    request: FastifyRequestTypeBox<typeof ListSurveyWalksBySurveyPeriodSchema>,
    _reply: FastifyReplyTypeBox<typeof ListSurveyWalksBySurveyPeriodSchema>
) {
    const { surveyWalkService } = getContainer();
    const surveyWalks = await surveyWalkService.getSurveyWalksBySurveyPeriodUid(request.params.surveyPeriodUid);
    return { surveyWalks: surveyWalks.map(toDto) };
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
        isFinished: request.body.isFinished ?? false,
        volunteerUids: [],
        leader: request.body.leader ?? '',
    });

    return reply.code(201).send(toDto(created));
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
        isFinished: request.body.isFinished,
        leader: request.body.leader,
    });

    return toDto(updated);
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
    return { success: true, surveyWalk: toDto(surveyWalk) };
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
    return { success: true, surveyWalk: toDto(surveyWalk) };
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

    return { success: true, surveyWalk: toDto(surveyWalk) };
}