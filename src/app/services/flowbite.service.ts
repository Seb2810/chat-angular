import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { initFlowbite } from 'flowbite';

@Injectable({
  providedIn: 'root'
})
export class FlowbiteService {

private platformId = inject(PLATFORM_ID);

  loadFlowbite(callback: (flowbite: any) => void) {
    // Vérifie si on est bien dans le navigateur avant de charger le script
    if (isPlatformBrowser(this.platformId)) {
      import('flowbite').then((flowbite) => {
        callback(flowbite);
      });
    }
  }
}
