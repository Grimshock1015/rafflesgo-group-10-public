import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { meHandler, listUsersHandler, changeRoleHandler } from '../../../handlers/users.handler';
import { setContainer, resetContainer, Container } from '../../../container';
import { UserRepository } from '../../../repositories/user.repository';
import { config } from '../../../config';

/**
 * Handler Unit Tests
 * 
 * Demonstrates testing handlers by injecting a mock container:
 * - Use setContainer() to inject mock services
 * - Handlers get mocks via getContainer() 
 * - Test handler logic without touching Firebase
 */
describe('Users Handlers', () => {
  let mockUserService: {
    getAllUsers: ReturnType<typeof vi.fn>;
    changeRole: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    // Create mock service
    mockUserService = {
      getAllUsers: vi.fn(),
      changeRole: vi.fn(),
    };

    // Inject mock container - handlers will use this!
    setContainer({
      userService: mockUserService,
      userRepository: {} as unknown as UserRepository, // Not used by handlers directly
    } as unknown as Container);
  });

  afterEach(() => {
    // Reset container after each test
    resetContainer();
  });

  describe('listUsersHandler', () => {
    it('should return users from service', async () => {
      const mockUsers = [
        { uid: '1', email: 'alice@test.com', disabled: false, role: 'admin' },
        { uid: '2', email: 'bob@test.com', disabled: false, role: 'user' },
      ];
      mockUserService.getAllUsers.mockResolvedValue(mockUsers);

      const result = await listUsersHandler(
        {} as unknown as Parameters<typeof listUsersHandler>[0],
        {} as unknown as Parameters<typeof listUsersHandler>[1]
      );

      expect(result).toEqual({ users: mockUsers });
      expect(mockUserService.getAllUsers).toHaveBeenCalledOnce();
    });

    it('should return empty users array', async () => {
      mockUserService.getAllUsers.mockResolvedValue([]);

      const result = await listUsersHandler(
        {} as unknown as Parameters<typeof listUsersHandler>[0],
        {} as unknown as Parameters<typeof listUsersHandler>[1]
      );

      expect(result).toEqual({ users: [] });
    });
  });

  describe('meHandler', () => {
    const originalAdminEmails = [...config.adminEmails];

    afterEach(() => {
      config.adminEmails.splice(0, config.adminEmails.length, ...originalAdminEmails);
    });

    it('should throw when request has no user', async () => {
      const mockRequest = {} as unknown as Parameters<typeof meHandler>[0];

      await expect(
        meHandler(
          mockRequest,
          {} as unknown as Parameters<typeof meHandler>[1]
        )
      ).rejects.toThrow('User not found in request');
    });

    it('should return admin role when request user role is admin', async () => {
      const mockRequest = {
        user: {
          uid: 'admin-1',
          email: 'admin@test.com',
          role: 'admin',
        },
      } as unknown as Parameters<typeof meHandler>[0];

      const result = await meHandler(
        mockRequest,
        {} as unknown as Parameters<typeof meHandler>[1]
      );

      expect(result).toEqual({
        uid: 'admin-1',
        email: 'admin@test.com',
        role: 'admin',
      });
    });

    it('should return admin role when email is bootstrap admin', async () => {
      config.adminEmails.splice(0, config.adminEmails.length, 'bootstrap@test.com');

      const mockRequest = {
        user: {
          uid: 'user-1',
          email: 'bootstrap@test.com',
          role: 'user',
        },
      } as unknown as Parameters<typeof meHandler>[0];

      const result = await meHandler(
        mockRequest,
        {} as unknown as Parameters<typeof meHandler>[1]
      );

      expect(result).toEqual({
        uid: 'user-1',
        email: 'bootstrap@test.com',
        role: 'admin',
      });
    });

    it('should return user role when role is user and email is not bootstrap admin', async () => {
      config.adminEmails.splice(0, config.adminEmails.length, 'someone-else@test.com');

      const mockRequest = {
        user: {
          uid: 'user-2',
          email: 'plain@test.com',
          role: 'user',
        },
      } as unknown as Parameters<typeof meHandler>[0];

      const result = await meHandler(
        mockRequest,
        {} as unknown as Parameters<typeof meHandler>[1]
      );

      expect(result).toEqual({
        uid: 'user-2',
        email: 'plain@test.com',
        role: 'user',
      });
    });
  });

  describe('changeRoleHandler', () => {
    it('should call service with email and role from body', async () => {
      mockUserService.changeRole.mockResolvedValue({
        success: true,
        email: 'alice@test.com',
        role: 'admin',
      });

      const mockRequest = {
        body: { email: 'alice@test.com', role: 'admin' },
      } as unknown as Parameters<typeof changeRoleHandler>[0];

      const result = await changeRoleHandler(
        mockRequest,
        {} as unknown as Parameters<typeof changeRoleHandler>[1]
      );

      expect(result).toEqual({
        success: true,
        email: 'alice@test.com',
        role: 'admin',
      });
      expect(mockUserService.changeRole).toHaveBeenCalledWith('alice@test.com', 'admin');
    });

    it('should propagate service errors', async () => {
      mockUserService.changeRole.mockRejectedValue(new Error('User not found'));

      const mockRequest = {
        body: { email: 'nobody@test.com', role: 'admin' },
      } as unknown as Parameters<typeof changeRoleHandler>[0];

      await expect(
        changeRoleHandler(
          mockRequest,
          {} as unknown as Parameters<typeof changeRoleHandler>[1]
        )
      )
        .rejects.toThrow('User not found');
    });
  });
});
