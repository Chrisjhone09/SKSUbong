import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom, Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApiProblem } from '../models/api.models';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api';

  get<T>(path: string): Promise<T> {
    return this.resolve(this.http.get<T>(this.url(path)));
  }

  post<T>(path: string, body: unknown): Promise<T> {
    return this.resolve(this.http.post<T>(this.url(path), body));
  }

  put<T>(path: string, body: unknown): Promise<T> {
    return this.resolve(this.http.put<T>(this.url(path), body));
  }

  delete<T>(path: string, body?: unknown): Promise<T> {
    return this.resolve(this.http.delete<T>(this.url(path), { body }));
  }

  async request<T>(path: string, method = 'GET', data?: unknown): Promise<T> {
    switch (method.toUpperCase()) {
      case 'GET':
        return this.get<T>(path);
      case 'POST':
        return this.post<T>(path, data ?? {});
      case 'PUT':
        return this.put<T>(path, data ?? {});
      case 'DELETE':
        return this.delete<T>(path, data);
      default:
        throw new Error(`Unsupported HTTP method: ${method}`);
    }
  }

  private url(path: string): string {
    return `${this.baseUrl}${path}`;
  }

  private resolve<T>(request: Observable<T>): Promise<T> {
    return firstValueFrom(
      request.pipe(
        catchError((error: HttpErrorResponse) => Promise.reject(this.toApiError(error))),
      ),
    );
  }

  private toApiError(response: HttpErrorResponse): ApiError {
    const problem =
      response.error && typeof response.error === 'object'
        ? (response.error as ApiProblem)
        : ({} as ApiProblem);
    return new ApiError(
      problem.error ??
        problem.detail ??
        (response.status === 401
          ? 'Invalid school ID or password. Please sign in again.'
          : response.status === 403
            ? 'Your account does not have permission for this action.'
            : (problem.title ?? response.message ?? 'The request could not be completed.')),
      response.status,
    );
  }
}
