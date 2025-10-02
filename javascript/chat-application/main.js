// Chat Application in JavaScript

// Enums
const MessageType = {
    TEXT: 'TEXT',
    IMAGE: 'IMAGE',
    FILE: 'FILE',
    EMOJI: 'EMOJI'
};

const MessageStatus = {
    SENT: 'SENT',
    DELIVERED: 'DELIVERED',
    READ: 'READ',
    FAILED: 'FAILED'
};

const UserStatus = {
    ONLINE: 'ONLINE',
    OFFLINE: 'OFFLINE',
    AWAY: 'AWAY',
    BUSY: 'BUSY'
};

const ChatType = {
    PRIVATE: 'PRIVATE',
    GROUP: 'GROUP'
};

// Simple UUID generator
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

class User {
    constructor(userId, username, email) {
        this.userId = userId;
        this.username = username;
        this.email = email;
        this.status = UserStatus.OFFLINE;
        this.lastSeen = new Date();
        this.createdAt = new Date();
    }

    setStatus(status) {
        this.status = status;
        if (status === UserStatus.OFFLINE) {
            this.lastSeen = new Date();
        }
    }
}

class Message {
    constructor(sender, content, messageType = MessageType.TEXT) {
        this.messageId = generateUUID();
        this.sender = sender;
        this.content = content;
        this.messageType = messageType;
        this.timestamp = new Date();
        this.status = MessageStatus.SENT;
        this.readBy = new Map(); // userId -> readTimestamp
    }

    markAsRead(userId) {
        this.readBy.set(userId, new Date());
        if (this.readBy.size > 0) {
            this.status = MessageStatus.READ;
        }
    }

    markAsDelivered() {
        this.status = MessageStatus.DELIVERED;
    }
}

class Chat {
    constructor(chatId, chatType) {
        if (this.constructor === Chat) {
            throw new Error("Cannot instantiate abstract class Chat");
        }
        this.chatId = chatId;
        this.chatType = chatType;
        this.messages = [];
        this.createdAt = new Date();
        this.lastActivity = new Date();
    }

    addParticipant(user) {
        throw new Error("Method must be implemented by subclass");
    }

    removeParticipant(userId) {
        throw new Error("Method must be implemented by subclass");
    }

    canSendMessage(userId) {
        throw new Error("Method must be implemented by subclass");
    }

    sendMessage(sender, content, messageType = MessageType.TEXT) {
        if (!this.canSendMessage(sender.userId)) {
            throw new Error("User cannot send message to this chat");
        }

        const message = new Message(sender, content, messageType);
        this.messages.push(message);
        this.lastActivity = new Date();

        // Mark as delivered (simplified)
        message.markAsDelivered();

        return message;
    }

    getMessages(limit = 50, offset = 0) {
        const startIdx = Math.max(0, this.messages.length - offset - limit);
        const endIdx = this.messages.length - offset;
        return this.messages.slice(startIdx, endIdx);
    }

    markMessagesAsRead(userId, upToMessageId) {
        for (let i = this.messages.length - 1; i >= 0; i--) {
            const message = this.messages[i];
            if (message.sender.userId !== userId) {
                message.markAsRead(userId);
            }
            if (message.messageId === upToMessageId) {
                break;
            }
        }
    }
}

class PrivateChat extends Chat {
    constructor(user1, user2) {
        const chatId = `private_${[user1.userId, user2.userId].sort().join('_')}`;
        super(chatId, ChatType.PRIVATE);
        this.participants = new Map([
            [user1.userId, user1],
            [user2.userId, user2]
        ]);
    }

    addParticipant(user) {
        // Private chats can't add new participants
        return false;
    }

    removeParticipant(userId) {
        // In private chat, removing participant effectively deletes the chat
        if (this.participants.has(userId)) {
            this.participants.delete(userId);
            return true;
        }
        return false;
    }

    canSendMessage(userId) {
        return this.participants.has(userId);
    }

    getOtherUser(userId) {
        for (const [uid, user] of this.participants) {
            if (uid !== userId) {
                return user;
            }
        }
        return null;
    }
}

class GroupChat extends Chat {
    constructor(chatId, name, creator) {
        super(chatId, ChatType.GROUP);
        this.name = name;
        this.description = "";
        this.participants = new Map([[creator.userId, creator]]);
        this.admins = new Set([creator.userId]); // Creator is admin by default
        this.maxParticipants = 256;
    }

    addParticipant(user) {
        if (this.participants.size >= this.maxParticipants) {
            return false;
        }

        if (!this.participants.has(user.userId)) {
            this.participants.set(user.userId, user);
            return true;
        }
        return false;
    }

    removeParticipant(userId) {
        if (this.participants.has(userId)) {
            this.participants.delete(userId);
            // Remove from admins if they were admin
            this.admins.delete(userId);
            return true;
        }
        return false;
    }

    canSendMessage(userId) {
        return this.participants.has(userId);
    }

    makeAdmin(userId, byAdminId) {
        if (!this.admins.has(byAdminId)) {
            return false;
        }
        if (this.participants.has(userId)) {
            this.admins.add(userId);
            return true;
        }
        return false;
    }

    setDescription(description, byUserId) {
        if (this.admins.has(byUserId)) {
            this.description = description;
            return true;
        }
        return false;
    }
}

class NotificationService {
    constructor() {
        this.observers = new Map(); // userId -> array of observers
    }

    subscribe(userId, observer) {
        if (!this.observers.has(userId)) {
            this.observers.set(userId, []);
        }
        this.observers.get(userId).push(observer);
    }

    notifyNewMessage(chat, message) {
        // Notify all participants except sender
        let participants = [];
        if (chat instanceof PrivateChat) {
            participants = Array.from(chat.participants.keys());
        } else if (chat instanceof GroupChat) {
            participants = Array.from(chat.participants.keys());
        }

        for (const userId of participants) {
            if (userId !== message.sender.userId && this.observers.has(userId)) {
                for (const observer of this.observers.get(userId)) {
                    observer.onNewMessage(chat, message);
                }
            }
        }
    }
}

class ChatManager {
    constructor() {
        this.users = new Map(); // userId -> User
        this.chats = new Map(); // chatId -> Chat
        this.userChats = new Map(); // userId -> array of chatIds
        this.notificationService = new NotificationService();
    }

    registerUser(username, email) {
        const userId = generateUUID();
        const user = new User(userId, username, email);
        this.users.set(userId, user);
        this.userChats.set(userId, []);
        return user;
    }

    createPrivateChat(user1Id, user2Id) {
        if (!this.users.has(user1Id) || !this.users.has(user2Id)) {
            throw new Error("Invalid user IDs");
        }

        const user1 = this.users.get(user1Id);
        const user2 = this.users.get(user2Id);

        // Check if chat already exists
        const chatId = `private_${[user1Id, user2Id].sort().join('_')}`;
        if (this.chats.has(chatId)) {
            return this.chats.get(chatId);
        }

        const chat = new PrivateChat(user1, user2);
        this.chats.set(chat.chatId, chat);

        // Add to user's chat lists
        this.userChats.get(user1Id).push(chat.chatId);
        this.userChats.get(user2Id).push(chat.chatId);

        return chat;
    }

    createGroupChat(creatorId, name) {
        if (!this.users.has(creatorId)) {
            throw new Error("Invalid creator ID");
        }

        const creator = this.users.get(creatorId);
        const chatId = generateUUID();

        const chat = new GroupChat(chatId, name, creator);
        this.chats.set(chatId, chat);
        this.userChats.get(creatorId).push(chatId);

        return chat;
    }

    addUserToGroup(chatId, userId, addedBy) {
        if (!this.chats.has(chatId) || !this.users.has(userId)) {
            return false;
        }

        const chat = this.chats.get(chatId);
        if (!(chat instanceof GroupChat)) {
            return false;
        }

        // Check if addedBy is admin
        if (!chat.admins.has(addedBy)) {
            return false;
        }

        const user = this.users.get(userId);
        if (chat.addParticipant(user)) {
            this.userChats.get(userId).push(chatId);
            return true;
        }
        return false;
    }

    sendMessage(chatId, senderId, content, messageType = MessageType.TEXT) {
        if (!this.chats.has(chatId) || !this.users.has(senderId)) {
            throw new Error("Invalid chat or sender ID");
        }

        const chat = this.chats.get(chatId);
        const sender = this.users.get(senderId);

        const message = chat.sendMessage(sender, content, messageType);

        // Notify participants
        this.notificationService.notifyNewMessage(chat, message);

        return message;
    }

    getUserChats(userId) {
        if (!this.userChats.has(userId)) {
            return [];
        }

        const userChatList = [];
        for (const chatId of this.userChats.get(userId)) {
            if (this.chats.has(chatId)) {
                userChatList.push(this.chats.get(chatId));
            }
        }

        // Sort by last activity
        userChatList.sort((a, b) => b.lastActivity - a.lastActivity);
        return userChatList;
    }

    searchMessages(chatId, query, userId) {
        if (!this.chats.has(chatId)) {
            return [];
        }

        const chat = this.chats.get(chatId);
        if (!chat.canSendMessage(userId)) {
            return [];
        }

        const results = [];
        for (const message of chat.messages) {
            if (message.content.toLowerCase().includes(query.toLowerCase())) {
                results.push(message);
            }
        }

        return results;
    }

    setUserStatus(userId, status) {
        if (this.users.has(userId)) {
            this.users.get(userId).setStatus(status);
        }
    }
}

// Simple observer for notifications
class ConsoleNotificationObserver {
    constructor(userId) {
        this.userId = userId;
    }

    onNewMessage(chat, message) {
        if (chat instanceof PrivateChat) {
            console.log(`[${this.userId}] New message from ${message.sender.username}: ${message.content}`);
        } else if (chat instanceof GroupChat) {
            console.log(`[${this.userId}] New message in ${chat.name} from ${message.sender.username}: ${message.content}`);
        }
    }
}

// Demo usage
function main() {
    const chatManager = new ChatManager();

    // Register users
    const alice = chatManager.registerUser("Alice", "alice@example.com");
    const bob = chatManager.registerUser("Bob", "bob@example.com");
    const charlie = chatManager.registerUser("Charlie", "charlie@example.com");

    console.log(`Registered users: ${alice.username}, ${bob.username}, ${charlie.username}`);

    // Set users online
    chatManager.setUserStatus(alice.userId, UserStatus.ONLINE);
    chatManager.setUserStatus(bob.userId, UserStatus.ONLINE);
    chatManager.setUserStatus(charlie.userId, UserStatus.ONLINE);

    // Setup notifications
    const aliceObserver = new ConsoleNotificationObserver(alice.userId);
    const bobObserver = new ConsoleNotificationObserver(bob.userId);
    const charlieObserver = new ConsoleNotificationObserver(charlie.userId);

    chatManager.notificationService.subscribe(alice.userId, aliceObserver);
    chatManager.notificationService.subscribe(bob.userId, bobObserver);
    chatManager.notificationService.subscribe(charlie.userId, charlieObserver);

    // Create private chat
    const privateChat = chatManager.createPrivateChat(alice.userId, bob.userId);
    console.log(`\nPrivate chat created: ${privateChat.chatId}`);

    // Send messages in private chat
    const msg1 = chatManager.sendMessage(privateChat.chatId, alice.userId, "Hi Bob!");
    const msg2 = chatManager.sendMessage(privateChat.chatId, bob.userId, "Hello Alice! How are you?");

    // Create group chat
    const groupChat = chatManager.createGroupChat(alice.userId, "Project Team");
    console.log(`\nGroup chat created: ${groupChat.name}`);

    // Add Charlie to group
    chatManager.addUserToGroup(groupChat.chatId, bob.userId, alice.userId);
    chatManager.addUserToGroup(groupChat.chatId, charlie.userId, alice.userId);

    // Send messages in group chat
    chatManager.sendMessage(groupChat.chatId, alice.userId, "Welcome to the team chat!");
    chatManager.sendMessage(groupChat.chatId, bob.userId, "Thanks for adding me!");
    chatManager.sendMessage(groupChat.chatId, charlie.userId, "Great to be here!");

    // Show Alice's chats
    const aliceChats = chatManager.getUserChats(alice.userId);
    console.log(`\n${alice.username} has ${aliceChats.length} chats:`);
    for (const chat of aliceChats) {
        if (chat instanceof PrivateChat) {
            const otherUser = chat.getOtherUser(alice.userId);
            console.log(`  - Private chat with ${otherUser.username}`);
        } else if (chat instanceof GroupChat) {
            console.log(`  - Group chat: ${chat.name} (${chat.participants.size} members)`);
        }
    }

    // Search messages
    const searchResults = chatManager.searchMessages(groupChat.chatId, "team", alice.userId);
    console.log(`\nSearch results for 'team': ${searchResults.length} messages found`);

    // Mark messages as read
    privateChat.markMessagesAsRead(bob.userId, msg1.messageId);
    console.log(`\nMessage read status: ${msg1.status}`);
}

// Export for use in other modules (Node.js)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        MessageType,
        MessageStatus,
        UserStatus,
        ChatType,
        User,
        Message,
        Chat,
        PrivateChat,
        GroupChat,
        NotificationService,
        ChatManager,
        ConsoleNotificationObserver
    };
}

// Run demo if this file is executed directly
if (require.main === module) {
    main();
}