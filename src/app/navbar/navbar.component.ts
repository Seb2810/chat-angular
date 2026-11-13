import { Component, effect, inject, signal } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Info } from '../services/info';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthState } from '../auth-state';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive, CommonModule],
  standalone:true,
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent {

  menuShow = false;

  toggleNavbar(){
    this.menuShow = !this.menuShow;
  }

  profil = signal<any | null>(null);

  authState = inject(AuthState);

  infoState = inject(Info);

  private router = inject(Router);

  constructor() {
    effect((onCleanup) => {
      const user = this.authState.user();
      const userId = Number(user?.id);

      if (!Number.isInteger(userId) || userId <= 0) {
        this.profil.set(null);
        return;
      }

      this.profil.set(null);
      const subscription = this.infoState.showInfo(userId).subscribe({
        next: (data) => {
          this.profil.set(data);
          console.log('profil INFO ->', data);
        },
        error: (err) => console.error('Erreur API profil', err),
      });

      onCleanup(() => subscription.unsubscribe());
    });
  }

  logout(): void {

    this.authState.logout();

    this.router.navigate(['/login']);

  }
}
