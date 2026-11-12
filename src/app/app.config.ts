import { ApplicationConfig, inject, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideApollo } from 'apollo-angular';
import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { HttpLink } from 'apollo-angular/http';
import { InMemoryCache } from '@apollo/client/core';
import { PLATFORM_ID,  } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { authInterceptor } from './interceptor/auth.interceptor';
import { AuthRefreshService } from './services/auth-refresh.service';

export function createApollo(): any {
  const httpLink = inject(HttpLink);
  const platformId = inject(PLATFORM_ID);

  // 1. Détecter si on est sur le serveur Node.js ou dans le navigateur
  const isServer = isPlatformServer(platformId);

  // 2. Si on est sur le serveur, IL FAUT l'URL absolue avec le port
const uri = isServer
    ? 'http://localhost:4000/graphql'
    : '/graphql';

      console.log('-->uri app.config' , uri);
    //const uri = '/graphql';

  if (isServer) {
    console.log('🌐 SSR Apollo configuré sur :', uri);
  }

  console.log(
    '🚀 Apollo',
    isServer ? 'SSR' : 'BROWSER',
    '→',
    uri
  );

  return {
    cache: new InMemoryCache(),
    link: httpLink.create({ uri }),
  };
}
export const appConfig: ApplicationConfig = {

providers: [

provideZoneChangeDetection({
  eventCoalescing: true,
}),


provideRouter(
  routes,
),


provideHttpClient(
  withFetch(),

  withInterceptors([
    authInterceptor,
  ]),
),


provideClientHydration(
  withEventReplay(),
),


provideApollo(
  createApollo,
),


AuthRefreshService,


],

};

