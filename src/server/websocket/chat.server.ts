import 'dotenv/config';

import {
  Server as HttpServer,
} from 'node:http';

import {
  Server,
  Socket,
} from 'socket.io';

import jwt, {
  JwtPayload,
} from 'jsonwebtoken';
import { prisma } from '../prisma';


/**
 * ========================================================
 * SOCKET AUTHENTIFIÉ
 * ========================================================
 */

interface AuthenticatedSocket extends Socket {

  user?: {
    id: string;
    email: string;
  };

}


/**
 * ========================================================
 * MESSAGE CHAT GLOBAL
 * ========================================================
 */

interface ChatMessage {

  id: string;

  userId: string;

  username: string;

  content: string;

  createdAt: string;

}


interface LeaveMessage {

username: string;

  message: string;

  createdAt: string;

}
/**
 * ========================================================
 * JWT
 * ========================================================
 */

const ACCESS_SECRET = process.env['JWT_SECRET'];


if (!ACCESS_SECRET) {

  throw new Error('JWT_SECRET est manquant dans le fichier .env');

}


const accessSecret: string = ACCESS_SECRET;


/**
 * ========================================================
 * UTILISATEURS EN LIGNE
 * ========================================================
 *
 * userId
 *    ↓
 * {
 *   username,
 *   joinedAt
 * }
 *
 * Les données sont uniquement en mémoire.
 *
 * Un redémarrage du serveur vide cette Map.
 */

const users = new Map<
  string,
  {
    username: string;
    joinedAt: Date;
    avatarUrl: string | null;
  }
>();


const userSockets = new Map<
  string,
  Set<string>
>();
/**
 * ========================================================
 * ROOM PRIVÉE
 * ========================================================
 *
 * Alice → Bob
 *
 * private:alice:bob
 *
 * Bob → Alice
 *
 * private:alice:bob
 *
 * Les deux utilisateurs obtiennent
 * exactement la même room.
 */

function createPrivateRoom(
  userId1: string,
  userId2: string,
): string {

  const ids = [
    userId1,
    userId2,
  ].sort();

  return `private:${ids[0]}:${ids[1]}`;
}


/**
 * ========================================================
 * CRÉATION DU SERVEUR CHAT
 * ========================================================
 */

export function createChatServer(httpServer: HttpServer) {

  const io = new Server(
    httpServer,
    {

      cors: {
        origin: 'http://localhost:4000',
        credentials: true,
      },

    },
  );


  /**
   * ======================================================
   * AUTHENTIFICATION SOCKET.IO
   * ======================================================
   */

  io.use(
    (
      socket: AuthenticatedSocket,
      next,
    ) => {

      try {

        /**
         * ------------------------------------------------
         * COOKIE
         * ------------------------------------------------
         */

        const cookieHeader = socket.handshake.headers.cookie;


        console.log('🍪 SOCKET COOKIE :',cookieHeader);


        if (!cookieHeader) {

          return next(new Error( 'Cookie manquant' ));

        }


        /**
         * ------------------------------------------------
         * RÉCUPÉRATION ACCESS TOKEN
         * ------------------------------------------------
         */

        const accessToken =
          cookieHeader
            .split(';')
            .map(
              cookie =>
                cookie.trim(),
            )
            .find(
              cookie =>
                cookie.startsWith(
                  'access_token=',
                ),
            )
            ?.split('=')[1];


        if (!accessToken) {

          return next( new Error('access_token manquant' ));

        }


        /**
         * ------------------------------------------------
         * VÉRIFICATION JWT
         * ------------------------------------------------
         */

        const payload =
          jwt.verify(
            accessToken,
            accessSecret,
          );


        if (typeof payload ==='string') {

          return next(new Error('JWT invalide'));

        }


        const jwtPayload = payload as JwtPayload;


        console.log('jwtPayload :',jwtPayload);


        /**
         * ------------------------------------------------
         * UTILISATEUR SOCKET
         * ------------------------------------------------
         */

        const userId = String(jwtPayload.sub);

        const email = String(jwtPayload['email']);


        if (!userId ||userId === 'undefined') {

          return next(new Error( 'Utilisateur JWT invalide' ) );

        }



        socket.user = {

          id: userId,

          email,

        };


        console.log('✅ SOCKET AUTHENTIFIÉ :',socket.user );


        next();

      } catch (error) {

        console.error('❌ SOCKET JWT invalide :',error);


        next(new Error('Authentification invalide'));

      }

    },
  );


  /**
   * ======================================================
   * CONNEXION
   * ======================================================
   */

  io.on('connection', async (socket: AuthenticatedSocket) => {


      console.log('🟢 SOCKET CONNECTÉ :' ,socket.id);


      console.log('👤 UTILISATEUR :', socket.user );


      /**
       * --------------------------------------------------
       * UTILISATEUR AUTHENTIFIÉ
       * --------------------------------------------------
       */

      const user = socket.user;


      if (!user) {

        socket.disconnect();

        return;

      }


      const userId = user.id;

      // ==================================================
    // RÉCUPÉRATION DU NAME DEPUIS PRISMA
    // ==================================================
    const dbUser = await prisma.user.findUnique({
      where: { id: Number(userId) },
      select: {
        name: true,
        email: true,
        documents: {
          where: { mimetype: { startsWith: 'image/' } },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true },
        },
      },
    });

    // Priorité au name, fallback sur l'email
    const username = dbUser?.name?.trim() || dbUser?.email || 'Utilisateur';
    const avatarUrl = dbUser?.documents[0] ? `/api/chat-avatar/${userId}`: null;

      //const username = user.email;


        if (userId) {

  socket.join(`user:${userId}`);

  console.log(`👤 ${socket.user?.email} rejoint sa room personnelle user:${userId}`,);
}
      let sockets = userSockets.get(userId);

      if (!sockets) {

        sockets = new Set<string>();

        userSockets.set(userId, sockets);

      }

      sockets.add(socket.id );

      /**
       * --------------------------------------------------
       * CHAT GLOBAL
       * --------------------------------------------------
       */

      const privateRooms = new Set<string>();

      socket.join('global-chat');


      /**
       * --------------------------------------------------
       * AJOUT UTILISATEUR EN LIGNE
       * --------------------------------------------------
       */

      users.set(
        userId,
        {
          username,
          joinedAt: new Date(),
          avatarUrl,
        },
      );


      /**
       * --------------------------------------------------
       * CONSTRUIT LA LISTE DES UTILISATEURS
       * --------------------------------------------------
       */

      const getOnlineUsers =
        () => {

    return Array.from(users.entries()).map(([id, user]) => ({
      id,
      username: user.username,
      avatarUrl: user.avatarUrl,
    }));
        };


      /**
       * --------------------------------------------------
       * LISTE INITIALE
       * --------------------------------------------------
       *
       * On envoie directement la liste
       * au nouvel utilisateur.
       */

      socket.emit('users-list', getOnlineUsers() );


      /**
       * --------------------------------------------------
       * INFORME LES AUTRES UTILISATEURS
       * --------------------------------------------------
       */

      socket.to('global-chat').emit('user-joined',
        {
          username,
          users:
          getOnlineUsers(),
        },
      );





          /**
       * ==================================================
       * OUVRIR UNE ROOM PRIVÉE
       * ==================================================
       */
    socket.on('open-private-chat',(otherUserId: string) => {

    /**
     * ====================================================
     * VALIDATION
     * ====================================================
     */

    if (!otherUserId) {
      return;
    }


    /**
     * Impossible de discuter
     * avec soi-même.
     */

    if (
      userId === otherUserId
    ) {

      return;

    }


    /**
     * Vérifie que l'utilisateur
     * existe et est en ligne.
     */

    if (!users.has(otherUserId)) {

      console.warn( '⚠️ Utilisateur introuvable :',otherUserId );

      return;

    }


    /**
     * ------------------------------------------------------
     * UTILISATEUR DESTINATAIRE
     * ------------------------------------------------------
     */

    const otherUser = users.get(otherUserId);

    if (!otherUser) {

      console.warn( '⚠️ Utilisateur introuvable :', otherUserId);

      return;
    }


    /**
     * ====================================================
     * ROOM PRIVÉE
     * ====================================================
     */

    const roomId = createPrivateRoom(userId, otherUserId);


    /**
     * ====================================================
     * ALICE REJOINT LA ROOM
     * ====================================================
     */

    socket.join(roomId);


    /**
     * ====================================================
     * MÉMORISE LA ROOM
     * ====================================================
     */

    privateRooms.add(roomId);


    console.log(`🔐 ${userId} rejoint ${roomId}`,);


      /**
     * ======================================================
     * 1️⃣ INFORMER L'INITIATEUR
     * ======================================================
     *
     * Pour lui, l'autre utilisateur est `otherUserId`.
     */

    socket.emit(
      'private-chat-open',
      {
        userId:otherUserId,

        username:otherUser.username,

        roomId,
      },
    );

    /**
     * ====================================================
     * RÉCUPÈRE LES SOCKETS DE BOB
     * ====================================================
     */

    const targetSockets =  userSockets.get(otherUserId);


    if (!targetSockets) {

      return;

    }


    /**
     * ====================================================
     * INFORME BOB
     * ====================================================
     */

    for (
      const targetSocketId of targetSockets
    ) {

      io.to(targetSocketId).emit('private-chat-open',{
          userId,
          username,
          roomId,
        },
      );

    }

  },
);


      /**
       * ==================================================
       * REJOINDRE UNE ROOM PRIVÉE
       * ==================================================
       */

      socket.on('join-private-chat',(otherUserId: string,) => {


          /**
           * ----------------------------------------------
           * VALIDATION
           * ----------------------------------------------
           */

          if (
            !userId || !otherUserId
          ) {

            return;

          }


          /**
           * Impossible de discuter
           * avec soi-même.
           */

          if (
            userId === otherUserId
          ) {

            return;

          }


          /**
           * ----------------------------------------------
           * ROOM
           * ----------------------------------------------
           */

          const roomId = createPrivateRoom(userId , otherUserId);


          socket.join(roomId);


          console.log( `🔐 ${userId} rejoint ${roomId}`, );

          /**
           * ----------------------------------------------
           * INFORME L'AUTRE UTILISATEUR
           * ----------------------------------------------
           */

          io.to(`user:${otherUserId}`).emit(
            'private-chat-opened',
            {
              roomId,
              user: {
                id: userId,
                username: socket.user?.email,
              },
            },
          );

        },
      );


      // ==================================================
  // (OPTIONNEL) QUITTER UNE ROOM PRIVÉE
  // ==================================================
  socket.on('leave-private-chat', (otherUserId: string) => {

    if (!otherUserId) return;

    const roomId = createPrivateRoom(userId, otherUserId);

    socket.leave(roomId);

    privateRooms.delete(roomId);

    console.log(`🚪 ${username} quitte ${roomId}`);
  });

      /**
       * ==================================================
       * MESSAGE PRIVÉ
       * ==================================================
       */

      socket.on(
  'sendPrivateMessage',
  (
    data: {
      toUserId: string;
      text: string;
    },
  ) => {

     console.log('📨 MESSAGE REÇU PAR LE SERVEUR');
    console.log('   socket.id      :', socket.id);
    console.log('   socket.user.id :', socket.user?.id);
    console.log('   toUserId       :', data.toUserId);
    console.log('   text           :', data.text);

    console.log('👥 userSockets =',Array.from(userSockets.entries()));

    /**
     * ==================================================
     * VALIDATION
     * ==================================================
     */

    if (!data || !data.toUserId) {

      console.warn( '⚠️ Destinataire manquant'  );

      return;
    }


    if (!userId) {
      console.warn( '⚠️ Expéditeur non authentifié');

      return;
    }


    /**
     * ==================================================
     * DESTINATAIRE
     * ==================================================
     */

    const targetSockets =userSockets.get(data.toUserId);


    if ( !targetSockets ||targetSockets.size === 0 ) {

      console.warn( '⚠️ Destinataire non connecté :',data.toUserId);

      return;
    }

    const senderId = socket.user?.id;

    if (!senderId) {
      console.error('❌ senderId introuvable');
      return;
    }

    const senderSockets =userSockets.get(userId,
  );

    console.log( '📤 sockets expéditeur :', senderSockets );

    console.log( '📥 sockets destinataire :',  targetSockets );

    /**
     * ==================================================
     * MESSAGE
     * ==================================================
     */

    const text = data.text?.trim();


    if (!text) {
      return;
    }


    /**
     * ==================================================
     * CRÉATION MESSAGE
     * ==================================================
     */

    const message = {

      id: crypto.randomUUID(),

      fromUserId: userId,

      toUserId: data.toUserId,

      text,

      createdAt: new Date().toISOString(),

    };


    console.log('🔐 MESSAGE PRIVÉ :', message);


    /**
     * ==================================================
     * ENVOI À L'EXPÉDITEUR
     * ==================================================
     */


    if (senderSockets ) {

      for ( const socketId of senderSockets) {

    console.log( '📤 Envoi à expéditeur :',socketId,);

    io.to( socketId ).emit( 'privateMessage',  message );

      }

    }


    /**
     * ==================================================
     * ENVOI AU DESTINATAIRE
     * ==================================================
     */

    for (
      const socketId
      of targetSockets
    ) {

      io.to(
        socketId,
      ).emit(
        'privateMessage',
        message,
      );

        }

      },
    );

      /**
       * ==================================================
       * MESSAGE CHAT GLOBAL
       * ==================================================
       */

      socket.on(
        'sendMessage',
        (
          content: unknown,
        ) => {


          /**
           * ----------------------------------------------
           * VALIDATION
           * ----------------------------------------------
           */

          if (
            typeof content !== 'string') {

            return;

          }


          const message = content.trim();


          if (!message) {

            return;

          }


          /**
           * ----------------------------------------------
           * CRÉATION MESSAGE
           * ----------------------------------------------
           */

          const chatMessage:
            ChatMessage = {

            id: crypto.randomUUID(),

            userId: userId,

            username:username,

            content: message,

            createdAt:new Date().toISOString(),

          };


          console.log( '💬 MESSAGE GLOBAL :',chatMessage);


          /**
           * ----------------------------------------------
           * ENVOI CHAT GLOBAL
           * ----------------------------------------------
           */

          io.to(
            'global-chat',
          ).emit(
            'newMessage',
            chatMessage,
          );

        },
      );


      /**
       * ==================================================
       * DÉCONNEXION
       * ==================================================
       */

      socket.on('disconnect', (reason) => {

          // 1. Quitter toutes les rooms privées de ce socket
    for (const roomId of privateRooms) {

      socket.leave(roomId);

      console.log(`🚪 ${username} quitte ${roomId} (disconnect)`);

    }

    privateRooms.clear();

    // 2. Gestion des sockets multiples

          const sockets = userSockets.get(userId);

        if (sockets) {

          sockets.delete(socket.id);

          if (sockets.size === 0) {

            userSockets.delete( userId);

            users.delete(userId);

            // ==================================================
      const leaveMessage: ChatMessage = {
        id: crypto.randomUUID(),
        userId: 'system',
        username: username,
        content: `${username} a quitté le chat`,
        createdAt: new Date().toISOString(),
      };

      io.to('global-chat').emit('newMessage', leaveMessage);

            // On informe les autres seulement quand le dernier socket part
      const onlineUsers = Array.from(users.entries()).map(([id, u]) => ({
        id,
        username: u.username,
        avatarUrl: u.avatarUrl,
      }));

      io.to('global-chat').emit('users-list', onlineUsers);


          }

        }

     console.log( '🔴 SOCKET DÉCONNECTÉ :',  socket.id, reason);


          /**
           * ----------------------------------------------
           * SUPPRESSION UTILISATEUR
           * ----------------------------------------------
           */

          users.delete(userId);


          /**
           * ----------------------------------------------
           * NOUVELLE LISTE
           * ----------------------------------------------
           */

          const onlineUsers =
            Array.from(
              users.entries(),
            ).map(
              ([id, user]) => ({
                id,
                username:
                  user.username,
                avatarUrl: user.avatarUrl,
              }),
            );


          /**
           * ----------------------------------------------
           * INFORME LES UTILISATEURS
           * ----------------------------------------------
           */

          io.to('global-chat',).emit('users-list',onlineUsers);

        },
      );

    },
  );


  return io;

}
