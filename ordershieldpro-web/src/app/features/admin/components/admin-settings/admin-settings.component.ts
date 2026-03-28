import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../../../core/services/api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { SystemSetting } from '../../../../core/models';

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [FormsModule, TranslateModule, LoadingSpinnerComponent],
  templateUrl: './admin-settings.component.html',
  styleUrl: './admin-settings.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminSettingsComponent implements OnInit {
  private apiService = inject(ApiService);
  private translate = inject(TranslateService);
  private toast = inject(ToastService);

  systemSettings = signal<SystemSetting[]>([]);
  loadingSettings = signal(false);
  savingAllSettings = signal(false);

  ngOnInit(): void {
    this.loadSettings();
  }

  private loadSettings(): void {
    this.loadingSettings.set(true);
    this.apiService.get<SystemSetting[]>('admin/settings').subscribe({
      next: (res) => {
        this.systemSettings.set(res || []);
        this.loadingSettings.set(false);
      },
      error: () => {
        this.loadingSettings.set(false);
        this.systemSettings.set([]);
      },
    });
  }

  saveAllSettings(): void {
    this.savingAllSettings.set(true);
    const settings = this.systemSettings();
    const requests = settings.map(setting =>
      this.apiService.put<void>('admin/settings', { key: setting.key, value: setting.value })
    );
    forkJoin(requests).subscribe({
      next: () => {
        this.savingAllSettings.set(false);
        this.toast.success(this.translate.instant('admin.settingsSaved'));
      },
      error: () => {
        this.savingAllSettings.set(false);
        this.toast.error(this.translate.instant('admin.failedSaveSetting'));
      },
    });
  }

  getSettingLabel(key: string): string {
    const tKey = `admin.settingLabel.${key}`;
    const translated = this.translate.instant(tKey);
    return translated !== tKey ? translated : key;
  }

  getSettingDescription(key: string, fallback: string): string {
    const tKey = `admin.settingDesc.${key}`;
    const translated = this.translate.instant(tKey);
    return translated !== tKey ? translated : fallback;
  }
}
