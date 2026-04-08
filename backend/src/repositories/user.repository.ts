import { auth } from '../lib/firebase-admin';
import { User } from '../schemas/user.schema';
import { Role, RoleSchema } from '../config';
import { Value } from '@sinclair/typebox/value';

export class UserRepository {
  async findAll(): Promise<User[]> {
    const listResult = await auth.listUsers();
    return listResult.users.map(user => {
      // Safely validate role from custom claims
      const customRole = user.customClaims?.role;
      const role: Role = Value.Check(RoleSchema, customRole) ? customRole : 'user';
      
      return {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        disabled: user.disabled,
        createdAt: user.metadata.creationTime,
        role,
      };
    });
  }

  async setRoleByEmail(email: string, role: Role): Promise<void> {
    const user = await auth.getUserByEmail(email);
    await auth.setCustomUserClaims(user.uid, { role });
  }

  async setDisabled(uid: string, disabled: boolean): Promise<void> {
    await auth.updateUser(uid, { disabled });
  }
}
