import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);
  private app: admin.app.App;
  private database: admin.database.Database;
  private storage: admin.storage.Storage;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    this.initializeFirebase();
  }

  private initializeFirebase() {
    try {
      // Initialize Firebase Admin SDK
      this.app = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: this.configService.get<string>('FIREBASE_PROJECT_ID'),
          privateKey: this.configService
            .get<string>('FIREBASE_PRIVATE_KEY')
            ?.replace(/\\n/g, '\n'),
          clientEmail: this.configService.get<string>('FIREBASE_CLIENT_EMAIL'),
        }),
        databaseURL: this.configService.get<string>('FIREBASE_DATABASE_URL'),
        storageBucket: this.configService.get<string>('FIREBASE_STORAGE_BUCKET'),
      });

      this.database = this.app.database();
      this.storage = this.app.storage();
      
      this.logger.log('✅ Firebase initialized successfully (Database + Storage)');
      this.logger.log(`Storage Bucket: ${this.configService.get<string>('FIREBASE_STORAGE_BUCKET')}`);
    } catch (error) {
      this.logger.error('❌ Firebase initialization error:', error);
      throw error;
    }
  }

  /**
   * Get Firebase Realtime Database instance
   */
  getDatabase(): admin.database.Database {
    return this.database;
  }

  /**
   * Create or update conversation in Firebase
   */
  async createConversation(
    conversationId: string,
    data: {
      visitorId: string;
      visitorName?: string;
      visitorEmail?: string;
      groupId?: string;
      status: string;
      createdAt: string;
      assignedAgentId?: string;
      assignedAgentName?: string;
    },
  ): Promise<void> {
    const conversationRef = this.database.ref(
      `conversations/${conversationId}`,
    );
    await conversationRef.set({
      ...data,
      updatedAt: admin.database.ServerValue.TIMESTAMP,
    });
  }

  /**
   * Update conversation status and assignment
   */
  async updateConversation(
    conversationId: string,
    updates: {
      status?: string;
      assignedAgentId?: string;
      assignedAgentName?: string;
      assignedAt?: string;
      activeThreadId?: string;
      closedBy?: string;
      closedAt?: string;
      reopenedBy?: string;
      reopenedAt?: string;
      newThreadId?: string;
      reason?: string;
      tags?: Array<{ id: string; name: string; color?: string }>;
      [key: string]: any; // Allow additional dynamic fields
    },
  ): Promise<void> {
    const conversationRef = this.database.ref(
      `conversations/${conversationId}`,
    );
    await conversationRef.update({
      ...updates,
      updatedAt: admin.database.ServerValue.TIMESTAMP,
    });
  }

  /**
   * Add message to conversation in Firebase (real-time sync)
   */
  async addMessage(
    conversationId: string,
    message: {
      id: string;
      threadId: string;
      content: string;
      authorType: 'visitor' | 'agent' | 'system';
      agentId?: string;
      agentName?: string;
      type: 'message' | 'system';
      createdAt: string;
      metadata?: Record<string, any>;
    },
  ): Promise<void> {
    const messageRef = this.database.ref(
      `conversations/${conversationId}/messages/${message.id}`,
    );
    await messageRef.set({
      ...message,
      timestamp: admin.database.ServerValue.TIMESTAMP,
    });

    // Update last message reference
    const conversationRef = this.database.ref(
      `conversations/${conversationId}`,
    );
    await conversationRef.update({
      lastMessage: {
        content: message.content,
        authorType: message.authorType,
        createdAt: message.createdAt,
      },
      updatedAt: admin.database.ServerValue.TIMESTAMP,
    });
  }

  /**
   * Update agent typing status
   */
  async updateTypingStatus(
    conversationId: string,
    agentId: string,
    isTyping: boolean,
  ): Promise<void> {
    const typingRef = this.database.ref(
      `conversations/${conversationId}/typing/${agentId}`,
    );
    if (isTyping) {
      await typingRef.set({
        isTyping: true,
        timestamp: admin.database.ServerValue.TIMESTAMP,
      });
    } else {
      await typingRef.remove();
    }
  }

  /**
   * Update visitor typing status with preview
   */
  async updateVisitorTyping(
    conversationId: string,
    isTyping: boolean,
    preview?: string,
  ): Promise<void> {
    const typingRef = this.database.ref(
      `conversations/${conversationId}/visitorTyping`,
    );
    if (isTyping) {
      await typingRef.set({
        isTyping: true,
        preview: preview || '',
        timestamp: admin.database.ServerValue.TIMESTAMP,
      });
    } else {
      await typingRef.remove();
    }
  }

  /**
   * Update message delivery status
   */
  async updateMessageDeliveryStatus(
    conversationId: string,
    messageId: string,
    deliveredAt: string,
  ): Promise<void> {
    const messageRef = this.database.ref(
      `conversations/${conversationId}/messages/${messageId}`,
    );
    await messageRef.update({
      deliveredAt,
      deliveryTimestamp: admin.database.ServerValue.TIMESTAMP,
    });
  }

  /**
   * Update message read status
   */
  async updateMessageReadStatus(
    conversationId: string,
    messageId: string,
    readAt: string,
  ): Promise<void> {
    const messageRef = this.database.ref(
      `conversations/${conversationId}/messages/${messageId}`,
    );
    await messageRef.update({
      readAt,
      readTimestamp: admin.database.ServerValue.TIMESTAMP,
    });
  }

  /**
   * Bulk update message read status (mark all as read)
   */
  async markConversationMessagesAsRead(
    conversationId: string,
    messageIds: string[],
    readAt: string,
  ): Promise<void> {
    const updates: Record<string, any> = {};
    
    messageIds.forEach((messageId) => {
      updates[`conversations/${conversationId}/messages/${messageId}/readAt`] = readAt;
      updates[`conversations/${conversationId}/messages/${messageId}/readTimestamp`] = admin.database.ServerValue.TIMESTAMP;
    });

    await this.database.ref().update(updates);
  }

  /**
   * Update agent online status
   */
  async updateAgentStatus(
    agentId: string,
    status: 'online' | 'offline' | 'away',
  ): Promise<void> {
    const agentRef = this.database.ref(`agents/${agentId}`);
    await agentRef.update({
      status,
      lastStatusChange: admin.database.ServerValue.TIMESTAMP,
    });
  }

  /**
   * Set agent presence (connection state)
   */
  async setAgentPresence(agentId: string, isConnected: boolean): Promise<void> {
    const presenceRef = this.database.ref(`agents/${agentId}/presence`);
    
    if (isConnected) {
      // Set online
      await presenceRef.set({
        online: true,
        lastSeen: admin.database.ServerValue.TIMESTAMP,
      });
      
      // Set up disconnect handler
      await presenceRef.onDisconnect().set({
        online: false,
        lastSeen: admin.database.ServerValue.TIMESTAMP,
      });
    } else {
      await presenceRef.set({
        online: false,
        lastSeen: admin.database.ServerValue.TIMESTAMP,
      });
    }
  }

  /**
   * Get conversation data from Firebase
   */
  async getConversation(conversationId: string): Promise<any> {
    const snapshot = await this.database
      .ref(`conversations/${conversationId}`)
      .once('value');
    return snapshot.val();
  }

  /**
   * Get all messages for a conversation
   */
  async getMessages(conversationId: string): Promise<any[]> {
    const snapshot = await this.database
      .ref(`conversations/${conversationId}/messages`)
      .orderByChild('createdAt')
      .once('value');
    
    const messages: any[] = [];
    snapshot.forEach((child) => {
      messages.push({ id: child.key, ...child.val() });
    });
    
    return messages;
  }

  /**
   * Delete conversation from Firebase (when closed)
   */
  async deleteConversation(conversationId: string): Promise<void> {
    const conversationRef = this.database.ref(
      `conversations/${conversationId}`,
    );
    await conversationRef.remove();
  }

  /**
   * Add system event to conversation
   */
  async addSystemEvent(
    conversationId: string,
    event: {
      id: string;
      type: 'agent_assigned' | 'agent_joined' | 'conversation_closed' | 'thread_closed' | 'chat_closed' | 'conversation_reopened';
      message: string;
      metadata?: Record<string, any>;
      createdAt: string;
    },
  ): Promise<void> {
    await this.addMessage(conversationId, {
      id: event.id,
      threadId: '', // System events may not have thread
      content: event.message,
      authorType: 'system',
      type: 'system',
      createdAt: event.createdAt,
      metadata: {
        eventType: event.type,
        ...event.metadata,
      },
    });
  }

  /**
   * Upload file to Firebase Storage
   */
  async uploadFile(
    file: any,
    folder: string = 'documents',
    customFileName?: string,
  ): Promise<{
    fileName: string;
    fileUrl: string;
    storagePath: string;
  }> {
    try {
      const fileExtension = file.originalname.split('.').pop();
      let fileName: string;
      
      if (customFileName) {
        // Remove extension from custom name if provided
        const nameWithoutExt = customFileName.replace(/\.[^/.]+$/, '');
        // Append UUID to custom name
        fileName = `${nameWithoutExt}_${uuidv4()}.${fileExtension}`;
      } else {
        // Default: UUID_timestamp.ext
        const timestamp = Date.now();
        fileName = `${uuidv4()}_${timestamp}.${fileExtension}`;
      }
      
      const storagePath = `${folder}/${fileName}`;

      const bucket = this.storage.bucket();
      const fileRef = bucket.file(storagePath);

      await fileRef.save(file.buffer, {
        metadata: {
          contentType: file.mimetype,
          metadata: {
            originalName: file.originalname,
            uploadedAt: new Date().toISOString(),
          },
        },
      });

      // Make file publicly accessible
      await fileRef.makePublic();

      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;

      this.logger.log(`File uploaded to Firebase Storage: ${storagePath}`);
      
      return {
        fileName,
        fileUrl: publicUrl,
        storagePath,
      };
    } catch (error) {
      this.logger.error('Failed to upload file to Firebase Storage:', error);
      throw error;
    }
  }

  /**
   * Delete file from Firebase Storage
   */
  async deleteFile(storagePath: string): Promise<void> {
    try {
      const bucket = this.storage.bucket();
      await bucket.file(storagePath).delete();
      this.logger.log(`File deleted from Firebase Storage: ${storagePath}`);
    } catch (error) {
      this.logger.error(`Failed to delete file from Firebase Storage: ${storagePath}`, error);
      throw error;
    }
  }

  /**
   * Get signed URL for temporary file access
   */
  async getSignedUrl(storagePath: string, expiresInMinutes: number = 60): Promise<string> {
    try {
      const bucket = this.storage.bucket();
      const [url] = await bucket.file(storagePath).getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + expiresInMinutes * 60 * 1000,
      });
      return url;
    } catch (error) {
      this.logger.error(`Failed to generate signed URL for: ${storagePath}`, error);
      throw error;
    }
  }

  /**
   * Check if file exists in Firebase Storage
   */
  async fileExists(storagePath: string): Promise<boolean> {
    try {
      const bucket = this.storage.bucket();
      const [exists] = await bucket.file(storagePath).exists();
      return exists;
    } catch (error) {
      this.logger.error(`Error checking file existence: ${storagePath}`, error);
      return false;
    }
  }
}
