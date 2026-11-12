import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, inject, PLATFORM_ID, signal } from '@angular/core';
import { AuthState } from '../auth-state';
import { DocumentService, StoredImage } from '../services/document.service';

@Component({
  selector: 'app-show',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './show.component.html',
})
export class ShowComponent {

  private authState = inject(AuthState);
  private imageState = inject(DocumentService);
    private platformId = inject(PLATFORM_ID);

  images = signal<StoredImage[]>([]);
   isBrowser = signal<boolean>(false);
  imageVersion = signal<number>(0);

  ngOnInit(): void {

       // On vérifie si on est sur le navigateur
    this.isBrowser.set(isPlatformBrowser(this.platformId));

    const user = this.authState.user();

    console.log("user img " , user)

    if (!user?.id) {
      console.error('❌ Aucun utilisateur authentifié');
      return;
    }

    console.log('👤  utilisateur :', user);

    this.refreshImages();
  }

  refreshImages(): void {
    this.imageState.showFile().subscribe({
      next: images => {
        this.images.set(images);
        this.imageVersion.update(version => version + 1);
      },
      error: error => console.error('Erreur lors du chargement des images :', error),
    });
  }

  onClick(id: number): void {
    this.imageState.deleteFile(id).subscribe({
      next: () => this.images.update(images => images.filter(image => image.id !== id)),
      error: error => console.error('Erreur lors de la suppression de l’image :', error),
    });
  }
}
//customElements.define('app-show', ShowComponent);
