import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-register',
  imports: [FormsModule, RouterLink],
  templateUrl: './register.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  firstName = '';
  middleName = '';
  lastName = '';
  schoolId = '';
  email = '';
  password = '';
  async register(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.notice.set('');
    try {
      const result = await this.api.post<{ message: string }>('/register', {
        firstName: this.firstName,
        middleName: this.middleName || null,
        lastName: this.lastName,
        schoolId: this.schoolId,
        email: this.email,
        password: this.password,
      });
      this.notice.set(result.message);
      this.password = '';
    } catch (error) {
      this.error.set((error as Error).message);
    } finally {
      this.busy.set(false);
    }
  }
}
