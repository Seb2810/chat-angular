import { Injectable,PLATFORM_ID,inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { AuthState } from '../auth-state';

export interface Profil {

  id: number;
  email : string;
  name   : string;
  password :string;
  createdAt : any;
  isActive : boolean;
  verified : boolean ;
  document : Document[];

}

export interface Document {
  id:number;
  filename : string;
  mimetype : string;
  fileData : Uint8Array;
  createdAt :any;

}

@Injectable({
  providedIn: 'root',
})
export class Info {
private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);
  private authState = inject(AuthState);

  // Initialisation directe au lieu de passer par un ngOnInit() qui ne se déclencherait jamais
  isBrowser = signal<boolean>(isPlatformBrowser(this.platformId));
  idToSend = signal<number>(0);

  constructor() {
    // La logique d'initialisation d'un service se fait dans le constructeur
    const user = this.authState.user();
    console.log("user img ", user);

    if (!user?.id) {
      console.warn('⚠️ Aucun utilisateur authentifié pour le moment dans le service Info');
    } else {
      console.log('👤 Utilisateur détecté dans le service Info :', user);
    }
  }

  // 1. Remplacement de <Profil[]> par <any> (ou votre interface Profil unique) car l'API renvoie un seul objet, pas un tableau
  // 2. Remplacement de http.post par http.get
  showProfil(id: number): Observable<any> {
    console.log('🚨 ENVOI DE LA DEMANDE DE PROFIL... id :', id);
    return this.http.get<any>(`/api/profil/${id}`);
  }

    showProfilUser(id: number): Observable<any> {
    console.log('🚨 ENVOI DE LA DEMANDE DE PROFIL USER... id :', id);
    return this.http.get<any>(`/api/profil-user/${id}`);
  }

      showInfo(id: number): Observable<any> {
    console.log('🚨 ENVOI DE LA DEMANDE DE PROFIL USER... id :', id);
    return this.http.get<any>(`/api/info-user/${id}`);
  }
}

