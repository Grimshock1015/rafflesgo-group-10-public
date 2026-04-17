import { Type, Static } from '@sinclair/typebox';
import { RoleSchema } from '../config';

export const UserSchema = Type.Object({
  uid: Type.String(),
  email: Type.Optional(Type.String()),
  displayName: Type.Optional(Type.String()),
  photoURL: Type.Optional(Type.String()),
  disabled: Type.Boolean(),
  createdAt: Type.Optional(Type.String()),
  role: RoleSchema,
});

export const ListUsersResponseSchema = Type.Object({
  users: Type.Array(UserSchema),
});

export const ListUsersQuerySchema = Type.Object({
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 500 })),
});

export const ChangeRoleBodySchema = Type.Object({
  email: Type.String(),
  role: RoleSchema,
});

export const ChangeRoleResponseSchema = Type.Object({
  success: Type.Boolean(),
  email: Type.String(),
  role: RoleSchema,
});

export const UpdateUserStatusBodySchema = Type.Object({
  disabled: Type.Boolean(),
});

export const UpdateUserStatusResponseSchema = Type.Object({
  success: Type.Boolean(),
  uid: Type.String(),
  disabled: Type.Boolean(),
});

export const MeResponseSchema = Type.Object({
  uid: Type.String(),
  email: Type.Optional(Type.String()),
  role: RoleSchema,
});

export type User = Static<typeof UserSchema>;
export type ListUsersResponse = Static<typeof ListUsersResponseSchema>;
export type ListUsersQuery = Static<typeof ListUsersQuerySchema>;
export type ChangeRoleBody = Static<typeof ChangeRoleBodySchema>;
export type ChangeRoleResponse = Static<typeof ChangeRoleResponseSchema>;
export type UpdateUserStatusBody = Static<typeof UpdateUserStatusBodySchema>;
export type UpdateUserStatusResponse = Static<typeof UpdateUserStatusResponseSchema>;
export type MeResponse = Static<typeof MeResponseSchema>;
