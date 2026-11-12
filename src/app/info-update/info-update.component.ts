import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AuthState } from '../auth-state';
import { Router } from '@angular/router';
import { Info } from '../services/info';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-info-update',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './info-update.component.html',
  styleUrl: './info-update.component.css',
})
export class InfoUpdateComponent implements OnInit, OnDestroy {
  private profilSubscription!: Subscription;
  private authState = inject(AuthState);
    private authService = inject(AuthService);
  private router = inject(Router);
  private profilState = inject(Info);
  private fb = inject(FormBuilder);

  registerForm = this.fb.group({
    civility: ['Mr', Validators.required],
    name: ['', [Validators.required, Validators.minLength(2)]],
    surname: ['', [Validators.required, Validators.minLength(2)]],
    sex: [''],
    birthdate: ['', Validators.required],
    numero: ['', Validators.required],
    street: ['', Validators.required],
    town: ['', Validators.required],
    zipCode: ['', Validators.required],
    message: ['', Validators.required],
    interest: ['', Validators.required],
  });

  civils = [{ name: 'Mr' }, { name: 'Mme' }];
  sexes = [{ name: 'Male' }, { name: 'Female' }];
  profil = signal<any | null>(null);
  currentUser: any = null;
  formSubmitted = false;
  serverError: string | null = null;

  ngOnInit(): void {
    this.authState.init().subscribe((user: any) => {
      if (!user) {
        this.router.navigate(['/home']);
      } else {
        console.log('🔥 user board data ', user);
        this.currentUser = user;

        // 1. On écoute l'observable (ex: provenant de votre service)
        this.profilSubscription = this.profilState.showProfil(user.id).subscribe({
          next: (data) => {
            if (data) {
              this.profil.set(data);
              const info = data.info?.[0] ?? data;
              const birthdate = info.birthdate
                ? new Date(info.birthdate).toLocaleDateString('fr-FR')
                : '';

              this.registerForm.patchValue({
                civility: info.civility ?? 'Mr',
                name: info.name ?? '',
                surname: info.surname ?? '',
                sex: info.sex ?? '',
                birthdate,
                numero: info.numero ?? '',
                street: info.street ?? '',
                town: info.town ?? '',
                zipCode: info.zipCode ?? '',
                interest: Array.isArray(info.interest)
                  ? info.interest.join('-')
                  : String(info.interest ?? ''),
                message: info.words ?? '',
              });
            }
          },
          error: (err) => console.error('Erreur lors du chargement du profil', err)
        });
      }
    });
  }

  // Toujours nettoyer la souscription à la destruction du composant
  ngOnDestroy(): void {
    if (this.profilSubscription) {
      this.profilSubscription.unsubscribe();
    }
  }

  getErrorMessage(controlName: string): string | null {
    const control = this.registerForm.get(controlName);
    if (!control || (!control.touched && !this.formSubmitted) || !control.errors) {
      return null;
    }

    if (control.errors['required']) return 'Ce champ est requis';
    if (control.errors['minlength']) {
      return `Minimum ${control.errors['minlength'].requiredLength} caractères`;
    }

    return 'Valeur invalide';
  }

  onDateChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.registerForm.controls.birthdate.setValue(value);
  }

  onSubmit(): void {
    this.formSubmitted = true;
    this.serverError = null;
    this.registerForm.markAllAsTouched();

    if (this.registerForm.invalid) {
      return;
    }

    const value = this.registerForm.getRawValue();
    const payload = {
      civility: value.civility ?? 'Mr',
      name: value.name ?? '',
      surname: value.surname ?? '',
      sex: value.sex || null,
      birthdate: value.birthdate ?? '',
      numero: value.numero ?? '',
      zipCode: value.zipCode ?? '',
      street: value.street ?? '',
      city: value.town ?? '',
      message: value.message ?? '',
      interest: value.interest ?? '',
    };

    this.authService.infoUpdate(this.currentUser.id, payload).subscribe({
      next: (response: any) => {
        console.log('reponse ', response);
      },
      error: (err: any) => {
        console.log('error ', err);
      }
    });
  }
}
