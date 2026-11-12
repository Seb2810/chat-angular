
import {HttpClient, HttpContext} from '@angular/common/http';

import { inject, Injectable,  PLATFORM_ID} from '@angular/core';

import { isPlatformServer} from '@angular/common';

import { Observable} from 'rxjs';

import { SKIP_AUTH_REFRESH, AUTH_REQUEST} from '../interceptor/auth.interceptor';


/**
 * ==========================================================
 * USER
 * ==========================================================
 */

export interface User {
  id?: string;
  email: string;
  role:string;
}
 export interface Register{

    email: string;
  password: string;
  name: string;
  surname: string;
  birthdate?: string;
  numero:string;
  zipCode: string;
  address: string;
  street?: string;
  city?: string;
  country?: string;


 }

/**
 * ==========================================================
 * AUTH SERVICE
 * ==========================================================
 */

@Injectable({
  providedIn: 'root',
})
export class AuthService {


  private http =inject(HttpClient);


  private platformId =inject(PLATFORM_ID);


  /**
   * --------------------------------------------------------
   * API URL
   * --------------------------------------------------------
   *
   * Navigateur :
   *
   *   /api
   *
   * SSR :
   *
   *   http://localhost:4000/api
   */

  private apiUrl =isPlatformServer(this.platformId) ? 'http://localhost:4000/api' : '/api';


  /**
   * ========================================================
   * LOGIN
   * ========================================================
   */

  login(email: string, password: string): Observable<{ user: User }> {


    return this.http.post<{user: User;}>(`${this.apiUrl}/auth/login`,
      {
        email,
        password,
      },

      {
        /**
         * Le navigateur doit accepter
         * le Set-Cookie envoyé par le serveur.
         */
        withCredentials: true,

        /**
         * Si login retourne 401,
         *
         * NE PAS essayer de faire un refresh.
         */
        context: new HttpContext().set(AUTH_REQUEST, true).set(SKIP_AUTH_REFRESH, true),

      },
    );

  }


  /**
   * ========================================================
   * ME
   * ========================================================
   *
   * Vérifie si l'utilisateur possède
   * une session valide.
   *
   * Cette requête NE possède PAS
   * SKIP_AUTH_REFRESH.
   *
   * Donc :
   *
   * /me
   *   ↓
   * 401
   *   ↓
   * interceptor
   *   ↓
   * refresh
   */

  me(): Observable<User> {

  return this.http.get<User>(`${this.apiUrl}/auth/me`,
    {
      context: new HttpContext().set(AUTH_REQUEST,true),

      withCredentials: true,
    },
  );

}


  /**
   * ========================================================
   * REFRESH
   * ========================================================
   *
   * Cette méthode est appelée uniquement
   * par AuthRefreshService.
   */

  refresh(): Observable<{ user: User }> {


    return this.http.post<{ user: User; }>(`${this.apiUrl}/auth/refresh`, {},

      {
        /**
         * Envoie le refresh_token
         * au serveur.
         */
        withCredentials: true,

        /**
         * IMPORTANT
         *
         * Si /refresh retourne 401,
         * l'interceptor ne doit surtout pas
         * essayer de refaire un refresh.
         */
        context:new HttpContext()
        .set(AUTH_REQUEST, true)
        .set(SKIP_AUTH_REFRESH, true),
      },
    );

  }


  /**
   * ========================================================
   * LOGOUT
   * ========================================================
   */

  logout() {


    return this.http.post( `${this.apiUrl}/auth/logout`,
      {},

      {
        withCredentials: true,

        /**
         * Un logout ne doit jamais
         * déclencher un refresh.
         */
        context:new HttpContext()
        .set(AUTH_REQUEST, true)
        .set(SKIP_AUTH_REFRESH, true),
      },
    );

  }

modifyPassword(email: string , password: string  , nouveaupswd: string){

console.log("🍀 🍀 data send to service  mail :" , email , " password : " , password ," Nouveau password : " , nouveaupswd );


    return this.http.post(
      `${this.apiUrl}/modify-password`,
     {
        email,
        password,
        nouveaupswd,

      },
      {
        /**
         * Le navigateur doit accepter
         * le Set-Cookie envoyé par le serveur.
         */
        withCredentials: true,

        /**
         * Si login retourne 401,
         *
         * NE PAS essayer de faire un refresh.
         */
        // context: new HttpContext().set(AUTH_REQUEST, true).set(SKIP_AUTH_REFRESH, true),
      },
    );


}



  updatePassword(email: string , birthdate : string){

console.log("🍀 🍀 data send to service  mail :" , email , " birthdate : " , birthdate );


    return this.http.post(
      `${this.apiUrl}/forget-password`,
     {
        email,
        birthdate,

      },
      {
        /**
         * Le navigateur doit accepter
         * le Set-Cookie envoyé par le serveur.
         */
        withCredentials: true,

        /**
         * Si login retourne 401,
         *
         * NE PAS essayer de faire un refresh.
         */
        // context: new HttpContext().set(AUTH_REQUEST, true).set(SKIP_AUTH_REFRESH, true),
      },
    );
  }


  register(data: {

    civility:string;
    email: string;
    password: string;
    name: string;
    surname: string;
    birthdate?: string;
    numero: string;
    zipCode: string;
    street?: string;
    city?: string;
    country?: string;
    message?:string;
    interest?:string;
  }) {
    console.log("🍀 🍀 data send to service " , data );

    return this.http.post<{ user: Register }>(
      `${this.apiUrl}/register`,
      data,
      {
        /**
         * Le navigateur doit accepter
         * le Set-Cookie envoyé par le serveur.
         */
        withCredentials: true,

        /**
         * Si login retourne 401,
         *
         * NE PAS essayer de faire un refresh.
         */
        // context: new HttpContext().set(AUTH_REQUEST, true).set(SKIP_AUTH_REFRESH, true),
      },
    );
  }


  interest(data:string){

        console.log("🍀 🍀 data send to service " , data );

       // const tableau= data.split("-")

       // console.log('data : ' , tableau)

         return this.http.post(
      `${this.apiUrl}/interest`,
      { interest: data },
      {
        /**
         * Le navigateur doit accepter
         * le Set-Cookie envoyé par le serveur.
         */
        withCredentials: true,


      },
    );
  }


  infoUpdate(id: string | number, data: {

    civility:string;
    name: string;
    surname: string;
    sex: string | null;
    birthdate: string;
    numero: string;
    zipCode: string;
    street: string;
    city: string;
    message: string;
    interest: string;
  }) {
    return this.http.put<{ message: string; info: Record<string, unknown> }>( `${this.apiUrl}/info-update/${id}`, data, {

        withCredentials: true,

      },
    );
  }

}
