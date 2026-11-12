import {
  Injectable,
  inject,
  PLATFORM_ID,
  signal,
} from '@angular/core';

import {
  isPlatformBrowser,
} from '@angular/common';

import {
  io,
  Socket,
} from 'socket.io-client';

import {
  Observable,
  Subject,
} from 'rxjs';

import sanitizeHtml from 'sanitize-html';

/**
 * ========================================================
 * MESSAGE CHAT GLOBAL
 * ========================================================
 */

export interface GeneralMessage {

  id: string;

  userId: string;

  username: string;

  content: string;

  createdAt: string;

}


/**
 * ========================================================
 * MESSAGE PRIVÉ
 * ========================================================
 */

export interface PrivateMessage {

  id: string;

  fromUserId: string;

  toUserId: string;

  text: string;

  createdAt: string;

}


/**
 * ========================================================
 * UTILISATEUR EN LIGNE
 * ========================================================
 */

export interface OnlineUser {

  id: string;

  username: string;

  avatarUrl: string | null;

}


/**
 * ========================================================
 * OUVRIR UNE TAB EN PRIVATE ROOM
 * ========================================================
 */

export interface PrivateChatTab {
  id: string;
  username: string;
}

/**
 * ========================================================
 * SANITIZE (protection XSS + nettoyage)
 * ========================================================
 */



function sanitizeMessage(input: string, maxLength = 2000): string {
  if (typeof input !== 'string') return '';

  const cleaned = sanitizeHtml(input, {
    allowedTags: [],          // aucun tag HTML autorisé
    allowedAttributes: {},
  });

  return cleaned.trim().slice(0, maxLength);
}

@Injectable({
  providedIn: 'root',
})
export class ChatService {

private privateChatOpenSubject =
  new Subject<{
    userId: string;
    username: string;
    roomId: string;
  }>();


  /**
   * ======================================================
   * PLATFORM
   * ======================================================
   */

  private platformId = inject(PLATFORM_ID);


  /**
   * ======================================================
   * SOCKET
   * ======================================================
   */

  private socket:Socket | null = null;


  /**
   * ======================================================
   * UTILISATEURS EN LIGNE
   * ======================================================
   */

  readonly onlineUsers =signal<OnlineUser[]>([]);


  /**
   * ======================================================
   * MESSAGES PRIVÉS
   * ======================================================
   *
   * Tous les messages privés reçus
   * restent en mémoire pendant la session.
   */

  readonly privateMessages = signal<PrivateMessage[]>([]);


      /**
   * ======================================================
   * ONGLET CHAT ROOM
   * ======================================================
   *
   * Ouvrir un nouvel onglet du chat
   *
   */
  readonly privateChatOpen$ = this.privateChatOpenSubject.asObservable();

  readonly privateTabs = signal<PrivateChatTab[]>([]);

readonly activePrivateUserId = signal<string | null>(null);

  /**
   * ======================================================
   * CONNEXION
   * ======================================================
   */

  connect(): void {


    /**
     * ----------------------------------------------------
     * SSR
     * ----------------------------------------------------
     *
     * Socket.IO ne doit jamais être créé
     * pendant le SSR.
     */

    if (!isPlatformBrowser( this.platformId)
    ) {

      return;

    }


    /**
     * ----------------------------------------------------
     * Évite les doubles connexions
     * ----------------------------------------------------
     */

    if (this.socket) {

      return;

    }


    console.log(
      '🔌 Connexion Socket.IO...',
    );


    /**
     * ----------------------------------------------------
     * CRÉATION SOCKET
     * ----------------------------------------------------
     */

    this.socket =
      io(
        'http://localhost:4000',
        {
          withCredentials: true,

          transports: [
            'websocket',
            'polling',
          ],
        },
      );


    /**
     * ====================================================
     * CONNECT
     * ====================================================
     */

    this.socket.on('connect', () => {

        console.log(  '🟢 Socket connecté :',  this.socket?.id);

      },
    );


    /**
     * ====================================================
     * DISCONNECT
     * ====================================================
     */

    this.socket.on('disconnect', (reason) => {

        console.log( '🔴 Socket déconnecté :',   reason);

      },
    );


    /**
     * ====================================================
     * ERREUR CONNEXION
     * ====================================================
     */

    this.socket.on('connect_error', ( error) => {

        console.error( '❌ Socket erreur :',error.message );

      },
    );


    /**
     * ====================================================
     * UTILISATEURS EN LIGNE
     * ====================================================
     */

    this.socket.on( 'users-list',( users: OnlineUser[]) => {

        console.log( '👥 Utilisateurs en ligne :', users);


        this.onlineUsers.set(users);

      },
    );



        /**
     * ====================================================
     * UTILISATEUR REJOINT
     * ====================================================
     */
this.socket.on('private-chat-open',
  (
    data: {
      userId: string;
      username: string;
      roomId: string;
    },
  ) => {

    console.log(  '🔔 Demande de conversation privée reçue :',data);


    /**
     * Informe le ChatComponent
     * qu'une conversation doit être ouverte.
     */

    this.privateChatOpenSubject.next(data);

  },
);


    /**
     * ====================================================
     * OUVERTURE D'UNE FENETRE PRIVEE
     * ====================================================
     */

this.socket.on('private-chat-opened',
  (
    data: {
      roomId: string;
      user: {
        id: string;
        username: string;
      };
    },
  ) => {

    console.log('📨 Demande ouverture chat privé reçue :', data );

    /**
     * Vérifie si l'onglet existe déjà.
     */
    const exists = this.privateTabs().some( tab => tab.id === data.user.id );

    /**
     * Ajoute l'onglet seulement s'il n'existe pas.
     */
    if (!exists) {

      this.privateTabs.update(
        tabs => [
          ...tabs,
          {
            id: data.user.id,
            username: data.user.username,
          },
        ],
      );

    }

    /**
     * Active automatiquement l'onglet.
     */
    this.activePrivateUserId.set(data.user.id);

    console.log('✅ Onglet privé ajouté automatiquement', this.privateTabs());

  },
);


    /**
     * ====================================================
     * UTILISATEUR REJOINT
     * ====================================================
     */

    this.socket.on(
      'user-joined',
      (
        data: {
          username: string;
          users: OnlineUser[];
        },
      ) => {

        console.log( '👤 Utilisateur connecté :',data.username);

        this.onlineUsers.set(data.users);

      },
    );


    /**
     * ====================================================
     * MESSAGE PRIVE
     * ====================================================
     */

    this.socket.on(
      'privateMessage',
      (
        message: PrivateMessage,
      ) => {

        console.log('🔐 Message privé reçu :', message,);
        console.log('📨📨📨 PRIVATE MESSAGE REÇU PAR CHAT SERVICE');
        console.log('📨 message =', message);
        console.log('📨 socket.id =', this.socket?.id);


        this.privateMessages.update(
          messages => [
            ...messages,
            message,
          ],
        );

         console.log( '📨 privateMessages après ajout =',  this.privateMessages(),);

      },
    );

  }


  /**
   * ======================================================
   * REJOINDRE CHAT PRIVÉ
   * ======================================================
   */
joinPrivateChat(
  user: PrivateChatTab,
): void {

  if (!this.socket) {

    console.error(  '❌ Socket non connecté' );

    return;

  }

  /**
   * Ouvre immédiatement l'onglet
   * chez l'utilisateur qui clique.
   */
  this.openPrivateTab(
    user,
  );

  /**
   * Demande au serveur de rejoindre
   * la room et de prévenir l'autre utilisateur.
   */
  this.socket.emit('join-private-chat', user.id);

}


  /**
   * ======================================================
   * ENVOYER MESSAGE PRIVÉ
   * ======================================================
   */

  sendPrivateMessage(
    toUserId: string,
    text: string,
  ): void {


    if (!this.socket) {

      console.error( '❌ Socket non connecté' );

      return;

    }


    const message = sanitizeMessage(text);


    if (!message) {

      return;

    }


    this.socket.emit(
      'sendPrivateMessage',
      {
        toUserId,
        text: message,
      },
    );

  }


  /**
   * ======================================================
   * ENVOYER MESSAGE GLOBAL
   * ======================================================
   */

  sendMessage(
    message: string,
  ): void {


    if (!this.socket) {

      console.error( '❌ Socket non connecté');

      return;

    }


    const content = sanitizeMessage(message);


    if (!content) {

      return;

    }


    this.socket.emit('sendMessage', content);

  }


  /**
   * ======================================================
   * OUVRIR UN CHAT PRIVE
   * ======================================================
   */

  openPrivateChat(
  userId: string,
): void {

  if (!this.socket) {

    console.error('❌ Socket non connecté' );

    return;

  }


  this.socket.emit( 'open-private-chat', userId);

}


  /**
   * ======================================================
   * OUVRIR UN ONGLET PRIVEE
   * ======================================================
   */
openPrivateTab(
  user: PrivateChatTab,
): void {

  const exists = this.privateTabs().some(tab => tab.id === user.id,);

  if (!exists) {

    this.privateTabs.update(
      tabs => [
        ...tabs,
        user,
      ],
    );

  }

  this.activePrivateUserId.set(user.id);

}

  /**
   * ======================================================
   * RECEVOIR MESSAGE GLOBAL
   * ======================================================
   */

  messages():Observable<GeneralMessage> {


    return new Observable(
      subscriber => {


        if (!this.socket) {

          subscriber.error('Socket non connecté' );

          return;

        }


        const handler =
          (
            message: GeneralMessage,
          ) => {

            subscriber.next(message);

          };


        this.socket.on('newMessage', handler);


        /**
         * ----------------------------------------------
         * NETTOYAGE
         * ----------------------------------------------
         */

        return () => {

          this.socket?.off( 'newMessage', handler);

        };

      },
    );

  }

  /**
 * ======================================================
 * QUITTER UN CHAT PRIVÉ
 * ======================================================
 */
leavePrivateChat(otherUserId: string): void {
  if (!this.socket) {
    console.error('❌ Socket non connecté');
    return;
  }

  this.socket.emit('leave-private-chat', otherUserId);
}

  /**
   * ======================================================
   * DÉCONNEXION
   * ======================================================
   */

  disconnect(): void {


    if (!this.socket) {

      return;

    }


    console.log( '🔌 Déconnexion Socket.IO');


    this.socket.disconnect();


    this.socket = null;


    /**
     * On vide uniquement l'état
     * local Angular.
     *
     * Rien n'est sauvegardé.
     */

    this.onlineUsers.set([]);

    this.privateMessages.set([]);

  }

}
