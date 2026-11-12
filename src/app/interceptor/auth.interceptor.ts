
import {inject, PLATFORM_ID, REQUEST} from '@angular/core';

import { isPlatformBrowser,isPlatformServer} from '@angular/common';

import {HttpContextToken, HttpErrorResponse, HttpInterceptorFn} from '@angular/common/http';

import {catchError, switchMap, throwError} from 'rxjs';

import {Router} from '@angular/router';

import { AuthRefreshService} from '../services/auth-refresh.service';

import {AuthState} from '../auth-state';


/**
 * ==========================================================
 * SKIP AUTH REFRESH
 * ==========================================================
 *
 * true :
 *
 * la requête ne doit PAS déclencher
 * automatiquement un refresh.
 * ne pas envoyer le cookieet ne pas déclencher le mécanisme refresh si cette requête retourne 401
 * Utilisé pour :
 *
 * /login
 * /refresh
 * /logout
 */

export const SKIP_AUTH_REFRESH = new HttpContextToken<boolean>(() => false );

  /**
 * ==========================================================
 * AUTH REQUEST
 * ==========================================================
 *
 * true :
 * la requête utilise le contexte d'authentification.
 *
 * Cela permet notamment au SSR de recopier
 * le cookie reçu par le navigateur.
 */

export const AUTH_REQUEST = new HttpContextToken<boolean>( () => false );

/**
 * ==========================================================
 * AUTH INTERCEPTOR
 * ==========================================================
 */

export const authInterceptor: HttpInterceptorFn =
  (req, next) => {

    /**
     * ------------------------------------------------------
     * SERVICES
     * ------------------------------------------------------
     */

    const platformId = inject(PLATFORM_ID);


    const authRefresh = inject(AuthRefreshService);


    const authState = inject(AuthState);


    const router = inject(Router);

      /**
     * ------------------------------------------------------
     * AUTH REQUEST
     * ------------------------------------------------------
     */

    const isAuthRequest = req.context.get(AUTH_REQUEST);


    /**
     * ======================================================
     * SSR
     * ======================================================
     *
     * Pendant le SSR :
     *
     * navigateur
     *    ↓
     * cookie
     *    ↓
     * requête HTTP vers Angular SSR
     *
     * Angular SSR doit recopier ce cookie
     * vers les appels API effectués côté serveur.
     */

    if (isAuthRequest &&isPlatformServer(platformId)) {


      const request =inject(REQUEST);

      const cookie =request?.headers.get('cookie');


      console.log('🍪 INTERCEPTOR SSR');

      console.log( 'AUTH_REQUEST :', isAuthRequest);

      console.log( 'Cookie reçu par SSR :', cookie );


      if (cookie) {

        req =req.clone({setHeaders: {Cookie: cookie}});

      }

    }


    /**
     * ======================================================
     * WITH CREDENTIALS
     * ======================================================
     *
     * Autorise l'utilisation des cookies.
     */
  if (isAuthRequest) {req = req.clone({withCredentials: true });

    }
    /**
     * ======================================================
     * SKIP REFRESH
     * ======================================================
     *
     * IMPORTANT :
     *
     * On teste le HttpContext APRÈS avoir ajouté
     * les informations SSR et withCredentials.
     *
     * Le cookie continue donc à être envoyé.
     */

    if ( req.context.get(SKIP_AUTH_REFRESH)) {

      return next(req);

    }


    /**
     * ======================================================
     * REQUÊTE HTTP
     * ======================================================
     */

    return next(req).pipe(


      catchError((error) => {


        /**
         * ==================================================
         * ERREUR NON HTTP
         * ==================================================
         */

        if (
          !( error instanceof HttpErrorResponse )
        ) {

          return throwError( () => error );

        }


        /**
         * ==================================================
         * PAS UN 401
         * ==================================================
         *
         * Exemple :
         *
         * 400
         * 403
         * 404
         * 500
         *
         * On ne fait rien.
         */

        if (error.status !== 401) {

          return throwError(() => error);

        }


        /**
         * ==================================================
         * SSR
         * ==================================================
         *
         * Pour l'instant, on ne déclenche pas
         * automatiquement le refresh pendant le SSR.
         *
         * Le navigateur pourra le faire après
         * l'hydratation.
         */

        if (isPlatformServer(platformId) ) {


          console.log( '🚫 SSR : 401 → pas de refresh');


          return throwError(() => error);

        }


        /**
         * ==================================================
         * SÉCURITÉ SUPPLÉMENTAIRE
         * ==================================================
         *
         * Normalement SKIP_AUTH_REFRESH suffit.
         *
         * Mais on garde cette protection supplémentaire.
         */

        if (
          req.url.includes('/api/auth/login')
          ||
          req.url.includes('/api/auth/refresh')
          ||
          req.url.includes('/api/auth/logout')
        ) {


          return throwError(() => error);

        }


        /**
         * ==================================================
         * 401
         * ==================================================
         */

        console.log('🚨 401 → DEMANDE DE REFRESH');


        /**
         * ==================================================
         * REFRESH
         * ==================================================
         */

        return authRefresh.refresh().pipe(


          /**
           * ------------------------------------------------
           * REFRESH RÉUSSI
           * ------------------------------------------------
           */

          switchMap(() => {


            console.log('✅ REFRESH RÉUSSI');


            console.log('🔁 RETRY :',req.url);


            /**
             * Rejoue la requête originale.
             *
             * Le nouveau cookie sera utilisé
             * par le navigateur.
             */

            return next(req);

          }),


          /**
           * ------------------------------------------------
           * REFRESH ÉCHOUÉ
           * ------------------------------------------------
           */

          catchError((refreshError) => {


            console.error('❌ REFRESH ÉCHOUÉ', refreshError);


            /**
             * =================================================
             * SESSION TERMINÉE
             * =================================================
             */

            authState.forceLogout();


            /**
             * =================================================
             * REDIRECTION
             * =================================================
             *
             * Uniquement côté navigateur.
             */

            if (isPlatformBrowser(platformId)) {


              void router.navigate(['/login']);

            }


            /**
             * On renvoie l'erreur
             * à la requête originale.
             */

            return throwError(() => refreshError);

          }),

        );

      }),

    );

  };

