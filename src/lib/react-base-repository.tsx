// ============================================================================
// React — Base Abstractions (Repository Pattern + Domain Exceptions)
// ============================================================================
// Strictly follows:
//   - react.mdc: Error Boundaries, async error handling, fallback UI
//   - react-query.mdc / tanstack-query.mdc: query key factories, mutations
//   - react-zustand.mdc: store design, selectors, middleware
//   - typescript.mdc: custom error types, Repository pattern
//   - base_repository.ts: cross-track consistency (microservices → React)
// ============================================================================

// ---------------------------------------------------------------------------
// 1. React Domain Exceptions
// ---------------------------------------------------------------------------
// Rules: react.mdc error handling section  |  typescript.mdc:46
// NEVER throw raw Error from data layer — use typed domain exceptions.

export abstract class ReactDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ApiError extends ReactDomainError {
  constructor(
    readonly status: number,
    message: string,
    readonly code?: string,
  ) {
    super(message);
  }

  static fromResponse(response: Response): ApiError {
    switch (response.status) {
      case 401: return new ApiError(401, 'Unauthorized — please log in', 'UNAUTHORIZED');
      case 403: return new ApiError(403, 'Forbidden — insufficient permissions', 'FORBIDDEN');
      case 404: return new ApiError(404, 'Resource not found', 'NOT_FOUND');
      case 422: return new ApiError(422, 'Validation failed', 'VALIDATION_ERROR');
      case 429: return new ApiError(429, 'Too many requests — slow down', 'RATE_LIMITED');
      default: return new ApiError(response.status, `Request failed (${response.status})`, 'SERVER_ERROR');
    }
  }
}

export class NetworkError extends ReactDomainError {
  constructor(cause: string) {
    super(`Network error: ${cause}`);
  }
}

export class ValidationError extends ReactDomainError {
  constructor(readonly fieldErrors: Record<string, string[]>) {
    super('Validation failed');
  }
}

// ---------------------------------------------------------------------------
// 2. API Repository Protocol
// ---------------------------------------------------------------------------
// Rules: typescript.mdc:54  |  Never call fetch/axios directly from components.
// Components call custom hooks → hooks call repository → repository calls fetch.
// Repository is the ONLY layer that imports fetch/axios.

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
}

export interface ProductDTO {
  id: string;
  name: string;
  price: number;
  stock: number;
}

export interface UserRepository {
  getUsers(): Promise<UserDTO[]>;
  getUser(id: string): Promise<UserDTO>;
  createUser(data: Omit<UserDTO, 'id'>): Promise<UserDTO>;
}

export interface ProductRepository {
  getProducts(): Promise<ProductDTO[]>;
  getProduct(id: string): Promise<ProductDTO>;
}

// ---------------------------------------------------------------------------
// 3. API Client — Single source of truth for HTTP
// ---------------------------------------------------------------------------
// Rule: react.mdc — proper error handling, async errors properly typed
// This is the ONLY place fetch() is called directly.

export class HttpClient {
  private readonly baseUrl: string;

  constructor(baseUrl = '/api') {
    this.baseUrl = baseUrl;
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        ...options,
      });
    } catch (err) {
      throw new NetworkError((err as Error).message);
    }

    if (!response.ok) {
      throw ApiError.fromResponse(response);
    }

    return response.json() as Promise<T>;
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>(path);
  }

  post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, { method: 'POST', body: JSON.stringify(body) });
  }

  put<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, { method: 'PUT', body: JSON.stringify(body) });
  }

  delete<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'DELETE' });
  }
}

// ---------------------------------------------------------------------------
// 4. Repository Implementations
// ---------------------------------------------------------------------------

export class HttpUserRepository implements UserRepository {
  constructor(private readonly http: HttpClient) {}

  async getUsers(): Promise<UserDTO[]> {
    return this.http.get<UserDTO[]>('/users');
  }

  async getUser(id: string): Promise<UserDTO> {
    return this.http.get<UserDTO>(`/users/${id}`);
  }

  async createUser(data: Omit<UserDTO, 'id'>): Promise<UserDTO> {
    return this.http.post<UserDTO>('/users', data);
  }
}

export class HttpProductRepository implements ProductRepository {
  constructor(private readonly http: HttpClient) {}

  async getProducts(): Promise<ProductDTO[]> {
    return this.http.get<ProductDTO[]>('/products');
  }

  async getProduct(id: string): Promise<ProductDTO> {
    return this.http.get<ProductDTO>(`/products/${id}`);
  }
}

// ---------------------------------------------------------------------------
// 5. React Service Hooks
// ---------------------------------------------------------------------------
// Rule: react.mdc — custom hooks for reusable logic (hooks are the "Service" layer)
// Components NEVER call repositories directly — they call hooks.

import { useState, useEffect, useCallback, useRef } from 'react';

export type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: ReactDomainError };

export function useAsyncService<T>(
  fetcher: () => Promise<T>,
): AsyncState<T> & { refetch: () => void } {
  const [state, setState] = useState<AsyncState<T>>({ status: 'idle' });
  const fetcherRef = useRef(fetcher);
  const mountedRef = useRef(true);
  useEffect(() => { fetcherRef.current = fetcher; });
  useEffect(() => { return () => { mountedRef.current = false; }; }, []);

  const execute = useCallback(() => {
    setState({ status: 'loading' });
    fetcherRef
      .current()
      .then((data) => {
        if (mountedRef.current) setState({ status: 'success', data });
      })
      .catch((err) => {
        if (!mountedRef.current) return;
        if (err instanceof ReactDomainError) {
          setState({ status: 'error', error: err });
        } else {
          setState({ status: 'error', error: new ApiError(500, 'Unexpected error', 'UNKNOWN') });
        }
      });
  }, []);

  return { ...state, refetch: execute };
}

// ---------------------------------------------------------------------------
// 6. React Error Boundary (for graceful error display in UI)
// ---------------------------------------------------------------------------
// Rule: react.mdc — Implement Error Boundaries, show user-friendly error messages

import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ReactErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback;

      const message = this.state.error instanceof ApiError
        ? this.state.error.message
        : 'Something went wrong. Please try again.';

      return (
        <div role="alert" style={{ padding: '1rem', border: '1px solid #e53e3e', borderRadius: '0.5rem' }}>
          <h2>Error</h2>
          <p>{message}</p>
          <button onClick={() => this.setState({ error: null })}>Try again</button>
        </div>
      );
    }
    return this.props.children;
  }
}
