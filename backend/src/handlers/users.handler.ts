import {
  ListUsersResponseSchema,
  ChangeRoleBodySchema,
  ChangeRoleResponseSchema,
  MeResponseSchema,
} from '../schemas/user.schema';
import { FastifyRequestTypeBox, FastifyReplyTypeBox } from '../types/fastify';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { getContainer } from '../container';
import { config } from '../config';

const MeSchema = {
  response: {
    200: MeResponseSchema,
  },
};

export async function meHandler(
  request: FastifyRequestTypeBox<typeof MeSchema>,
  _reply: FastifyReplyTypeBox<typeof MeSchema>
) {
  if (!request.user) {
    throw new Error('User not found in request');
  }

  const isAdminEmail = request.user.email && config.adminEmails.includes(request.user.email);
  const effectiveRole: 'admin' | 'user' = (request.user.role === 'admin' || isAdminEmail) ? 'admin' : 'user';

  return {
    uid: request.user.uid,
    email: request.user.email,
    role: effectiveRole,
  };
}

const ListUsersSchema = {
  response: {
    200: ListUsersResponseSchema,
  },
};

export async function listUsersHandler(
  _request: FastifyRequestTypeBox<typeof ListUsersSchema>,
  _reply: FastifyReplyTypeBox<typeof ListUsersSchema>
) {
  const { userService } = getContainer();
  const users = await userService.getAllUsers();
  return { users };
}

const ChangeRoleSchema = {
  body: ChangeRoleBodySchema,
  response: {
    200: ChangeRoleResponseSchema,
  },
};

export async function changeRoleHandler(
  request: FastifyRequestTypeBox<typeof ChangeRoleSchema>,
  _reply: FastifyReplyTypeBox<typeof ChangeRoleSchema>
) {
  const { userService } = getContainer();
  const { email, role } = request.body;
  return userService.changeRole(email, role);
}

export async function updateUserStatusHandler(
  request: FastifyRequest,
  _reply: FastifyReply
) {
  const { userService } = getContainer();
  const { uid } = request.params as { uid: string };
  const { disabled } = request.body as { disabled: boolean };
  return userService.updateStatus(uid, disabled);
}
