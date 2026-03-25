import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { verifyToken, requireAdminEmail } from '../middleware/auth.middleware';
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
    UnjoinSurveyPeriodResponseSchema,
} from '../schemas/surveyPeriod.schema';
import {
    createSurveyPeriodHandler,
    deleteSurveyPeriodHandler,
    getSurveyPeriodHandler,
    listSurveyPeriodsHandler,
    updateSurveyPeriodHandler,
    joinSurveyPeriodHandler,
    unjoinSurveyPeriodHandler,
} from '../handlers/surveyPeriods.handlers';

export const surveyPeriodRoutes: FastifyPluginAsyncTypebox = async (fastify) => {

    // List all survey periods
    fastify.get('/api/surveyPeriods', {
        preHandler: [verifyToken],
        schema: {
            operationId: 'listSurveyPeriods',
            description: 'List all survey periods',
            tags: ['RafflesGo'],
            security: [{ bearerAuth: [] }],
            response: {
                200: ListSurveyPeriodsResponseSchema,
            },
        },
    }, listSurveyPeriodsHandler);

    // Get one survey period
    fastify.get('/api/surveyPeriods/:uid', {
        preHandler: [verifyToken],
        schema: {
            operationId: 'getSurveyPeriod',
            description: 'Get one survey period by uid',
            tags: ['RafflesGo'],
            security: [{ bearerAuth: [] }],
            params: SurveyPeriodParamsSchema,
            response: {
                200: surveyPeriodSchema,
            },
        },
    }, getSurveyPeriodHandler);

    // Create survey period (admin only)
    fastify.post('/api/surveyPeriods', {
        preHandler: [verifyToken, requireAdminEmail],
        schema: {
            operationId: 'createSurveyPeriod',
            description: 'Create a survey period (admin only)',
            tags: ['RafflesGo'],
            security: [{ bearerAuth: [] }],
            body: CreateSurveyPeriodBodySchema,
            response: {
                201: surveyPeriodSchema,
            },
        },
    }, createSurveyPeriodHandler);

    // Update survey period (admin only)
    fastify.put('/api/surveyPeriods/:uid', {
        preHandler: [verifyToken, requireAdminEmail],
        schema: {
            operationId: 'updateSurveyPeriod',
            description: 'Update a survey period by uid (admin only)',
            tags: ['RafflesGo'],
            security: [{ bearerAuth: [] }],
            params: SurveyPeriodParamsSchema,
            body: UpdateSurveyPeriodBodySchema,
            response: {
                200: surveyPeriodSchema,
            },
        },
    }, updateSurveyPeriodHandler);

    // Delete survey period (admin only)
    fastify.delete('/api/surveyPeriods/:uid', {
        preHandler: [verifyToken, requireAdminEmail],
        schema: {
            operationId: 'deleteSurveyPeriod',
            description: 'Delete a survey period by uid (admin only)',
            tags: ['RafflesGo'],
            security: [{ bearerAuth: [] }],
            params: SurveyPeriodParamsSchema,
            response: {
                200: DeleteSurveyPeriodResponseSchema,
            },
        },
    }, deleteSurveyPeriodHandler);

    // Volunteer joins a survey period
    fastify.post('/api/surveyPeriods/:uid/join', {
        preHandler: [verifyToken],
        schema: {
            operationId: 'joinSurveyPeriod',
            description: 'Volunteer joins a survey period',
            tags: ['RafflesGo'],
            security: [{ bearerAuth: [] }],
            params: SurveyPeriodParamsSchema,
            body: JoinSurveyPeriodBodySchema,
            response: {
                200: JoinSurveyPeriodResponseSchema,
            },
        },
    }, joinSurveyPeriodHandler);

    // Volunteer unjoins a survey period
    fastify.post('/api/surveyPeriods/:uid/unjoin', {
        preHandler: [verifyToken],
        schema: {
            operationId: 'unjoinSurveyPeriod',
            description: 'Volunteer unjoins a survey period',
            tags: ['RafflesGo'],
            security: [{ bearerAuth: [] }],
            params: SurveyPeriodParamsSchema,
            body: UnjoinSurveyPeriodBodySchema,
            response: {
                200: UnjoinSurveyPeriodResponseSchema,
            },
        },
    }, unjoinSurveyPeriodHandler);
}