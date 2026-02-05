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

export const ChangeRoleBodySchema = Type.Object({
  email: Type.String(),
  role: RoleSchema,
});

export const ChangeRoleResponseSchema = Type.Object({
  success: Type.Boolean(),
  email: Type.String(),
  role: RoleSchema,
});

export const MeResponseSchema = Type.Object({
  uid: Type.String(),
  email: Type.Optional(Type.String()),
  role: RoleSchema,
});

export type User = Static<typeof UserSchema>;
export type ListUsersResponse = Static<typeof ListUsersResponseSchema>;
export type ChangeRoleBody = Static<typeof ChangeRoleBodySchema>;
export type ChangeRoleResponse = Static<typeof ChangeRoleResponseSchema>;
export type MeResponse = Static<typeof MeResponseSchema>;
