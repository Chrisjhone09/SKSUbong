import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { apiInterceptor } from '../interceptors/api.interceptor';
import { ApiService } from './api.service';

describe('ApiService', () => {
  let api: ApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    api = TestBed.inject(ApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('uses HttpClient GET, POST, PUT and DELETE with credentialed mutations', async () => {
    const getResult = api.get<{ value: number }>('/items');
    const get = http.expectOne('/api/items');
    expect(get.request.method).toBe('GET');
    expect(get.request.withCredentials).toBe(true);
    expect(get.request.headers.has('X-SK-Request')).toBe(false);
    get.flush({ value: 1 });
    await expect(getResult).resolves.toEqual({ value: 1 });

    const postResult = api.post<void>('/items', { title: 'New' });
    const post = http.expectOne('/api/items');
    expect(post.request.method).toBe('POST');
    expect(post.request.headers.get('X-SK-Request')).toBe('1');
    post.flush(null);
    await expect(postResult).resolves.toBeNull();

    const putResult = api.put<void>('/items/1', { title: 'Updated' });
    const put = http.expectOne('/api/items/1');
    expect(put.request.method).toBe('PUT');
    expect(put.request.headers.get('X-SK-Request')).toBe('1');
    put.flush(null);
    await expect(putResult).resolves.toBeNull();

    const deleteResult = api.delete<void>('/items/1');
    const remove = http.expectOne('/api/items/1');
    expect(remove.request.method).toBe('DELETE');
    expect(remove.request.headers.get('X-SK-Request')).toBe('1');
    remove.flush(null);
    await expect(deleteResult).resolves.toBeNull();
  });
});
