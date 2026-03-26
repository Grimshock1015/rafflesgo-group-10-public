import { FastifyRequestTypeBox, FastifyReplyTypeBox } from '../types/fastify';
import {
    CreateSurveyPeriodBodySchema,
    DeleteSurveyPeriodResponseSchema,
    ListSurveyPeriodsResponseSchema,
    SurveyPeriodParamsSchema,
    UpdateSurveyPeriodBodySchema,
    surveyPeriodSchema,
    JoinSurveyPeriodBodySchema,
    JoinSurveyPeriodResponseSchema,
    UnjoinSurveyPeriodBodySchema,
    UnjoinSurveyPeriodResponseSchema
} from '../schemas/surveyPeriod.schema';
import { getContainer } from '../container';
import { SurveyPeriodEntity } from '../entities/surveyPeriod.entity';
import { BadRequestError } from '../lib/errors';

const ListSurveyPeriodsSchema = {
    response: {
        200: ListSurveyPeriodsResponseSchema,
    },
};

const GetSurveyPeriodSchema = {
    params: SurveyPeriodParamsSchema,
    response: {
        200: surveyPeriodSchema,
    },
};

const CreateSurveyPeriodSchema = {
    body: CreateSurveyPeriodBodySchema,
    response: {
        201: surveyPeriodSchema,
    },
};

const UpdateSurveyPeriodSchema = {
    params: SurveyPeriodParamsSchema,
    body: UpdateSurveyPeriodBodySchema,
    response: {
        200: surveyPeriodSchema,
    },
};

const DeleteSurveyPeriodSchema = {
    params: SurveyPeriodParamsSchema,
    response: {
        200: DeleteSurveyPeriodResponseSchema,
    },
};

const JoinSurveyPeriodSchema = {
    params: SurveyPeriodParamsSchema,
    body: JoinSurveyPeriodBodySchema,
    response: {
        200: JoinSurveyPeriodResponseSchema,
    },
};

const UnjoinSurveyPeriodSchema = {
    params: SurveyPeriodParamsSchema,
    body: UnjoinSurveyPeriodBodySchema,
    response: {
        200: UnjoinSurveyPeriodResponseSchema,
    },
};

function toDto(surveyPeriod: SurveyPeriodEntity) {
    return {
        uid: surveyPeriod.uid,
        name: surveyPeriod.name,
        startDate: surveyPeriod.startDate.toISOString(),
        endDate: surveyPeriod.endDate.toISOString(),
        isFinished: surveyPeriod.isFinished,
        minWalks: surveyPeriod.minWalks,
        volunteerUids: surveyPeriod.volunteerUids,
    };
}

function parseDateString(value: string, field: 'startDate' | 'endDate'): Date {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        throw new BadRequestError(`${field} must be a valid date-time`);
    }
    return parsed;
}

export async function listSurveyPeriodsHandler(
    _request: FastifyRequestTypeBox<typeof ListSurveyPeriodsSchema>,
    _reply: FastifyReplyTypeBox<typeof ListSurveyPeriodsSchema>
) {
    const { surveyPeriodService } = getContainer();
    const surveyPeriods = await surveyPeriodService.getAllSurveyPeriods();
    return { surveyPeriods: surveyPeriods.map(toDto) };
}

export async function getSurveyPeriodHandler(
    request: FastifyRequestTypeBox<typeof GetSurveyPeriodSchema>,
    _reply: FastifyReplyTypeBox<typeof GetSurveyPeriodSchema>
) {
    const { surveyPeriodService } = getContainer();
    const surveyPeriod = await surveyPeriodService.getSurveyPeriod(request.params.uid);

    return toDto(surveyPeriod);
}

export async function createSurveyPeriodHandler(
    request: FastifyRequestTypeBox<typeof CreateSurveyPeriodSchema>,
    reply: FastifyReplyTypeBox<typeof CreateSurveyPeriodSchema>
) {
    const { surveyPeriodService } = getContainer();
    const created = await surveyPeriodService.createSurveyPeriod({
        name: request.body.name,
        startDate: parseDateString(request.body.startDate, 'startDate'),
        endDate: parseDateString(request.body.endDate, 'endDate'),
        isFinished: request.body.isFinished,
        minWalks: request.body.minWalks,
        volunteerUids: [],
    });

    return reply.code(201).send(toDto(created));
}

export async function updateSurveyPeriodHandler(
    request: FastifyRequestTypeBox<typeof UpdateSurveyPeriodSchema>,
    _reply: FastifyReplyTypeBox<typeof UpdateSurveyPeriodSchema>
) {
    const { surveyPeriodService } = getContainer();

    const updated = await surveyPeriodService.updateSurveyPeriod(request.params.uid, {
        name: request.body.name,
        startDate: request.body.startDate ? parseDateString(request.body.startDate, 'startDate') : undefined,
        endDate: request.body.endDate ? parseDateString(request.body.endDate, 'endDate') : undefined,
        isFinished: request.body.isFinished,
        minWalks: request.body.minWalks,
    });

    return toDto(updated);
}

export async function deleteSurveyPeriodHandler(
    request: FastifyRequestTypeBox<typeof DeleteSurveyPeriodSchema>,
    _reply: FastifyReplyTypeBox<typeof DeleteSurveyPeriodSchema>
) {
    const { surveyPeriodService } = getContainer();
    return surveyPeriodService.deleteSurveyPeriod(request.params.uid);
}

export async function joinSurveyPeriodHandler(
    request: FastifyRequestTypeBox<typeof JoinSurveyPeriodSchema>,
    _reply: FastifyReplyTypeBox<typeof JoinSurveyPeriodSchema>
) {
    const { surveyPeriodService } = getContainer();

    // Call joinSurveyPeriod
    await surveyPeriodService.joinSurveyPeriod(
        request.params.uid,
        request.body.volunteerUid
    );

    return { success: true };
}

export async function unjoinSurveyPeriodHandler(
    request: FastifyRequestTypeBox<typeof UnjoinSurveyPeriodSchema>,
    _reply: FastifyReplyTypeBox<typeof UnjoinSurveyPeriodSchema>
) {
    const { surveyPeriodService } = getContainer();

    await surveyPeriodService.unjoinSurveyPeriod(
        request.params.uid,
        request.body.volunteerUid
    );

    return { success: true };
}