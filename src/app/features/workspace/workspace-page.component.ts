import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiError, ApiService } from '../../core/services/api.service';
import { AuthStore } from '../../core/services/auth.store';

type Row = Record<string, any>;
@Component({
  selector: 'app-workspace-page',
  host: { class: 'sk-app' },
  imports: [CommonModule, FormsModule],
  templateUrl: './workspace-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspacePage {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly account = this.auth.account;
  readonly permissions = this.auth.permissions;
  page = signal('Home');
  rows = signal<Row[]>([]);
  organizations = signal<Row[]>([]);
  details = signal<Row | null>(null);
  interactions = signal<Row | null>(null);
  revisions = signal<Row[]>([]);
  busy = signal(false);
  error = signal('');
  notice = signal('');
  form = signal('');
  search = '';
  teacher = '';
  kind = 'posts';
  draft: Row = {};
  roles = [
    'Student',
    'Faculty',
    'Staff',
    'OrganizationOfficer',
    'SchoolAdministrator',
    'SystemAdministrator',
  ];
  constructor() {
    this.route.paramMap.subscribe((params) => {
      const requestedPage = params.get('page') ?? this.auth.landing();
      const page = this.auth.pages().includes(requestedPage) ? requestedPage : this.auth.landing();
      if (page !== requestedPage) {
        void this.router.navigate(['/workspace', page], { replaceUrl: true });
        return;
      }
      void this.activate(page);
    });
  }
  async request<T = any>(path: string, method = 'GET', data?: unknown): Promise<T> {
    try {
      return await this.api.request(path, method, data);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        this.auth.clear();
        await this.router.navigate(['/sign-in']);
      }
      throw error;
    }
  }
  async perform(action: () => Promise<void>) {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.notice.set('');
    try {
      await action();
    } catch (error) {
      this.error.set((error as Error).message);
    } finally {
      this.busy.set(false);
    }
  }
  can(permission: string) {
    return this.auth.can(permission);
  }
  landing() {
    return this.auth.landing();
  }
  reportHistory(row: Row): Row[] {
    try {
      return JSON.parse(row['history'] || '[]');
    } catch {
      return [];
    }
  }
  pages() {
    return this.auth.pages();
  }
  initials() {
    return this.auth.initials();
  }
  async navigate(page: string) {
    await this.router.navigate(['/workspace', page]);
  }
  private async activate(page: string) {
    this.page.set(page);
    this.form.set('');
    this.details.set(null);
    this.revisions.set([]);
    this.rows.set([]);
    this.search = '';
    this.teacher = '';
    if (page === 'To Go') this.kind = 'places';
    if (page === 'Announcements') this.kind = 'announcements';
    if (page === 'Saved Items') this.kind = 'posts';
    await this.performLoad();
  }
  async performLoad() {
    try {
      await this.load();
    } catch (error) {
      this.error.set((error as Error).message);
    }
  }
  async load() {
    const paths: Record<string, string> = {
      Home: '/feed',
      'To Go': '/content/' + this.kind,
      Announcements: '/content/announcements',
      'Campus Info': '/information',
      'My Class': '/classes' + (this.teacher ? '?teacher=' + this.teacher : ''),
      'Get to Know': '/directory',
      'Saved Items': '/saved/' + this.kind,
      'Reported Content': '/admin/reports',
      'User Accounts': '/admin/users',
      'Enrolled Students': '/admin/enrollment-roster',
      Permissions: '/admin/permissions',
      'System Security': '/admin/settings',
      Database: '/admin/database',
    };
    if (this.page() === 'My Account') {
      this.rows.set([]);
      return;
    }
    const data = await this.request(paths[this.page()]);
    this.rows.set(Array.isArray(data) ? data : [data]);
    if (this.can('organizations.publish'))
      this.organizations.set(await this.request('/organizations/mine'));
  }
  filtered() {
    const q = this.search.toLowerCase();
    return this.rows().filter((r) => JSON.stringify(r).toLowerCase().includes(q));
  }
  async tab(kind: string) {
    this.kind = kind;
    this.details.set(null);
    this.form.set('');
    await this.performLoad();
  }
  openForm(type: string, row?: Row) {
    this.form.set(type);
    this.draft = {
      postType: 'General',
      isAnonymous: false,
      organizationId: null,
      category: 'Services',
      status: 'Published',
      audience: 'All students',
      type: 'Comment',
      rating: 5,
      action: 'Retain',
      ...row,
    };
  }
  rowTitle(row: Row) {
    return row['title'] || row['name'] || row['full_name'] || row['subject'] || '';
  }
  id(row: Row) {
    return (
      row['id'] || row['post_id'] || row['place_id'] || row['event_id'] || row['announcement_id']
    );
  }
  async open(row: Row) {
    await this.perform(async () => {
      let item = row;
      const itemKind =
        this.page() === 'Home'
          ? row['kind']
          : this.page() === 'Announcements'
            ? 'announcements'
            : this.kind;
      if (this.page() === 'Saved Items') {
        const all = await this.request('/content/' + itemKind);
        item = all.find((r: Row) => this.id(r) === row['id']);
        if (!item) throw new Error('This saved item is no longer available.');
      }
      this.details.set({ ...item, kind: itemKind, id: this.id(item) });
      this.form.set('');
      this.interactions.set(
        itemKind === 'updates'
          ? null
          : await this.request('/content/' + itemKind + '/' + this.id(item) + '/interactions'),
      );
    });
  }
  async interact(type: string) {
    if (type === 'Comment' || type === 'Rating') {
      this.openForm('interaction', { type, rating: 5 });
      return;
    }
    await this.perform(async () => {
      const d = this.details()!;
      await this.request(`/content/${d['kind']}/${d['id']}/interactions`, 'POST', { type });
      this.interactions.set(await this.request(`/content/${d['kind']}/${d['id']}/interactions`));
      this.notice.set('Your interaction was saved.');
    });
  }
  async saveBookmark(saved = true) {
    await this.perform(async () => {
      const d = this.details()!;
      await this.request(`/content/${d['kind']}/${d['id']}/saved`, 'PUT', { saved });
      this.notice.set(saved ? 'Item saved.' : 'Bookmark removed.');
    });
  }
  async enroll(row: Row) {
    await this.perform(async () => {
      await this.request(`/classes/${row['class_id']}/enroll`, 'POST', {});
      await this.load();
      this.notice.set('Class added. Its updates now appear in your Home feed.');
    });
  }
  async submit() {
    await this.perform(async () => {
      const type = this.form();
      const d = this.draft;
      const detail = this.details();
      if (type === 'post')
        await this.request('/posts', 'POST', {
          ...d,
          organizationId: d['organizationId'] ? Number(d['organizationId']) : null,
        });
      if (type === 'event')
        await this.request('/events', 'POST', {
          ...d,
          organizationId: Number(d['organizationId']),
          start: new Date(d['start']).toISOString(),
          end: new Date(d['end']).toISOString(),
        });
      if (type === 'update') await this.request(`/classes/${d['class_id']}/updates`, 'POST', d);
      if (type === 'announcement') await this.request('/admin/announcements', 'POST', d);
      if (type === 'information')
        await this.request(
          '/admin/information' + (d['information_id'] ? '/' + d['information_id'] : ''),
          d['information_id'] ? 'PUT' : 'POST',
          d,
        );
      if (type === 'resolution')
        await this.request(`/admin/reports/${d['report_id']}/resolve`, 'POST', d);
      if (type === 'interaction')
        await this.request(`/content/${detail!['kind']}/${detail!['id']}/interactions`, 'POST', d);
      if (type === 'report')
        await this.request('/reports', 'POST', { ...d, kind: detail!['kind'], id: detail!['id'] });
      if (type === 'profile') {
        await this.request('/profile', 'PUT', d);
        const me = await this.request('/me');
        this.auth.account.set(me.account);
      }
      this.form.set('');
      await this.load();
      if (type === 'interaction')
        this.interactions.set(
          await this.request(`/content/${detail!['kind']}/${detail!['id']}/interactions`),
        );
      this.notice.set('Changes saved successfully.');
    });
  }
  async announcementStatus(row: Row) {
    await this.perform(async () => {
      await this.request('/admin/announcements/' + row['announcement_id'] + '/status', 'PUT', {
        status: row['status'] === 'Published' ? 'Inactive' : 'Published',
      });
      await this.load();
    });
  }
  async updateUser(row: Row) {
    await this.perform(async () => {
      await this.request('/admin/users/' + row['user_id'], 'PUT', {
        role: row['role'],
        accountStatus: row['account_status'],
        verificationStatus: row['verification_status'],
        department: row['department'],
        office: row['office'],
      });
      await this.load();
      this.notice.set('Account and verified profile updated.');
    });
  }
  async deleteUser(row: Row) {
    if (!window.confirm(`Deactivate ${row['full_name']}? Their history will be retained.`)) return;
    await this.perform(async () => {
      await this.request(`/admin/users/${row['user_id']}`, 'DELETE');
      await this.load();
      this.notice.set('Account deactivated. Its history was retained.');
    });
  }
  async uploadRoster(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    await this.perform(async () => {
      const body = new FormData();
      body.append('file', file);
      const result = await this.request<{ imported: number }>(
        '/admin/enrollment-roster',
        'POST',
        body,
      );
      await this.load();
      this.notice.set(`${result.imported} enrollment records imported.`);
    });
    (event.target as HTMLInputElement).value = '';
  }
  async togglePermission(row: Row) {
    await this.perform(async () => {
      await this.request('/admin/permissions', 'PUT', {
        role: row['role'],
        permission: row['permission'],
        enabled: !row['enabled'],
      });
      await this.load();
    });
  }
  async toggleSetting(row: Row) {
    await this.perform(async () => {
      await this.request('/admin/settings', 'PUT', {
        key: row['setting_key'],
        value: row['setting_value'] === 'true' ? 'false' : 'true',
      });
      await this.load();
    });
  }
  async history(row: Row) {
    await this.perform(async () => {
      this.details.set(row);
      this.revisions.set(
        await this.request(`/admin/information/${row['information_id']}/revisions`),
      );
    });
  }
  async restoreRevision(row: Row) {
    await this.perform(async () => {
      await this.request(
        `/admin/information/${row['information_id']}/restore/${row['revision_id']}`,
        'POST',
        {},
      );
      this.revisions.set(
        await this.request(`/admin/information/${row['information_id']}/revisions`),
      );
      await this.load();
      this.notice.set('Revision restored. A new history entry records this change.');
    });
  }
  async logout() {
    await this.perform(async () => {
      await this.auth.logout();
      this.form.set('');
      this.details.set(null);
      this.rows.set([]);
      await this.router.navigate(['/sign-in']);
    });
  }
}
