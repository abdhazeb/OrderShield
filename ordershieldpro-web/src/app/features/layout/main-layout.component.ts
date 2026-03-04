import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { BottomNavComponent } from '../../shared/components/bottom-nav/bottom-nav.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, BottomNavComponent],
  template: `
    <div class="app-shell">
      <app-header />
      <main class="main-content">
        <router-outlet />
      </main>
      <app-bottom-nav />
    </div>
  `,
  styles: [`
    .app-shell {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background: var(--surface-50);
    }
    .main-content {
      flex: 1;
      padding-bottom: 72px; /* space for bottom nav on mobile */
    }
    @media (min-width: 768px) {
      .main-content {
        padding-bottom: 0;
        max-width: 1200px;
        margin: 0 auto;
        width: 100%;
        padding-left: 2rem;
        padding-right: 2rem;
      }
    }
  `]
})
export class MainLayoutComponent {}
