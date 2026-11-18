import { computed, inject, Injectable, signal } from '@angular/core';
import { Account, SessionResponse } from '../models/api.models';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly api = inject(ApiService);
  private restoreTask?: Promise<boolean>;

  readonly account = signal<Account | null>(null);
  readonly permissions = signal<readonly string[]>([]);
  readonly authenticated = computed(() => this.account() !== null);

  async restore(): Promise<boolean> {
    if (this.account()) return true;
    this.restoreTask ??= this.api
      .get<SessionResponse>('/me')
      .then((session) => {
        this.apply(session);
        return true;
      })
      .catch(() => {
        this.clear();
        return false;
      })
      .finally(() => (this.restoreTask = undefined));
    return this.restoreTask;
  }

  async login(schoolId: string, password: string): Promise<void> {
    await this.api.post('/login', { schoolId, password });
    this.apply(await this.api.get<SessionResponse>('/me'));
  }

  async logout(): Promise<void> {
    try {
      await this.api.post('/logout', {});
    } finally {
      this.clear();
    }
  }

  clear(): void {
    this.account.set(null);
    this.permissions.set([]);
  }

  can(permission: string): boolean {
    return (
      this.account()?.verification_status === 'Verified' && this.permissions().includes(permission)
    );
  }

  landing(): string {
    if (this.account()?.verification_status !== 'Verified') return 'Home';
    return (
      {
        Faculty: 'My Class',
        OrganizationOfficer: 'To Go',
        SchoolAdministrator: 'Campus Info',
        SystemAdministrator: 'User Accounts',
      }[this.account()?.role ?? ''] ?? 'Home'
    );
  }

  pages(): string[] {
    return [
      'Home',
      'To Go',
      'Announcements',
      'Campus Info',
      'My Class',
      'Get to Know',
      'Saved Items',
      'My Account',
      ...(this.can('reports.moderate') ? ['Reported Content'] : []),
      ...(this.can('users.manage') ? ['User Accounts'] : []),
      ...(this.can('users.manage') ? ['Enrolled Students'] : []),
      ...(this.can('permissions.manage') ? ['Permissions'] : []),
      ...(this.can('security.manage') ? ['System Security', 'Database'] : []),
    ];
  }

  initials(): string {
    return (this.account()?.full_name ?? 'SK')
      .split(' ')
      .map((part) => part[0])
      .slice(0, 2)
      .join('');
  }

  private apply(session: SessionResponse): void {
    this.account.set(session.account);
    this.permissions.set(session.permissions.map(({ permission }) => permission));
  }
}
