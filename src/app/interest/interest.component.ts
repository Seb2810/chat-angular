import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { AuthState } from '../auth-state';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-interest',
  standalone: true,
  imports: [CommonModule,FormsModule],
  templateUrl: './interest.component.html',
  styleUrl: './interest.component.css'
})
export class InterestComponent {

    private authState = inject(AuthService);
    private auth = inject(AuthState)
    interest= '';
    currentUser: any = null;

      ngOnInit(): void {
    const user = this.auth.user();

    if (!user?.id) {
      console.error('❌ Aucun utilisateur authentifié');
      return;
    }

    console.log('👤  utilisateur :', user);

   this.currentUser = user;

  }

submit(): void{

 console.log('🙈​🙈​ interets ', this.interest)

 this.authState.interest(this.interest ).subscribe({

          next: (result) => {

            console.log( "données envoyée:" , result );


          },

          error: (error) => {

            console.error("Erreur lors de l envoi :",error );

          }

        });
}

}
