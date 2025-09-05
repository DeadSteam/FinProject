import { IUserService } from './IUserService.js';

/**
 * Mock implementation for IUserService.
 * @implements {IUserService}
 */
export class MockUserService extends IUserService {
    constructor() {
        super();
        this.users = [
            { id: 1, email: 'admin@example.com', first_name: 'Admin', last_name: 'User', phone_number: '123456789', is_active: true, is_superuser: true, is_verified: true },
            { id: 2, email: 'user@example.com', first_name: 'Simple', last_name: 'User', phone_number: '987654321', is_active: true, is_superuser: false, is_verified: true },
        ];
        this.nextId = 3;
    }

    async getAllUsers() {
        console.log('Mock: Fetching all users');
        return Promise.resolve(this.users);
    }

    async getUserById(id) {
        console.log(`Mock: Fetching user with id ${id}`);
        const user = this.users.find(u => u.id === id);
        return user ? Promise.resolve(user) : Promise.reject(new Error('User not found'));
    }

    async createUser(userData) {
        console.log('Mock: Creating user', userData);
        const newUser = { 
            ...userData, 
            id: this.nextId++,
            is_active: true,
            is_superuser: false,
            is_verified: false,
        };
        this.users.push(newUser);
        return Promise.resolve(newUser);
    }

    async updateUser(id, userData) {
        console.log(`Mock: Updating user ${id} with`, userData);
        const index = this.users.findIndex(u => u.id === id);
        if (index !== -1) {
            this.users[index] = { ...this.users[index], ...userData };
            return Promise.resolve(this.users[index]);
        }
        return Promise.reject(new Error('User not found'));
    }

    async deleteUser(id) {
        console.log(`Mock: Deleting user ${id}`);
        const index = this.users.findIndex(u => u.id === id);
        if (index !== -1) {
            this.users.splice(index, 1);
            return Promise.resolve();
        }
        return Promise.reject(new Error('User not found'));
    }
} 