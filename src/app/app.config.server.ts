import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes, RenderMode } from '@angular/ssr'; // Tout provient d'ici sous Angular 21
import { appConfig } from './app.config';

const serverConfig: ApplicationConfig = {
  providers: [
    // Sous Angular 21, le routage serveur est imbriqué dans provideServerRendering via withRoutes
    provideServerRendering(
      withRoutes([
        { path: '**', renderMode: RenderMode.Server }
      ])
    )
  ]
};

export const config = mergeApplicationConfig(appConfig, serverConfig);

