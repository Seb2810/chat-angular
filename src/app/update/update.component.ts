
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UserService } from '../services/user.service';
import { AuthState } from '../auth-state';

@Component({
  selector: 'app-update',
  imports: [ReactiveFormsModule],
  standalone: true,
  templateUrl: './update.component.html',
  styleUrl: './update.component.css'
})



export class UpdateComponent implements OnInit {


  private auth = inject(AuthState);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  id: string | null = null;
  currentUser: any = null;

 loadAdminData() {
    console.log('Chargement des statistiques sensibles...');
  }

ngOnInit(): void {
  this.id = this.route.snapshot.paramMap.get('id');

  if (!this.id) {
    return;
  }

  this.auth.init().subscribe(user => {

    if (user && user.role === 'ADMIN') {

   console.log('☀️admin identifié OK');

    this.loadAdminData();

        this.currentUser = user;

        this.userService.getUser(Number(this.id)).subscribe({

          next: (user) => {
      console.log('Utilisateur reçu :', user);
      console.log('USER =', user);
      console.log('NAME =', user?.name);
      console.log('EMAIL =', user?.email);
      if (!user) {
        return;
      }

      this.userForm.patchValue({
        name: user.name,
        email: user.email,
      });

      console.log('Formulaire après patch :', this.userForm.value);
    },

    error: (error) => {
      console.error('Erreur récupération utilisateur :', error);
    }
  });

} else {
        console.log('​❌​ERREUR -- Admin non identifié');
         this.router.navigate(['/home']);
      }
    });


}

    private fb = inject(FormBuilder);
    private userService = inject(UserService);

    userForm = this.fb.group({

      name: [
        "",
        Validators.required
      ],

      email: [
        "",
        [
          Validators.required,
          Validators.email
        ]
      ],


    });

    submit() {

    if (this.userForm.invalid) {
    this.userForm.markAllAsTouched();
    return;
  }

  const { name, email } = this.userForm.getRawValue();

  this.userService.updateUser(
    String(this.id),
    name!,
    email!
  ).subscribe({

          next: (result) => {

            console.log( "Utilisateur mis à jour :" , result.data );

            this.userForm.reset();

          },

          error: (error) => {

            console.error("Erreur lors de la mise à jour :",error );

          }

        });

    }

  }

