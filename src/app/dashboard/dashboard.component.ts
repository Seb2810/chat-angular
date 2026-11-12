import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthState } from '../auth-state'; // Ajustez le chemin
import { Router, RouterLink, RouterLinkActive } from '@angular/router';


@Component({
  selector: 'app-dashboard',
  imports: [CommonModule,RouterLink, RouterLinkActive],
  standalone: true,
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  private auth = inject(AuthState);
  private router = inject(Router);

  // Vous pouvez exposer l'utilisateur au template si nécessaire
  // (Dépend de si auth.init() ou une autre propriété de AuthState expose un Signal ou un Observable public)
  currentUser: any = null;

  ngOnInit() {
    // Double sécurité au chargement (optionnel mais recommandé pour charger des données spécifiques à l'admin)
    this.auth.init().subscribe(user => {
      if (!user || user.role !== 'ADMIN') {
        this.router.navigate(['/chat']);
      } else {
        this.currentUser = user;
        this.loadAdminData(); // Lancez vos requêtes HTTP admin ici
      }
    });
  }

  loadAdminData() {
    console.log('Chargement des statistiques sensibles...');
  }
}
