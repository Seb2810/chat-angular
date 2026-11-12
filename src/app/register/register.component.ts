import { afterNextRender, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { RegisterFormData, registerSchema } from '../schemas/register.schemas';
import z from 'zod';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { from } from 'rxjs';
import { FlowbiteService } from '../services/flowbite.service';
import { AuthState } from '../auth-state';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule , CommonModule],
  standalone :true,
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
 registerForm: FormGroup;
  formSubmitted = false;
  loading = false;
  serverError: string | null = null;
  civils = [
    {  name: 'Mr' },
    {  name: 'Mme' },

  ];

    sexe = [
    {  name: 'Male' },
    { name: 'Female' },

  ];

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,   // ← on utilise AuthService maintenant
    private router: Router,
    private flowbiteService: FlowbiteService,
    private authState : AuthState,

  ) {

   /* this.flowbiteService.loadFlowbite((flowbite) => {
      flowbite.initFlowbite();
    });*/

    this.registerForm = this.fb.group({
      civility: ['Mr', [Validators.required, Validators.minLength(2)]],
      name: ['', [Validators.required, Validators.minLength(2)]],
      surname: ['', [Validators.required, Validators.minLength(2)]],
      sex: [null, Validators.required],
      numero: ['', Validators.required],
      street: ['', Validators.required],
      town: ['', Validators.required],
      zipCode: ['', [Validators.required, Validators.pattern(/^\d{5}(-\d{4})?$/)]], // exemple US, adapte selon pays
      country: ['', Validators.required],
      birthdate: ['', Validators.required],
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
     message: ['', [
      Validators.required,
      Validators.minLength(50),
    ]],
    interest: ['', [Validators.required]]
    });


      // S'exécute uniquement côté client (essentiel pour le SSR)
    afterNextRender(() => {
      import('flowbite').then((flowbite) => {
        // Initialisation globale
        flowbite.initFlowbite();

        // Cibler l'élément input du calendrier
        const datepickerEl = document.getElementById('default-datepicker') as HTMLInputElement;

        if (datepickerEl) {
          // Instanciation manuelle du calendrier Flowbite
          // @ts-ignore
          const datepickerInstance = new flowbite.Datepicker(datepickerEl, {
            format: 'dd/mm/yyyy',
            autohide: true
          });

          // Écouter l'événement personnalisé de Flowbite lors du clic sur un jour
          datepickerEl.addEventListener('changeDate', (event: any) => {
            // event.detail.date contient l'objet Date, datepickerEl.value contient le texte formaté
            const formattedDate = datepickerEl.value;

            // Mise à jour du formulaire réactif
            this.registerForm.controls['birthdate'].setValue(formattedDate);

            // Forcer l'affichage de la console pour vérification
            console.log('Date sélectionnée via calendrier :', formattedDate);
          });
        }
      });
    });
  }

    ngOnInit() {

    // Optionnel : Suivre les changements de valeur en temps réel
    this.registerForm.controls['civility'].valueChanges.subscribe(value => {
      console.log('civilité sélectionnée via FormBuilder :', value);
    });
  }


/**
   * Retourne le message d'erreur pour un champ donné
   * Utilise d'abord les validateurs Angular, puis Zod si pertinent
   */
  getErrorMessage(controlName: keyof RegisterFormData): string | null {
    const control = this.registerForm.get(controlName);

    if (!control) return null;

    // On n'affiche les erreurs que si le champ a été touché OU formulaire soumis
    if (!control.touched && !this.formSubmitted) {
      return null;
    }

    // Priorité 1 : erreurs Angular
    if (control.errors) {
      if (control.errors['required']) return 'Ce champ est requis';
      if (control.errors['email']) return 'Format d\'email invalide';
      if (control.errors['minlength']) {
        return `Minimum ${control.errors['minlength'].requiredLength} caractères`;
      }
      if (control.errors['pattern']) {
        if (controlName === 'zipCode') return 'Code postal invalide';
      }
    }

    // Priorité 2 : validation Zod (seulement si le champ est "trop correct" pour Angular)
    if (control.value && this.formSubmitted) {
      try {
        const fieldSchema = registerSchema.shape[controlName];
        fieldSchema.parse(control.value);
      } catch (err) {
        if (err instanceof z.ZodError) {
          return err.issues[0].message;
        }
      }
    }

    return null;
  }

  /**
   * Vérifie si un champ a une erreur visible
   */
  hasError(controlName: keyof RegisterFormData): boolean {
    return !!this.getErrorMessage(controlName);
  }

onDateChange(event: any) {

  const value = event.target.value;

  this.registerForm.get('birthdate')?.setValue(value);

  console.log('Date sélectionnée:', value);
}



  login(email:string , password:string): void {

    console.log( '🔐 LOGIN...');

    this.authService.login(email, password ).subscribe({

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

          if (response.user.role !== 'USER') {

          this.router.navigate(['/register']);

          } else {

          this.router.navigate(['/upload']); // Espace utilisateur classique

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

  onSubmit() {

    console.log(this.registerForm.value);
    this.formSubmitted = true;
    this.serverError = null;
    this.registerForm.markAllAsTouched();

    // Stop si invalide selon Angular
    if (this.registerForm.invalid) {

   console.log('--- 🐵 Formulaire Angular Invalide ---');

    Object.keys(this.registerForm.controls).forEach(key => {

      const controlErrors = this.registerForm.get(key)?.errors;

      if (controlErrors != null) {

        console.log(`Champ invalide : "${key}" | Erreurs :`, controlErrors);
      }
    });
    return;
    }

    // Validation finale stricte avec Zod
    try {
      const formValue = this.registerForm.value as RegisterFormData;

     console.log('🍄​ formValue traitement et envoie des données');

      const validatedData = registerSchema.parse(formValue);
// Transformation du format de date
      /*  const payload = {
          ...validatedData,
          birthdate: validatedData.birthdate
            ? validatedData.birthdate.split('/').reverse().join('-')   // "28/09/1977" → "1977-09-28"
            : undefined,
        };
*/
      this.loading = true;

      // Appel API avec AuthService (recommandé)
      this.authService.register(validatedData).subscribe({

        next: (response:any) => {

          this.loading = false;

          alert('Inscription réussie ! Vous pouvez maintenant vous connecter.');

          this.registerForm.reset();

          this.formSubmitted = false;

          //this.router.navigate(['/login']);

          this.login(validatedData.email, validatedData.password);

        },
        error: (err:any) => {

          this.loading = false;
          console.error('Erreur inscription:', err);

          if (err.status === 409) {
            this.serverError = 'Cet email est déjà utilisé.';
          } else {
            this.serverError = 'Une erreur est survenue. Veuillez réessayer.';
          }
        },
      });
    } catch (err) {
      this.loading = false;

      if (err instanceof z.ZodError) {
        err.issues.forEach((error) => {
          const field = error.path[0] as string;
          this.registerForm.get(field)?.setErrors({ zodError: error.message });
        });
      } else {
        console.error('Erreur inattendue Zod:', err);
        this.serverError = 'Erreur de validation interne';
      }
    }
  }


}
