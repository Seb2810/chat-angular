import { inject, Injectable } from "@angular/core";
import { Apollo } from "apollo-angular";
import { catchError, map } from "rxjs/operators";

import { GET_USERS, ONE_USER} from "../graphql/user.query";
import { CREATE_USER, DELETE_USER, UPDATE_USER} from "../graphql/user.mutations";
import { of } from "rxjs";

export interface User {
  id: number;
  name: string;
  email: string;
}

interface GetUsersResponse {
  users: User[];
}

interface GetUserResponse {
 oneUser: User;
}

@Injectable({
  providedIn: "root",
})
export class UserService {
  private readonly apollo = inject(Apollo);

getUsers() {
    return this.apollo
      .watchQuery<GetUsersResponse>({
        query: GET_USERS,
        // Supprimez fetchPolicy temporairement pour tester avec le cache par défaut
      })
      .valueChanges.pipe(
        map((result) => {
          // Sécurité : si pas de données ou s'il y a des erreurs GraphQL
          if (!result || !result.data) {
            console.warn("⚠️ Pas de données reçues de GraphQL :", result.error);
            return [];
          }
          return result.data.users;
        }),
        catchError((err) => {
          console.error("❌ Erreur critique lors de l'appel GraphQL :", err);
          return of([]); // Renvoie un tableau vide plutôt que de faire crasher le composant
        })
      );
  }


getUser(id: number) {
  return this.apollo
    .watchQuery<GetUserResponse>({
      query: ONE_USER,
      variables: { id },
      fetchPolicy: 'network-only'
    })
    .valueChanges.pipe(
      map((result) => {
        console.log('Réponse GraphQL complète :', result);

        if (!result.data) {
          console.warn(
            'Pas de données GraphQL :',
            result.error
          );

          return null;
        }

        console.log(
          'Utilisateur reçu :',
          result.data.oneUser
        );

        return result.data.oneUser;
      }),
      catchError((err) => {
        console.error(
          'Erreur GraphQL getUser :',
          err
        );

        return of(null);
      })
    );
}



  createUser(name: string, email: string, password: string, imageUrl?: string) {
    return this.apollo.mutate<any>({
      mutation: CREATE_USER,
      variables: {
        input: { name, email, password, imageUrl }
      },
      // 👇 AJOUT DE LA MISE À JOUR DU CACHE APOLLO
      update: (cache, { data }) => {
        // 1. Récupérer l'utilisateur créé depuis la réponse de la mutation
        // Note: Adaptez "createUser" si votre mutation retourne un autre nom de champ
        const newUser = data?.createUser;
        if (!newUser) return;

        try {
          // 2. Lire la liste des utilisateurs actuellement stockée dans le cache
          const existingData = cache.readQuery<GetUsersResponse>({
            query: GET_USERS,
          });

          if (existingData && existingData.users) {
            // 3. Réécrire le cache en ajoutant le nouveau membre à la fin
            cache.writeQuery({
              query: GET_USERS,
              data: {
                users: [...existingData.users, newUser],
              },
            });
          }
        } catch (e) {
          console.warn("Le cache de GET_USERS n'est pas encore initialisé", e);
        }
      }
    });
  }

  deleteUser(id: number) {
    return this.apollo.mutate<any>({
      mutation: DELETE_USER,
      variables: { id },

      // 👇 MISE À JOUR DU CACHE APRÈS SUPPRESSION
      update: (cache, { data }) => {
        // On récupère l'ID renvoyé par le serveur
        const deletedUser = data?.deleteUser;
        if (!deletedUser) return;

        try {
          // 1. Lire la liste actuelle dans le cache
          const existingData = cache.readQuery<GetUsersResponse>({
            query: GET_USERS,
          });

          if (existingData && existingData.users) {
            // 2. Filtrer la liste pour retirer l'utilisateur supprimé
            const updatedUsers = existingData.users.filter(
              (user) => user.id !== deletedUser.id
            );

            // 3. Réécrire le cache avec la nouvelle liste réduite
            cache.writeQuery({
              query: GET_USERS,
              data: {
                users: updatedUsers,
              },
            });
          }
        } catch (e) {
          console.warn("Impossible de mettre à jour le cache :", e);
        }
      },
    });
  }

   updateUser(id: string , name:string , email:string) {
    return this.apollo.mutate<any>({
      mutation: UPDATE_USER,
      variables: { id , name , email },


    });
  }
}
