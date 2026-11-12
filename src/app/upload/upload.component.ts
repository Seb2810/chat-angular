import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { HttpClient, HttpEventType } from '@angular/common/http'; // 👈 TRÈS IMPORTANT
import { Router } from '@angular/router';
import { AuthState } from '../auth-state';
import { User } from '../services/auth.service';
import { ShowComponent } from '../show/show.component';

@Component({
  selector: 'app-upload',
  templateUrl: './upload.component.html',
  standalone: true,
  imports: [ShowComponent],
  // Ajoutez CommonModule si vous utilisez encore *ngIf à la place des blocs @if
})
export class UploadComponent implements OnInit {
  @ViewChild(ShowComponent) private showComponent?: ShowComponent;

  private http = inject(HttpClient);
  private authState = inject(AuthState);
  private router = inject(Router);

  selectedFile: File | null = null;
  uploadProgress: number | null = null; // Stocke le pourcentage (0 à 100)
  currentUser: User | null = null;

  ngOnInit(): void {

    this.authState.init().subscribe(user => {
      if (!user) {
        this.router.navigate(['/home']);
      } else {
        this.currentUser = user;
      }
    });



  }

  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.uploadProgress = null; // Réinitialise la barre au choix d'un nouveau fichier
    }
  }

  uploadFile(): void {
    if (!this.selectedFile) return;

    const user = this.authState.user();
    if (!user?.id) return;

    const formData = new FormData();
    formData.append('file', this.selectedFile, this.selectedFile.name);
    formData.append('userId', String(user.id));

    this.http.post('/api/upload', formData, {
      reportProgress: true, // Demande à Angular de suivre la progression
      observe: 'events'     // Reçoit tous les événements (Sent, UploadProgress, Response, etc.)
    }).subscribe({
      next: (event: any) => {
        // Détection de la progression de l'envoi
        if (event.type === HttpEventType.UploadProgress) {
          const total = event.total ?? this.selectedFile!.size; // Fallback sur la taille du fichier si total est indéfini
          this.uploadProgress = Math.round(100 * (event.loaded / total));
          console.log(`Progression : ${this.uploadProgress}%`);
        }
        // Détection de la réponse finale du serveur
        else if (event.type === HttpEventType.Response) {
          console.log('Upload réussi !', event.body);
          this.showComponent?.refreshImages();
          this.uploadProgress = 100; // Optionnel : figer à 100% brièvement
          setTimeout(() => {
            this.uploadProgress = null;
            this.selectedFile = null;
          }, 1000);
        }
      },
      error: (err) => {
        console.error('Erreur lors de l\'upload', err);
        this.uploadProgress = null;
      }
    });
  }
}
