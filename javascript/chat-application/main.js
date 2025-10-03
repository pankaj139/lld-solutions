/**
 * CHAT APPLICATION Implementation in JavaScript
 * ============================================
 * 
 * This file implements a real-time chat application system.
 * 
 * FILE PURPOSE:
 * - Manages real-time messaging between users
 * - Supports one-on-one and group chats
 * - Handles message delivery and read receipts
 * - Tracks online presence
 * 
 * DESIGN PATTERNS:
 * 1. Observer: Message notifications
 * 2. Mediator: ChatService coordinates
 * 3. Strategy: Delivery strategies
 * 4. Command: Message operations
 * 5. Factory: Chat creation
 * 6. Singleton: ChatService
 * 7. Repository: Data access
 * 
 * HOW TO USE:
 * const service = new ChatService();
 * const user1 = new User("U001", "alice", "Alice");
 * service.registerUser(user1);
 * const chat = service.createOneOnOneChat(user1, user2);
 * service.sendMessage(chat.chatId, user1, "Hello!");
 * 
 * EXPECTED RETURN:
 * - Message object with delivery status
 * - Chat objects with participant lists
 */

const UserStatus = Object.freeze({
    ONLINE: 'online',
    OFFLINE: 'offline',
    AWAY: 'away',
    BUSY: 'busy'
});

const ChatType = Object.freeze({
    ONE_ON_ONE: 'one_on_one',
    GROUP: 'group'
});

const MessageType = Object.freeze({
    TEXT: 'text',
    IMAGE: 'image',
    FILE: 'file',
    EMOJI: 'emoji'
});

const MessageStatus = Object.freeze({
    SENT: 'sent',
    DELIVERED: 'delivered',
    READ: 'read'
});

class User {
    constructor(userId, username, displayName) {
        this.userId = userId;
        this.username = username;
        this.displayName = displayName;
        this.status = UserStatus.OFFLINE;
        this.lastSeen = new Date();
        this.contacts = [];
        this.blockedUsers = new Set();
    }

    updateStatus(status) {
        this.status = status;
        if (status === UserStatus.ONLINE) {
            this.lastSeen = new Date();
        }
    }

    isOnline() {
        return this.status === UserStatus.ONLINE;
    }
}

class Message {
    constructor(messageId, sender, content, messageType = MessageType.TEXT) {
        this.messageId = messageId;
        this.sender = sender;
        this.content = content;
        this.messageType = messageType;
        this.status = MessageStatus.SENT;
        this.timestamp = new Date();
        this.edited = false;
        this.deleted = false;
    }

    markDelivered() {
        this.status = MessageStatus.DELIVERED;
    }

    markRead() {
        this.status = MessageStatus.READ;
    }
}

class Chat {
    constructor(chatId, chatType) {
        this.chatId = chatId;
        this.chatType = chatType;
        this.participants = [];
        this.messages = [];
        this.createdAt = new Date();
    }

    sendMessage(message) {
        this.messages.push(message);
    }

    getMessages(limit = 50, offset = 0) {
        const start = Math.max(0, this.messages.length - offset - limit);
        const end = this.messages.length - offset;
        return this.messages.slice(start, end);
    }
}

class OneOnOneChat extends Chat {
    constructor(chatId, user1, user2) {
        super(chatId, ChatType.ONE_ON_ONE);
        this.user1 = user1;
        this.user2 = user2;
        this.participants = [user1, user2];
    }

    addParticipant(user) {
        throw new Error('Cannot add participants to one-on-one chat');
    }

    getOtherUser(user) {
        return user === this.user1 ? this.user2 : this.user1;
    }
}

class GroupChat extends Chat {
    constructor(chatId, name, admin) {
        super(chatId, ChatType.GROUP);
        this.name = name;
        this.admin = admin;
        this.participants = [admin];
    }

    addParticipant(user) {
        if (!this.participants.includes(user)) {
            this.participants.push(user);
        }
    }

    removeParticipant(user) {
        if (user !== this.admin) {
            const index = this.participants.indexOf(user);
            if (index > -1) {
                this.participants.splice(index, 1);
            }
        }
    }
}

class ChatService {
    constructor() {
        if (ChatService.instance) {
            return ChatService.instance;
        }

        this.users = new Map();
        this.chats = new Map();
        this.messageCounter = 0;
        this.chatCounter = 0;

        ChatService.instance = this;
    }

    registerUser(user) {
        this.users.set(user.userId, user);
        user.updateStatus(UserStatus.ONLINE);
        console.log(`✓ Registered: ${user.displayName}`);
    }

    createOneOnOneChat(user1, user2) {
        const chatId = `C${String(this.chatCounter).padStart(4, '0')}`;
        this.chatCounter++;

        const chat = new OneOnOneChat(chatId, user1, user2);
        this.chats.set(chatId, chat);

        console.log(`✓ Created one-on-one chat: ${user1.displayName} ↔ ${user2.displayName}`);
        return chat;
    }

    createGroupChat(name, participants, admin) {
        const chatId = `G${String(this.chatCounter).padStart(4, '0')}`;
        this.chatCounter++;

        const chat = new GroupChat(chatId, name, admin);
        for (const user of participants) {
            if (user !== admin) {
                chat.addParticipant(user);
            }
        }

        this.chats.set(chatId, chat);

        console.log(`✓ Created group chat: '${name}' with ${chat.participants.length} members`);
        return chat;
    }

    sendMessage(chatId, sender, content) {
        const chat = this.chats.get(chatId);
        if (!chat || !chat.participants.includes(sender)) {
            console.log('✗ Cannot send message');
            return null;
        }

        const msgId = `M${String(this.messageCounter).padStart(6, '0')}`;
        this.messageCounter++;

        const message = new Message(msgId, sender, content);
        chat.sendMessage(message);

        // Notify online participants
        for (const participant of chat.participants) {
            if (participant !== sender && participant.isOnline()) {
                message.markDelivered();
            }
        }

        console.log(`📤 ${sender.displayName}: ${content}`);
        return message;
    }

    markRead(messageId, userId) {
        for (const chat of this.chats.values()) {
            for (const msg of chat.messages) {
                if (msg.messageId === messageId) {
                    msg.markRead();
                    console.log(`✓ Message marked as read by ${userId}`);
                    return;
                }
            }
        }
    }
}

function main() {
    console.log('='.repeat(70));
    console.log('CHAT APPLICATION - Low Level Design Demo');
    console.log('='.repeat(70));

    // Initialize service
    const service = new ChatService();

    // Register users
    console.log('\n👥 Registering Users...');
    const alice = new User('U001', 'alice', 'Alice Johnson');
    const bob = new User('U002', 'bob', 'Bob Smith');
    const charlie = new User('U003', 'charlie', 'Charlie Brown');

    service.registerUser(alice);
    service.registerUser(bob);
    service.registerUser(charlie);

    // Create one-on-one chat
    console.log('\n💬 Creating One-on-One Chat...');
    const chat1 = service.createOneOnOneChat(alice, bob);

    // Send messages
    console.log('\n📨 Sending Messages...');
    const msg1 = service.sendMessage(chat1.chatId, alice, 'Hi Bob! How are you?');
    const msg2 = service.sendMessage(chat1.chatId, bob, "Hi Alice! I'm great, thanks!");

    // Mark as read
    service.markRead(msg1.messageId, bob.userId);

    // Create group chat
    console.log('\n👥 Creating Group Chat...');
    const group = service.createGroupChat('Project Team', [alice, bob, charlie], alice);

    // Send group messages
    console.log('\n📨 Group Messages...');
    service.sendMessage(group.chatId, alice, 'Hello team!');
    service.sendMessage(group.chatId, bob, 'Hey everyone!');
    service.sendMessage(group.chatId, charlie, 'Hi all!');

    // Get message history
    console.log('\n📜 Message History...');
    const history = chat1.getMessages(10);
    console.log(`Retrieved ${history.length} messages from one-on-one chat`);

    console.log('\n' + '='.repeat(70));
    console.log('DEMO COMPLETE');
    console.log('='.repeat(70));
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ChatService,
        Chat,
        OneOnOneChat,
        GroupChat,
        User,
        Message,
        UserStatus,
        ChatType,
        MessageType,
        MessageStatus
    };
}

// Run demo if executed directly
if (typeof require !== 'undefined' && require.main === module) {
    main();
}
