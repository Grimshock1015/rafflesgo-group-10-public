import { FastifyRequestTypeBox, FastifyReplyTypeBox } from '../types/fastify';
import {
    ActiveSurveyPeriodResponseSchema,
    CreateSurveyPeriodBodySchema,
    DeleteSurveyPeriodResponseSchema,
    ListSurveyPeriodsResponseSchema,
    SurveyPeriodParamsSchema,
    UpdateSurveyPeriodBodySchema,
    surveyPeriodSchema,
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

const ActivateSurveyPeriodSchema = {
    params: SurveyPeriodParamsSchema,
    response: {
        200: surveyPeriodSchema,
    },
};

function toDto(surveyPeriod: SurveyPeriodEntity) {
    return {
        uid: surveyPeriod.uid,
        name: surveyPeriod.name,
        startDate: surveyPeriod.startDate.toISOString(),
        endDate: surveyPeriod.endDate.toISOString(),
        isFinished: surveyPeriod.isFinished,
        isActive: surveyPeriod.isActive,
        minWalks: surveyPeriod.minWalks,
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
    request: FastifyRequestTypeBox<typeof ListSurveyPeriodsSchema>,
    _reply: FastifyReplyTypeBox<typeof ListSurveyPeriodsSchema>
) {
    const { surveyPeriodService } = getContainer();
    const rawLimit = (request.query as { limit?: number } | undefined)?.limit;
    const limit = typeof rawLimit === 'number' && Number.isInteger(rawLimit)
        ? Math.min(Math.max(rawLimit, 1), 500)
        : undefined;
    const surveyPeriods = await surveyPeriodService.getAllSurveyPeriods(limit);
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
        isActive: request.body.isActive || false,
        minWalks: request.body.minWalks,
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

const GetActiveSurveyPeriodSchema = {
    response: {
        200: ActiveSurveyPeriodResponseSchema,
    },
};

// Returns the current active, non-finished survey period's basic info (uid, name, minWalks).
// Accessible by all authenticated users (not admin-only) so volunteers can track period progress.
export async function getActiveSurveyPeriodHandler(
    _request: FastifyRequestTypeBox<typeof GetActiveSurveyPeriodSchema>,
    _reply: FastifyReplyTypeBox<typeof GetActiveSurveyPeriodSchema>
) {
    const { surveyPeriodService } = getContainer();
    const all = await surveyPeriodService.getAllSurveyPeriods();
    const active = all.find((p) => p.isActive && !p.isFinished);
    if (!active) return null;
    return { uid: active.uid, name: active.name, minWalks: active.minWalks };
}

export async function activateSurveyPeriodHandler(
    request: FastifyRequestTypeBox<typeof ActivateSurveyPeriodSchema>,
    _reply: FastifyReplyTypeBox<typeof ActivateSurveyPeriodSchema>
) {
    const { surveyPeriodService } = getContainer();
    const updated = await surveyPeriodService.setActiveSurveyPeriod(request.params.uid);
    return toDto(updated);
}