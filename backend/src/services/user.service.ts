import { UserRepository } from '../repositories/user.repository';
import { User, ChangeRoleResponse } from '../schemas/user.schema';
import { Role } from '../config';

export class UserService {
  constructor(private userRepository: UserRepository) {}

  async getAllUsers(): Promise<User[]> {
    return this.userRepository.findAll();
  }

  async changeRole(email: string, role: Role): Promise<ChangeRoleResponse> {
    await this.userRepository.setRoleByEmail(email, role);
    return { success: true, email, role };
  }
}
