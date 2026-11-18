import { HttpInterceptorFn } from '@angular/common/http';

export const apiInterceptor: HttpInterceptorFn = (request, next) => {
  const mutation = !['GET', 'HEAD', 'OPTIONS'].includes(request.method);
  return next(
    request.clone({
      withCredentials: true,
      setHeaders: mutation ? { 'X-SK-Request': '1' } : {},
    }),
  );
};
