import { db } from "@/db";

export interface Repository<T> {
  findById(id: string): Promise<T | null>;
  save(entity: T): Promise<void>;
  delete(id: string): Promise<void>;
}

export abstract class DrizzleRepository<T> implements Repository<T> {
  abstract findById(id: string): Promise<T | null>;
  abstract save(entity: T): Promise<void>;
  abstract delete(id: string): Promise<void>;

  protected get db() {
    return db;
  }
}
