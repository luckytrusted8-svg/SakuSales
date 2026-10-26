import { db } from '../db';
import type { UserEntity, UserRole } from '../db/schema';
import { generateSalt, hashPin, verifyPin } from '../auth/crypto';

export interface CreateUserInput {
  username: string;
  name: string;
  role: UserRole;
  pin: string;
}

export const userRepo = {
  async getOwner(): Promise<UserEntity | undefined> {
    return db.users.where('role').equals('owner').first();
  },

  async getAll(): Promise<UserEntity[]> {
    return db.users.toArray();
  },

  async getById(id: string): Promise<UserEntity | undefined> {
    return db.users.get(id);
  },

  async create(input: CreateUserInput): Promise<UserEntity> {
    const salt = generateSalt();
    const pinHash = await hashPin(input.pin, salt);
    const now = new Date().toISOString();

    const user: UserEntity = {
      id: crypto.randomUUID(),
      username: input.username.trim().toLowerCase(),
      name: input.name.trim(),
      role: input.role,
      pinHash,
      pinSalt: salt,
      createdAt: now,
      updatedAt: now,
    };

    await db.users.add(user);
    return user;
  },

  async verifyUserPin(user: UserEntity, pin: string): Promise<boolean> {
    return verifyPin(pin, user.pinSalt, user.pinHash);
  },

  async updatePin(userId: string, newPin: string): Promise<boolean> {
    const user = await db.users.get(userId);
    if (!user) return false;

    const salt = generateSalt();
    const pinHash = await hashPin(newPin, salt);
    const now = new Date().toISOString();

    await db.users.update(userId, {
      pinHash,
      pinSalt: salt,
      updatedAt: now,
    });
    return true;
  },

  async delete(userId: string): Promise<boolean> {
    const user = await db.users.get(userId);
    if (!user) return false;
    // Cannot delete the only owner
    if (user.role === 'owner') {
      const ownerCount = await db.users.where('role').equals('owner').count();
      if (ownerCount <= 1) return false;
    }
    await db.users.delete(userId);
    return true;
  },
};
