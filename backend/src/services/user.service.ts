import { UserRepository } from '../repositories/user.repository';
import { User, ChangeRoleResponse, UpdateUserStatusResponse } from '../schemas/user.schema';
import { Role } from '../config';

export class UserService {
  constructor(private userRepository: UserRepository) {}

  async getAllUsers(limit?: number): Promise<User[]> {
    return this.userRepository.findAll(limit);
  }

  async changeRole(email: string, role: Role): Promise<ChangeRoleResponse> {
    await this.userRepository.setRoleByEmail(email, role);
    return { success: true, email, role };
  }

  async updateStatus(uid: string, disabled: boolean): Promise<UpdateUserStatusResponse> {
    await this.userRepository.setDisabled(uid, disabled);
    return { success: true, uid, disabled };
  }
}
