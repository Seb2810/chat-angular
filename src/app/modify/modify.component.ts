import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthState } from '../auth-state';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-modify',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './modify.component.html',
  styleUrl: './modify.component.css'
})
export class ModifyComponent {

  private authState = inject(AuthState);

  email = '';


  password = '';

  nouveaupswd = '';

  resultat = signal('');

  private auth = inject(AuthService);

  private router = inject(Router);
  // ======================================================
  // INITIALISATION
  // ======================================================
  ngOnInit(): void {
    const user = this.authState.user();

    if (!user?.id) {
      console.error('❌ Aucun utilisateur authentifié');
      return;
    }

    console.log('👤 Chat utilisateur :', user);

  }

  modify() : void{

 this.auth.modifyPassword(this.email , this.password , this.nouveaupswd).subscribe({
      next: (response: any) => {
  console.log('✅ Modification du mot de passe réussi');
   this.resultat.set(response?.password ?? '');
      },
      error: (err:any) => {

        console.error('Erreur lors de Modification du mot de passe  ' , err);
      }
    });

  }
}
