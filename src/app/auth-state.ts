
import { Injectable,inject, signal} from '@angular/core';

import { catchError, finalize, tap} from 'rxjs/operators';

import { of, Observable} from 'rxjs';

import {AuthService, User} from './services/auth.service';


@Injectable({
  providedIn: 'root',
})
export class AuthState {


  /**
   * ========================================================
   * SERVICES
   * ========================================================
   */

  private auth = inject(AuthService);


  /**
   * ========================================================
   * ÉTAT UTILISATEUR
   * ========================================================
   *
   * null :
   * aucun utilisateur authentifié.
   *
   * User :
   * utilisateur authentifié.
   */

  readonly user = signal<User | null>(null);


  /**
   * ========================================================
   * CHARGEMENT
   * ========================================================
   *
   * true :
   * Angular est encore en train de vérifier
   * la session.
   *
   * false :
   * la vérification est terminée.
   */

  readonly loading = signal(true);


  /**
   * ========================================================
   * INIT
   * ========================================================
   *
   * Vérifie la session au démarrage
   * de l'application.
   *
   * /me
   *   ↓
   * cookie access_token
   *   ↓
   * serveur
   *   ↓
   * utilisateur
   */

init(): Observable<User | null> {

  console.log('🔐 AuthState.init()');

  this.loading.set(true);

  return this.auth.me().pipe(

    tap((user) => {

      console.log('✅ /me → utilisateur :', user);

      this.user.set(user);

    }),
    catchError((error: any) => {

      console.log('ℹ️ /me → utilisateur non authentifié', error);

      this.user.set(null);

      return of(null);

    }),
    finalize(() => {

      this.loading.set(false);

      console.log('🔓 AuthState loading = false');

    })
  );
}

  /**
   * ========================================================
   * LOGOUT
   * ========================================================
   *
   * Déconnexion volontaire de l'utilisateur.
   *
   * Appelle :
   *
   * POST /api/auth/logout
   *
   * puis vide l'état local.
   */

  logout(): void {


    console.log( '🚪 Déconnexion...');


    this.auth.logout().subscribe({

      /**
       * ----------------------------------------------------
       * LOGOUT RÉUSSI
       * ----------------------------------------------------
       */

      next: () => {


        console.log( '✅ Déconnexion réussie' );


        this.user.set(null);


        this.loading.set(false);

      },


      /**
       * ----------------------------------------------------
       * ERREUR
       * ----------------------------------------------------
       */

      error: (error) => {


        console.error( '❌ Erreur logout :', error);


        /**
         * Même si le serveur répond avec
         * une erreur, on peut considérer
         * l'état local comme déconnecté.
         */

        this.user.set(null);


        this.loading.set(false);

      },

    });

  }


  /**
   * ========================================================
   * FORCE LOGOUT
   * ========================================================
   *
   * Utilisé lorsque :
   *
   * access_token expiré
   *       ↓
   * refresh
   *       ↓
   * refresh_token invalide / expiré
   *
   * Dans ce cas AuthRefreshService / interceptor
   * considère la session comme terminée.
   *
   * IMPORTANT :
   *
   * On ne rappelle PAS /logout ici.
   *
   * L'objectif est simplement de remettre
   * l'état Angular à zéro.
   */

  forceLogout(): void {


    console.log('🚨 FORCE LOGOUT' );


    this.user.set(null);


    this.loading.set(false);

  }

}

