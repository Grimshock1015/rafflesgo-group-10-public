import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserService } from '../services/user.service';
import type { UserRepository } from '../repositories/user.repository';
import type { User } from '../schemas/user.schema';

/**
 * UserService Unit Tests
 * 
 * Demonstrates Dependency Injection (DI) for testing:
 * - UserService receives UserRepository via constructor
 * - We inject a mock repository to test service logic in isolation
 * - No Firebase calls needed - tests are fast and reliable
 */
describe('UserService', () => {
  let mockUserRepository: {
    findAll: ReturnType<typeof vi.fn>;
    setRoleByEmail: ReturnType<typeof vi.fn>;
  };
  let userService: UserService;

  beforeEach(() => {
    // Create mock repository
    mockUserRepository = {
      findAll: vi.fn(),
      setRoleByEmail: vi.fn(),
    };

    // Inject mock into service - this is DI in action!
    userService = new UserService(mockUserRepository as unknown as UserRepository);
  });

  describe('getAllUsers', () => {
    it('should return users from repository', async () => {
      const mockUsers: User[] = [
        { uid: '1', email: 'alice@test.com', disabled: false, role: 'admin' },
        { uid: '2', email: 'bob@test.com', disabled: false, role: 'user' },
      ];
      mockUserRepository.findAll.mockResolvedValue(mockUsers);

      const result = await userService.getAllUsers();

      expect(result).toEqual(mockUsers);
      expect(mockUserRepository.findAll).toHaveBeenCalledOnce();
    });

    it('should return empty array when no users', async () => {
      mockUserRepository.findAll.mockResolvedValue([]);

      const result = await userService.getAllUsers();

      expect(result).toEqual([]);
    });
  });

  describe('changeRole', () => {
    it('should update role and return success response', async () => {
      mockUserRepository.setRoleByEmail.mockResolvedValue(undefined);

      const result = await userService.changeRole('alice@test.com', 'admin');

      expect(result).toEqual({
        success: true,
        email: 'alice@test.com',
        role: 'admin',
      });
      expect(mockUserRepository.setRoleByEmail).toHaveBeenCalledWith('alice@test.com', 'admin');
    });

    it('should propagate errors from repository', async () => {
      mockUserRepository.setRoleByEmail.mockRejectedValue(new Error('User not found'));

      await expect(userService.changeRole('nobody@test.com', 'admin'))
        .rejects.toThrow('User not found');
    });
  });
});
