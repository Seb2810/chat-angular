import { Component, inject, OnInit, signal, PLATFORM_ID, afterNextRender } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { AuthState } from '../auth-state';
import z, { any } from 'zod';
import { FlowbiteService } from '../services/flowbite.service';
import { ForgottenFormData, forgottenSchema } from '../schemas/forgotten-schema';
//import { RegisterFormData } from '../schemas/register.schemas';

@Component({
  selector: 'app-forgetpswd',
  standalone: true,
  imports: [FormsModule , ReactiveFormsModule , CommonModule],
  templateUrl: './forgetpswd.component.html',
  styleUrl: './forgetpswd.component.css'
})
export class ForgetpswdComponent {
  // 1. Utilisation de Signals Angular 19 (meilleures performances de rendu)

  renewedPassword = signal('');
  loading = signal(false);
  messageSucces = signal('');
  registerForm: FormGroup;
    formSubmitted = false;

  serverError: string | null = null;
  // 2. Injections modernes
  private authService = inject(AuthService);


    constructor(
      private fb: FormBuilder,
    //  private flowbiteService: FlowbiteService,
    ) {

       this.registerForm = this.fb.group({
           email: ['', [Validators.required, Validators.email]],
            birthdate: ['', Validators.required],
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

  onDateChange(event: any) {

  const value = event.target.value;

  this.registerForm.get('birthdate')?.setValue(value);

  console.log('Date sélectionnée:', value);
}


 getErrorMessage(controlName: keyof ForgottenFormData): string | null {

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
    if (control.errors['birthdate']) return 'Format de date invalide';
    }

    // Priorité 2 : validation Zod (seulement si le champ est "trop correct" pour Angular)
    if (control.value && this.formSubmitted) {
      try {
        const fieldSchema = forgottenSchema.shape[controlName];
        fieldSchema.parse(control.value);
      } catch (err) {
        if (err instanceof z.ZodError) {
          return err.issues[0].message;
        }
      }
    }

    return null;
  }



  renew(): void {

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
  const formValue = this.registerForm.value as ForgottenFormData;

     console.log('🍄​ formValue traitement et envoie des données');

      const validatedData = forgottenSchema.parse(formValue);

      this.loading.set(true);


    console.log('🔐 Demande de renouvellement de mot de passe...');

 console.log('🖖 🖖 Date de naissance pour renouvellement de mot de passe...' , validatedData.birthdate);

    // Exemple d'appel API imaginé selon votre architecture :
    this.authService.updatePassword(validatedData.email , validatedData.birthdate).subscribe({
      next: (response: any) => {
        this.loading.set(false);
        this.messageSucces.set('Votre mot de passe a bien été réinitialisé !');
        console.log('Mot de passe mis à jour avec succès en BDD');
        this.renewedPassword.set(response?.password ?? '');
      },
      error: (err) => {
        this.loading.set(false);
        console.error('Erreur lors de la mise à jour du mot de passe', err);
      }
    });

}
}
