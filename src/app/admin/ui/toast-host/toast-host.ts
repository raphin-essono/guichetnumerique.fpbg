import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminToastService } from '../../core/toast.service';

@Component({
  selector: 'app-admin-toast-host',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast-host.html',
})
export class AdminToastHost {
  toast = inject(AdminToastService);
}
