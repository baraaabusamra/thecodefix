// ============================================================================
// Domain-Driven Design — Base Abstractions
// ============================================================================
// Strictly follows:
//   - fastapi-production-architecture.mdc: Repository pattern, Domain Exceptions,
//     Idempotency Keys, Anti-Corruption Layer
//   - typescript.mdc: Custom error types, Repository pattern, Result types
// ============================================================================

// ---------------------------------------------------------------------------
// 1. Domain Exceptions
// ---------------------------------------------------------------------------
// Rules: fastapi-production-architecture.mdc:46,197-209  |  typescript.mdc:46
// Services raise domain errors. NEVER raise HTTP exceptions or generic Error.

export abstract class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export abstract class NotFoundError extends DomainError {
  constructor(entity: string, id: string) {
    super(`${entity} with id '${id}' not found`);
  }
}

// --- Order domain ---
export class OrderNotFoundError extends NotFoundError {
  constructor(id: string) { super('Order', id); }
}

export class InsufficientFundsError extends DomainError {
  constructor(balance: number, required: number) {
    super(`Insufficient funds: balance ${balance}, required ${required}`);
  }
}

export class PaymentFailedError extends DomainError {
  constructor(orderId: string, reason: string) {
    super(`Payment failed for order '${orderId}': ${reason}`);
  }
}

export class OrderAlreadyCompletedError extends DomainError {
  constructor(orderId: string) {
    super(`Order '${orderId}' is already completed`);
  }
}

// --- Inventory domain ---
export class InventoryInsufficientError extends DomainError {
  constructor(productId: string, available: number, requested: number) {
    super(`Insufficient inventory for product '${productId}': available ${available}, requested ${requested}`);
  }
}

export class ProductNotFoundError extends NotFoundError {
  constructor(id: string) { super('Product', id); }
}

// --- Service Discovery domain ---
export class ServiceNotFoundError extends DomainError {
  constructor(service: string) {
    super(`Service '${service}' not found`);
  }
}

// --- Authentication domain ---
export class AuthenticationError extends DomainError {
  constructor(message = 'Authentication failed') {
    super(message);
  }
}

export class AuthorizationError extends DomainError {
  constructor(message = 'Unauthorized') {
    super(message);
  }
}

// --- Saga domain ---
export class SagaExecutionError extends DomainError {
  constructor(sagaId: string, step: string, cause: string) {
    super(`Saga '${sagaId}' failed at step '${step}': ${cause}`);
  }
}

export class SagaNotFoundError extends NotFoundError {
  constructor(id: string) { super('Saga', id); }
}

// ---------------------------------------------------------------------------
// 2. Idempotency Keys
// ---------------------------------------------------------------------------
// Rule: fastapi-production-architecture.mdc:152-154
// Every side-effect operation accepts an idempotency_key.
// Look up before retrying — prevents double-charge / double-write.

export type IdempotencyKey = string;

export interface IdempotencyRecord {
  key: IdempotencyKey;
  result: unknown;
  createdAt: Date;
}

export interface IdempotencyRepository {
  findByIdempotencyKey(key: IdempotencyKey): Promise<IdempotencyRecord | null>;
  saveIdempotencyRecord(record: IdempotencyRecord): Promise<void>;
}

export function generateIdempotencyKey(): IdempotencyKey {
  return crypto.randomUUID();
}

// ---------------------------------------------------------------------------
// 3. Repository Protocol
// ---------------------------------------------------------------------------
// Rules: fastapi-production-architecture.mdc:59-63  |  typescript.mdc:54
// ONLY layer allowed to import ORM/db driver.
// Returns domain objects, NEVER raw ORM models.
// Business logic MUST NOT call ORM directly.

export interface RepositoryProtocol<T> {
  findById(id: string): Promise<T | null>;
  save(entity: T): Promise<void>;
  delete(id: string): Promise<void>;
}

// --- Order Repository ---
export interface OrderEntity {
  id: string;
  userId: string;
  items: OrderItem[];
  total: number;
  status: string;
  createdAt: Date;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export interface OrderRepositoryProtocol extends RepositoryProtocol<OrderEntity> {
  findByUserId(userId: string): Promise<OrderEntity[]>;
}

// --- Product Repository ---
export interface ProductEntity {
  id: string;
  name: string;
  price: number;
  stock: number;
}

export interface ProductRepositoryProtocol extends RepositoryProtocol<ProductEntity> {
  findByStockAvailable(minimum: number): Promise<ProductEntity[]>;
}

// --- Saga Repository ---
export interface SagaStep {
  name: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'COMPENSATED';
  idempotencyKey?: IdempotencyKey;
}

export interface SagaEntity {
  id: string;
  state: string;
  data: Record<string, unknown>;
  steps: SagaStep[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SagaRepositoryProtocol extends RepositoryProtocol<SagaEntity> {
  findByState(state: string): Promise<SagaEntity[]>;
}

// ---------------------------------------------------------------------------
// 4. Example: In-Memory Repository Implementations
// ---------------------------------------------------------------------------
// For prototyping / testing only. Replace with real DB in production.

export class InMemoryRepository<T extends { id: string }> implements RepositoryProtocol<T> {
  protected store = new Map<string, T>();

  async findById(id: string): Promise<T | null> {
    return this.store.get(id) ?? null;
  }

  async save(entity: T): Promise<void> {
    this.store.set(entity.id, entity);
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }

  getAll(): T[] {
    return Array.from(this.store.values());
  }
}

export class InMemoryOrderRepository extends InMemoryRepository<OrderEntity> implements OrderRepositoryProtocol {
  async findByUserId(userId: string): Promise<OrderEntity[]> {
    return this.getAll().filter(o => o.userId === userId);
  }
}

export class InMemoryProductRepository extends InMemoryRepository<ProductEntity> implements ProductRepositoryProtocol {
  async findByStockAvailable(minimum: number): Promise<ProductEntity[]> {
    return this.getAll().filter(p => p.stock >= minimum);
  }
}

export class InMemorySagaRepository extends InMemoryRepository<SagaEntity> implements SagaRepositoryProtocol {
  async findByState(state: string): Promise<SagaEntity[]> {
    return this.getAll().filter(s => s.state === state);
  }
}

// ---------------------------------------------------------------------------
// 5. Helper: Structured Logger (contextvars analogue for Node.js)
// ---------------------------------------------------------------------------
// Rule: fastapi-production-architecture.mdc:155-165

import { AsyncLocalStorage } from 'async_hooks';

export interface LogContext {
  requestId?: string;
  userId?: string;
  provider?: string;
}

export const logContext = new AsyncLocalStorage<LogContext>();

export function structuredLog(level: string, message: string, extra: Record<string, unknown> = {}): void {
  const ctx = logContext.getStore() ?? {};
  const entry = { level, message, timestamp: new Date().toISOString(), ...ctx, ...extra };
  // In production, pipe to structured JSON log transport
  console.log(JSON.stringify(entry));
}
