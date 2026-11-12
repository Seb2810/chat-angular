import { isPlatformBrowser } from '@angular/common';
import { Component, inject, PLATFORM_ID } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthState } from './auth-state';
import { NavbarComponent } from "./navbar/navbar.component";

@Component({
    selector: 'app-root',
    standalone: true,
    /*  template: `
      @if (authState.loading()) {
        <p>Chargement...</p>
      } @else {
        <router-outlet />
      }
    `
  ,*/
    templateUrl: './app.component.html',
    styleUrl: './app.component.css',
    imports: [RouterOutlet, NavbarComponent]
})
export class AppComponent {
  title = 'myproject-srr';
  authState = inject(AuthState);
  private platformId = inject(PLATFORM_ID);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.authState.init().subscribe();
    }

  }

}
