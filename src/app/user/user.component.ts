import { Component, inject, OnInit, signal } from '@angular/core';
import { UserService } from '../services/user.service';
import { UserFormComponent } from '../user-form/user-form.component';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { AuthState } from '../auth-state';

interface User {
  id: number;
  name: string;
  email: string;
}


@Component({
  selector: 'app-user',
  imports: [UserFormComponent],
  standalone: true,
  templateUrl: './user.component.html',
  styleUrl: './user.component.css'
})
export class UserComponent implements OnInit {

  private auth = inject(AuthState);

  private router = inject(Router);

  // Injection moderne avec inject()
  private userService = inject(UserService);

  // Remplace avantageusement ngOnInit et le signal initial vide.
  // Ce signal se mettra à jour automatiquement grâce au cache d'Apollo.
  myUsers = toSignal(this.userService.getUsers(), { initialValue: [] });

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

  // 👇 Nouvelle méthode appelée au clic sur le bouton Supprimer
  onDeleteUser(id: any) {
    console.log('🚀 clicked id to delete : ', id)
    this.userService.deleteUser(id).subscribe({
      next: () => {
        console.log(`L'utilisateur ${id} a bien été supprimé.`);
      },
      error: (err) => {
        console.error("Erreur lors de la suppression :", err);
      }
    });
  }

 onUpdateUser(id: any) {

    console.log('🚀 clicked id to update' ,id );

    console.log('ID:', id);
console.log( 'ROUTES:',  this.router.config.map(r => ({path: r.path, component: r.component?.name})));

console.log('ROUTER CONFIG =' ,this.router.config.map(route => route.path));

console.log( 'URL AVANT NAVIGATION =',this.router.url);

const tree = this.router.createUrlTree(['/update', id]);

console.log( 'URL TREE =', tree.toString());

this.router.navigateByUrl(tree);

    this.router.navigate(['/update', id]);

}

}
