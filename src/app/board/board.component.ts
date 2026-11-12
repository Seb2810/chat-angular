import { Component,inject, OnInit, signal  } from '@angular/core';
import { AuthState } from '../auth-state';
import { Router } from '@angular/router';
import {Profil} from '../services/info'
import { Info } from '../services/info';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-board',
  imports: [DatePipe],
  templateUrl: './board.component.html',
  styleUrl: './board.component.css'
})
export class BoardComponent {
  private authState = inject(AuthState);
  private router = inject(Router);
  private profilState = inject(Info);

  currentUser: any = null;
  // Modification ici : initialisé à null au lieu d'un tableau []
  profil = signal<any | null>(null);
    selectImage = signal<any | null>(null);

  ngOnInit(): void {
    this.authState.init().subscribe((user: any) => {
      if (!user) {
        this.router.navigate(['/home']);
      } else {
        console.log('🔥 user board data ', user);
        this.currentUser = user;

        // Assurez-vous que showProfil fait bien un http.get
        this.profilState.showProfil(user.id).subscribe({
          next: (data) => this.profil.set(data),
          error: (err) => console.error('Erreur API profil', err)
        });
      }
    });
  }

   resetToDefaults() {
    this.selectImage.set('');
  }

  showImage(id:any){

     this.resetToDefaults();
    this.selectImage.set(id)


  }
}
