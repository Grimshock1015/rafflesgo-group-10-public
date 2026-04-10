import { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { requireAdminEmail, verifyToken } from "../middleware/auth.middleware";
import {
    CompleteSurveyWalkBodySchema,
    CompleteSurveyWalkResponseSchema,
    CreateSurveyWalkBodySchema,
    DeleteSurveyWalkResponseSchema,
    JoinQuitSurveyWalkResponseSchema,
    ListSurveyWalksResponseSchema,
    ReassignLeaderBodySchema,
    ReassignLeaderResponseSchema,
    AdminUpdateSurveyWalkBodySchema,
    SurveyWalkBySurveyPeriodParamsSchema,
    SurveyWalkParamsSchema,
    surveyWalkSchema,
} from "../schemas/surveyWalk.schema";
import {
    completeSurveyWalkHandler,
    createSurveyWalkHandler,
    deleteSurveyWalkHandler,
    getSurveyWalkHandler,
    joinSurveyWalkHandler,
    listSurveyWalksBySurveyPeriodHandler,
    listSurveyWalksHandler,
    listSurveyWalksForCurrentUserHandler,
    quitSurveyWalkHandler,
    reassignSurveyWalkLeaderHandler,
    updateSurveyWalkHandler,
} from "../handlers/surveyWalks.handlers";

export const surveyWalkRoutes: FastifyPluginAsyncTypebox = async (fastify) => {

    fastify.get('/api/surveyWalks', {
        preHandler: [verifyToken, requireAdminEmail],
            schema: {
                operationId: 'listSurveyWalks',
                description: 'List all survey walks (admin only)',
                tags: ['RafflesGo'],
                security: [{ bearerAuth: [] }],
                response: {
                    200: ListSurveyWalksResponseSchema,
                },
            },
    }, listSurveyWalksHandler);

    fastify.get('/api/surveyWalks/joined', {
        preHandler: [verifyToken],
        schema: {
            operationId: 'listSurveyWalksForCurrentUser',
            description: 'List survey walks for periods the current user has joined',
            tags: ['RafflesGo'],
            security: [{ bearerAuth: [] }],
            response: {
                200: ListSurveyWalksResponseSchema,
            },
        },
    }, listSurveyWalksForCurrentUserHandler);

    fastify.get('/api/surveyWalks/:uid', {
        preHandler: [verifyToken, requireAdminEmail],
        schema: {
            operationId: 'getSurveyWalk',
            description: 'Get one survey walk by uid (admin only)',
            tags: ['RafflesGo'],
            security: [{ bearerAuth: [] }],
            params: SurveyWalkParamsSchema,
            response: {
                200: surveyWalkSchema,
            },
        },
    }, getSurveyWalkHandler);

    fastify.get('/api/surveyPeriods/:surveyPeriodUid/surveyWalks', {
        preHandler: [verifyToken],
        schema: {
            operationId: 'listSurveyWalksBySurveyPeriod',
            description: 'List survey walks for a survey period',
            tags: ['RafflesGo'],
            security: [{ bearerAuth: [] }],
            params: SurveyWalkBySurveyPeriodParamsSchema,
            response: {
                200: ListSurveyWalksResponseSchema,
            },
        },
    }, listSurveyWalksBySurveyPeriodHandler);

    fastify.post('/api/surveyWalks', {
        preHandler: [verifyToken, requireAdminEmail],
        schema: {
            operationId: 'createSurveyWalk',
            description: 'Create a survey walk (admin only)',
            tags: ['RafflesGo'],
            security: [{ bearerAuth: [] }],
            body: CreateSurveyWalkBodySchema,
            response: {
                201: surveyWalkSchema,
            },
        },
    }, createSurveyWalkHandler);

    fastify.put('/api/surveyWalks/:uid', {
        preHandler: [verifyToken, requireAdminEmail],
        schema: {
            operationId: 'updateSurveyWalk',
            description: 'Update a survey walk by uid (admin only)',
            tags: ['RafflesGo'],
            security: [{ bearerAuth: [] }],
            params: SurveyWalkParamsSchema,
            body: AdminUpdateSurveyWalkBodySchema,
            response: {
                200: surveyWalkSchema,
            },
        },
    }, updateSurveyWalkHandler);

    fastify.delete('/api/surveyWalks/:uid', {
        preHandler: [verifyToken, requireAdminEmail],
        schema: {
            operationId: 'deleteSurveyWalk',
            description: 'Delete a survey walk by uid (admin only)',
            tags: ['RafflesGo'],
            security: [{ bearerAuth: [] }],
            params: SurveyWalkParamsSchema,
            response: {
                200: DeleteSurveyWalkResponseSchema,
            },
        },
    }, deleteSurveyWalkHandler);

    fastify.post('/api/surveyWalks/:uid/join', {
        preHandler: [verifyToken],
        schema: {
            operationId: 'joinSurveyWalk',
            description: 'Join a survey walk as the current user',
            tags: ['RafflesGo'],
            security: [{ bearerAuth: [] }],
            params: SurveyWalkParamsSchema,
            response: {
                200: JoinQuitSurveyWalkResponseSchema,
            },
        },
    }, joinSurveyWalkHandler);

    fastify.post('/api/surveyWalks/:uid/quit', {
        preHandler: [verifyToken],
        schema: {
            operationId: 'quitSurveyWalk',
            description: 'Quit a survey walk as the current user',
            tags: ['RafflesGo'],
            security: [{ bearerAuth: [] }],
            params: SurveyWalkParamsSchema,
            response: {
                200: JoinQuitSurveyWalkResponseSchema,
            },
        },
    }, quitSurveyWalkHandler);

    fastify.post('/api/surveyWalks/:uid/reassign-leader', {
        preHandler: [verifyToken],
        schema: {
            operationId: 'reassignSurveyWalkLeader',
            description: 'Reassign survey walk leader (current leader only)',
            tags: ['RafflesGo'],
            security: [{ bearerAuth: [] }],
            params: SurveyWalkParamsSchema,
            body: ReassignLeaderBodySchema,
            response: {
                200: ReassignLeaderResponseSchema,
            },
        },
    }, reassignSurveyWalkLeaderHandler);

    fastify.post('/api/surveyWalks/:uid/complete', {
        preHandler: [verifyToken],
        schema: {
            operationId: 'completeSurveyWalk',
            description: 'Mark a survey walk complete and record attendance',
            tags: ['RafflesGo'],
            security: [{ bearerAuth: [] }],
            params: SurveyWalkParamsSchema,
            body: CompleteSurveyWalkBodySchema,
            response: {
                200: CompleteSurveyWalkResponseSchema,
            },
        },
    }, completeSurveyWalkHandler);
};
