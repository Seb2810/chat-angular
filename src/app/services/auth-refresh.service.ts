
import {
  Injectable,
  inject,
} from '@angular/core';

import {
  Observable,
  catchError,
  finalize,
  shareReplay,
  throwError,
} from 'rxjs';

import {
  AuthService,
  User,
} from './auth.service';


/**
 * ==========================================================
 * AUTH REFRESH SERVICE
 * ==========================================================
 *
 * Responsable du verrouillage du refresh.
 */

@Injectable({
  providedIn: 'root',
})
export class AuthRefreshService {


  private auth =
    inject(AuthService);


  /**
   * --------------------------------------------------------
   * REFRESH EN COURS
   * --------------------------------------------------------
   *
   * null :
   * aucun refresh en cours.
   *
   * Observable :
   * un refresh est actuellement en cours.
   */

  private refresh$:
    Observable<{ user: User }> | null = null;


  /**
   * ========================================================
   * REFRESH
   * ========================================================
   */

  refresh(): Observable<{ user: User }> {


    /**
     * ======================================================
     * VERROU
     * ======================================================
     *
     * Si un refresh est déjà en cours,
     * on retourne EXACTEMENT le même Observable.
     *
     * Aucune deuxième requête HTTP
     * ne sera créée.
     */

    if (this.refresh$) {

      console.log(
        '🔒 REFRESH DÉJÀ EN COURS → ATTENTE',
      );

      return this.refresh$;
    }


    /**
     * ======================================================
     * NOUVEAU REFRESH
     * ======================================================
     */

    console.log(
      '🔄 DÉMARRAGE DU REFRESH',
    );


    this.refresh$ =
      this.auth.refresh().pipe(


        /**
         * ==================================================
         * PARTAGE
         * ==================================================
         *
         * Tous les appels à refresh()
         * reçoivent le même résultat.
         */

        shareReplay({
          bufferSize: 1,
          refCount: true,
        }),


        /**
         * ==================================================
         * FIN DU REFRESH
         * ==================================================
         *
         * Succès OU erreur :
         *
         * on libère le verrou.
         */

        finalize(() => {

          console.log(
            '🔓 REFRESH TERMINÉ → VERROU LIBÉRÉ',
          );

          this.refresh$ = null;

        }),

      );


    return this.refresh$;
  }

}

