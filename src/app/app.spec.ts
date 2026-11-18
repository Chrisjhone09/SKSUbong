import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { AuthStore } from './core/services/auth.store';
import { SignInComponent } from './features/auth/sign-in.component';

describe('SK-SUbong', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideRouter([])] }),
  );

  it('shows the lazy sign-in feature', () => {
    const fixture = TestBed.createComponent(SignInComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('input[autocomplete="username"]')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Welcome back');
  });

  it('keeps privileged navigation hidden for pending roles', () => {
    const auth = TestBed.inject(AuthStore);
    auth.account.set({
      user_id: 1,
      school_id: 'SYS-001',
      full_name: 'System Administrator',
      role: 'SystemAdministrator',
      account_status: 'Active',
      verification_status: 'Pending',
    });
    auth.permissions.set(['users.manage', 'permissions.manage']);
    expect(auth.pages()).not.toContain('User Accounts');
    auth.account.update((account) => ({ ...account!, verification_status: 'Verified' }));
    expect(auth.pages()).toContain('User Accounts');
  });
});
