import { Component, OnDestroy, OnInit, computed, inject, signal} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {Router,RouterLink} from '@angular/router';
import { AuthState } from '../auth-state';
import { ChatService, OnlineUser, PrivateMessage,GeneralMessage} from '../services/chat.service';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [FormsModule, DatePipe ,RouterLink],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.css',
})
export class ChatComponent implements OnInit, OnDestroy {

  // ======================================================
  // SERVICES
  // ======================================================
  readonly chat = inject(ChatService);
  private authState = inject(AuthState);

  // ======================================================
  // UTILISATEUR CONNECTÉ
  // ======================================================
  get currentUserId(): string | null {
    const id = this.authState.user()?.id;
    return id != null ? String(id) : null;
  }

  // ======================================================
  // ONGLET ACTIF
  // ======================================================
  activeTab = signal<'main' | 'general' | string>('main');

  // ======================================================
  // MESSAGES GÉNÉRAUX
  // ======================================================
  messages = signal<GeneralMessage[]>([]);

  // ======================================================
  // INPUTS
  // ======================================================
  generalMessage = '';
  privateMessage = '';

  // ======================================================
  // CHAT PRIVÉ
  // ======================================================
  selectedUserId = signal<string | null>(null);

  privateTabs = signal<{ userId: string; username: string }[]>([]);

  /**
   * Liste des messages privés de la conversation active.
   * Calculée automatiquement dès qu'un message arrive ou que l'onglet change.
   */
  readonly privateMessagesOfActiveChat = computed(() => {
    const otherUserId = this.selectedUserId();
    const currentUserId = this.currentUserId;

    if (!otherUserId || !currentUserId) {
      return [];
    }

    const other = String(otherUserId);
    const current = String(currentUserId);

    return this.chat.privateMessages().filter((message) => {
      const from = String(message.fromUserId);
      const to = String(message.toUserId);

      return (
        (from === other && to === current) || // message reçu
        (from === current && to === other)    // message envoyé
      );
    });
  });

  // ======================================================
  // INITIALISATION
  // ======================================================
  ngOnInit(): void {
    const user = this.authState.user();

    if (!user?.id) {
      console.error('❌ Aucun utilisateur authentifié');
      return;
    }

    console.log('👤 Chat utilisateur :', user);

    // Écoute ouverture de conversation privée (côté destinataire)
    this.chat.privateChatOpen$.subscribe({
      next: (data) => {
        console.log('🔔 Ouverture chat privé reçue :', data);
        this.openPrivateChatFromServer(data);
      },
    });

    this.chat.connect();

    // Messages du chat général
    this.chat.messages().subscribe({
      next: (message) => {
        this.messages.update((msgs) => [...msgs, message]);
      },
      error: (err) => console.error('❌ Erreur chat :', err),
    });
  }

  // ======================================================
  // OUVERTURE AUTOMATIQUE (côté destinataire)
  // ======================================================
  openPrivateChatFromServer(data: {
    userId: string;
    username: string;
    roomId: string;
  }): void {
    console.log('🔔 Ouverture automatique du chat :', data);

    const otherId = String(data.userId);

    // Ne pas ouvrir sa propre conversation
    if (otherId === this.currentUserId) {
      return;
    }

    // Créer l'onglet s'il n'existe pas
    const exists = this.privateTabs().some((t) => t.userId === otherId);

    if (!exists) {
      this.privateTabs.update((tabs) => [
        ...tabs,
        { userId: otherId, username: data.username },
      ]);
      console.log('✅ Nouvel onglet privé créé :', data.username);
    }

    // Activer l'onglet
    this.activeTab.set(otherId);
    this.selectedUserId.set(otherId);

    // Rejoindre la room côté serveur
    this.chat.joinPrivateChat({
      id: otherId,
      username: data.username,
    });
  }

  // ======================================================
  // CLIC DANS LA SIDEBAR (initiateur)
  // ======================================================
  openPrivateChat(userId: string): void {
    const otherId = String(userId);

    if (otherId === this.currentUserId) {
      return;
    }

    const user = this.chat.onlineUsers().find((u) => String(u.id) === otherId);

    if (!user) {
      console.error('❌ Utilisateur introuvable :', otherId);
      return;
    }

    console.log('📨 Demande ouverture chat privé :', user);

    // Créer l'onglet immédiatement côté initiateur
    const exists = this.privateTabs().some((t) => t.userId === otherId);
    if (!exists) {
      this.privateTabs.update((tabs) => [
        ...tabs,
        { userId: otherId, username: user.username },
      ]);
    }

    this.activeTab.set(otherId);
    this.selectedUserId.set(otherId);

    // Demander au serveur d'ouvrir la conversation
    this.chat.openPrivateChat(otherId);
  }

  // ======================================================
  // FERMER ONGLET PRIVÉ
  // ======================================================
  closePrivateTab(userId: string, event: Event): void {
    event.stopPropagation();

    const id = String(userId);

    // 1. Informer le serveur qu'on quitte la room
  this.chat.leavePrivateChat(id);

    this.privateTabs.update((tabs) => tabs.filter((t) => t.userId !== id));

    if (this.activeTab() === id) {
      this.activeTab.set('general');
      this.selectedUserId.set(null);
    }
  }

  // ======================================================
  // SÉLECTIONNER UN ONGLET
  // ======================================================
  selectPrivateTab(userId: string): void {
    const id = String(userId);
    this.activeTab.set(id);
    this.selectedUserId.set(id);
  }

  // ======================================================
  // NOM D'UN ONGLET
  // ======================================================
  getPrivateUsername(userId: string): string {
    const tab = this.privateTabs().find((t) => t.userId === String(userId));
    return tab?.username ?? 'Utilisateur';
  }

  // ======================================================
  // ENVOYER MESSAGE PRIVÉ
  // ======================================================
  sendPrivateMessage(userId: string): void {
    const content = this.privateMessage.trim();
    if (!content) return;

    console.log('🚀 Envoi message privé →', userId, content);

    this.chat.sendPrivateMessage(String(userId), content);
    this.privateMessage = '';
  }

  // ======================================================
  // ENVOYER MESSAGE GÉNÉRAL
  // ======================================================
  sendGeneralMessage(): void {
    const content = this.generalMessage.trim();
    if (!content) return;

    this.chat.sendMessage(content);
    this.generalMessage = '';
  }

  // ======================================================
  // DESTRUCTION
  // ======================================================
  ngOnDestroy(): void {
    this.chat.disconnect();
  }
}
