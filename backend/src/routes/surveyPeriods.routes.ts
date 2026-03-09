import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { verifyToken, requireAdminEmail } from '../middleware/auth.middleware';
import { ListSurveyPeriodsResponseSchema } from '../schemas/surveyPeriod.schema';
import { listSurveyPeriodsHandler } from '../handlers/surveyPeriods.handlers';

export const surveyPeriodRoutes: FastifyPluginAsyncTypebox = async (fastify) => {

    // List all survey periods (admin only)
    fastify.get('/api/surveyPeriods', {
        preHandler: [verifyToken, requireAdminEmail],
        schema: {
            operationId: 'listSurveyPeriods',
            description: 'List all survey periods (admin only)',
            tags: ['RafflesGo'],
            security: [{ bearerAuth: [] }],
            response: {
                200: ListSurveyPeriodsResponseSchema,
            },
        },
    }, listSurveyPeriodsHandler);
}