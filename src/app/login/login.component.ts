
import {Component, inject} from '@angular/core';

import {Router,RouterLink} from '@angular/router';

import {FormsModule} from '@angular/forms';

import {AuthService} from '../services/auth.service';

import {AuthState} from '../auth-state';


@Component({
  standalone: true,

  selector: 'app-login',

  imports: [FormsModule, RouterLink],

  templateUrl: './login.component.html',

  styleUrls: [ './login.component.css' ],
})
export class LoginComponent {


  email = '';

  password = '';


  private auth = inject(AuthService);


  private authState = inject(AuthState);


  private router = inject(Router);


  login(): void {

    console.log( '🔐 LOGIN...');

    this.auth.login(this.email, this.password ).subscribe({

        /**
         * ==================================================
         * LOGIN RÉUSSI
         * ==================================================
         */

        next: (response) => {


          console.log( '✅ LOGIN RÉUSSI', response);


          /**
           * IMPORTANT
           *
           * Le serveur vient de créer
           * le cookie access_token.
           *
           * On met également l'utilisateur
           * dans AuthState.
           */

          this.authState.user.set(response.user);


          this.authState.loading.set(false);


          console.log('👤 AuthState.user :',  this.authState.user());


          /**
           * Maintenant le guard trouvera
           * un utilisateur authentifié.
           */

          if (response.user.role === 'ADMIN') {

          this.router.navigate(['/dashboard']);

          } else {

          this.router.navigate(['/chat']); // Espace utilisateur classique

        }

          //this.router.navigate(['/dashboard']);

        },


        /**
         * ==================================================
         * LOGIN ÉCHOUÉ
         * ==================================================
         */

        error: (error) => {


          console.error( '❌ Erreur de connexion :', error );

        },

      });

  }

}

