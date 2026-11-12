import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { map } from 'rxjs';
import { AuthState } from './auth-state';

export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthState);
  const router = inject(Router);

  console.log('🛡️ AUTH GUARD');

  // Récupère les rôles autorisés définis sur la route (ex: ['ADMIN'] ou ['USER', 'ADMIN'])
  // Si rien n'est défini, on peut considérer par défaut que 'USER' et 'ADMIN' ont accès
  //const expectedRoles = route.data['expectedRoles'] as Array<string> | undefined;


return auth.init().pipe(
    map((user) => {
      console.log('🛡️ ADMIN GUARD - Utilisateur récupéré :', user);

       console.log('🛡️ AUTH GUARD - Route demandée :', state.url);

        // 1. L'utilisateur n'est pas connecté du tout -> Redirection login 🔐
      if (!user) {
        console.log('❌ AUTH GUARD - Non connecté, redirection /login');
        return router.createUrlTree(['/login']);
      }
    // 2. L'utilisateur est connecté et va sur la page /chat -> Tout le monde a le droit (USER et ADMIN) ✅
      if (state.url.startsWith('/chat')) {
        console.log('✅ AUTH GUARD - Accès autorisé à /chat pour', user.role);
        return true;
      }
    if (state.url.startsWith('/modify')) {
        console.log('✅ AUTH GUARD - Accès autorisé de modifier pour', user.role);
        return true;
      }
        if (state.url.startsWith('/upload')) {
        console.log('✅ AUTH GUARD - Accès autorisé de modifier pour', user.role);
        return true;
      }

       if (state.url.startsWith('/show')) {
        console.log('✅ AUTH GUARD - Accès autorisé de modifier pour', user.role);
        return true;
      }
         if (state.url.startsWith('/board')) {
        console.log('✅ AUTH GUARD - Accès autorisé de modifier pour', user.role);
        return true;
      }

             if (state.url.startsWith('/interest')) {
        console.log('✅ AUTH GUARD - Accès autorisé de modifier pour', user.role);
        return true;
      }

                  if (state.url.startsWith('/info-update')) {
        console.log('✅ AUTH GUARD - Accès autorisé de modifier pour', user.role);
        return true;
      }

                  if (state.url.startsWith('/userboard')) {
        console.log('✅ AUTH GUARD - Accès autorisé de modifier pour', user.role);
        return true;
      }

        if (state.url.startsWith('/profile/')) {
        console.log('✅ AUTH GUARD - Accès autorisé de modifier pour', user.role);
        return true;
      }

        // 3. L'utilisateur est ADMIN -> Accès autorisé partout (y compris le dashboard) ✅
      if (user.role === 'ADMIN') {
        console.log('✅ AUTH GUARD - Accès autorisé pour l\'Admin');
        return true;
      }

     // 4. L'utilisateur est USER et tente d'aller ailleurs que sur le chat (ex: /dashboard) ❌
      // On le redirige vers le chat en toute sécurité.
      console.log(`❌ AUTH GUARD - Rôle USER interdit sur ${state.url}, redirection vers /chat`);
      return router.createUrlTree(['/chat']);
    })
  );
};
