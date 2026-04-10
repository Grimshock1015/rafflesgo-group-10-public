import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { verifyToken, requireAdminEmail } from '../middleware/auth.middleware';
import {
    ActiveSurveyPeriodResponseSchema,
    CreateSurveyPeriodBodySchema,
    DeleteSurveyPeriodResponseSchema,
    ListSurveyPeriodsResponseSchema,
    SurveyPeriodParamsSchema,
    UpdateSurveyPeriodBodySchema,
    surveyPeriodSchema,
} from '../schemas/surveyPeriod.schema';
import {
    createSurveyPeriodHandler,
    activateSurveyPeriodHandler,
    deleteSurveyPeriodHandler,
    getActiveSurveyPeriodHandler,
    getSurveyPeriodHandler,
    listSurveyPeriodsHandler,
    updateSurveyPeriodHandler,
} from '../handlers/surveyPeriod.handler';

export const surveyPeriodRoutes: FastifyPluginAsyncTypebox = async (fastify) => {

    // Get the current active survey period — accessible by all authenticated users (not admin-only)
    fastify.get('/api/surveyPeriods/active', {
        preHandler: [verifyToken],
        schema: {
            operationId: 'getActiveSurveyPeriod',
            description: 'Get the current active survey period (uid, name, minWalks)',
            tags: ['RafflesGo'],
            security: [{ bearerAuth: [] }],
            response: {
                200: ActiveSurveyPeriodResponseSchema,
            },
        },
    }, getActiveSurveyPeriodHandler);

    // List all survey periods
    fastify.get('/api/surveyPeriods', {
        preHandler: [verifyToken, requireAdminEmail],
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
        preHandler: [verifyToken, requireAdminEmail],
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

    // Set active survey period (admin only)
    fastify.post('/api/surveyPeriods/:uid/activate', {
        preHandler: [verifyToken, requireAdminEmail],
        schema: {
            operationId: 'setActiveSurveyPeriod',
            description: 'Set the currently active survey period (admin only)',
            tags: ['RafflesGo'],
            security: [{ bearerAuth: [] }],
            params: SurveyPeriodParamsSchema,
            response: {
                200: surveyPeriodSchema,
            },
        },
    }, activateSurveyPeriodHandler);

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
}