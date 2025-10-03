# Chat Application

## 🔗 Implementation Links

- **Python Implementation**: [python/chat-application/main.py](python/chat-application/main.py)
- **JavaScript Implementation**: [javascript/chat-application/main.js](javascript/chat-application/main.js)

## Problem Statement

Design a real-time chat application system that can:

1. **Manage users** with online/offline status tracking
2. **Support one-on-one chats** between two users
3. **Support group chats** with multiple participants
4. **Handle message delivery** with sent/delivered/read receipts
5. **Store message history** with pagination
6. **Support message types** including text, images, files, and emojis
7. **Implement typing indicators** for active conversations
8. **Provide search functionality** for messages and users
9. **Support notifications** for new messages

## Requirements

### Functional Requirements

- Register users with username, display name, and avatar
- Create one-on-one chat between two users
- Create group chat with multiple participants (2-256 members)
- Send messages to chat (text, image, file, emoji)
- Deliver messages to all online participants
- Mark messages as delivered and read
- Show typing indicator when user is typing
- Search messages by content, sender, or date
- Retrieve message history with pagination
- Support message editing and deletion
- Add/remove participants from group chats
- Mute/unmute conversations
- Block/unblock users

### Non-Functional Requirements

- Message delivery should be near real-time (< 100ms)
- Support 10,000+ concurrent users
- Message history retrieval should be O(log n) with indexing
- Handle 1 million+ messages efficiently
- System should be scalable horizontally
- Data should be encrypted in transit
- Support offline message queuing

## Design Decisions

### Key Classes

1. **User Management**
   - `User`: User profile with status
   - `UserStatus`: Enum (Online, Offline, Away, Busy)
   - `Contact`: User's contact list

2. **Chat Management**
   - `Chat`: Base chat class
   - `OneOnOneChat`: Direct chat between two users
   - `GroupChat`: Multi-participant chat with admin
   - `ChatType`: Enum (OneOnOne, Group)

3. **Message System**
   - `Message`: Message with content and metadata
   - `MessageType`: Enum (Text, Image, File, Emoji)
   - `MessageStatus`: Enum (Sent, Delivered, Read)
   - `MessageReceipt`: Delivery/read confirmation

4. **Activity Tracking**
   - `TypingIndicator`: Shows who is typing
   - `LastSeen`: User's last activity timestamp
   - `OnlinePresence`: Real-time status

5. **System Management**
   - `ChatService`: Main service managing all operations
   - `MessageQueue`: Offline message handling
   - `NotificationService`: Push notifications

### Design Patterns Used

1. **Observer Pattern**: Message notifications to participants
2. **Mediator Pattern**: ChatService coordinates between users and chats
3. **Strategy Pattern**: Different message delivery strategies (online/offline)
4. **Command Pattern**: Message send/edit/delete as commands
5. **Factory Pattern**: Create chats (one-on-one vs group)
6. **Singleton Pattern**: ChatService instance
7. **Repository Pattern**: Message and user data access

### Key Features

- **Real-Time Messaging**: Instant message delivery
- **Read Receipts**: Track message delivery and read status
- **Typing Indicators**: See when someone is typing
- **Group Management**: Add/remove participants, assign admins
- **Message History**: Paginated history retrieval

## State Diagram

```text
USER STATES:

OFFLINE
  ↓ (login)
ONLINE
  ├─→ (set_away) → AWAY
  ├─→ (set_busy) → BUSY
  ├─→ (logout) → OFFLINE
  └─→ (disconnect) → OFFLINE

MESSAGE STATES:

COMPOSING
  ↓ (send)
SENT
  ↓ (receive by server)
DELIVERED (to all online participants)
  ↓ (open by participant)
READ (by one or more participants)

CHAT STATES:

CREATED
  ↓ (add_messages)
ACTIVE (has messages)
  ├─→ (mute) → MUTED
  ├─→ (archive) → ARCHIVED
  └─→ (delete) → DELETED
```

## Class Diagram

```text
UserStatus (Enum)
├── ONLINE
├── OFFLINE
├── AWAY
└── BUSY

ChatType (Enum)
├── ONE_ON_ONE
└── GROUP

MessageType (Enum)
├── TEXT
├── IMAGE
├── FILE
└── EMOJI

MessageStatus (Enum)
├── SENT
├── DELIVERED
└── READ

User
├── user_id: str
├── username: str
├── display_name: str
├── status: UserStatus
├── last_seen: datetime
├── contacts: List[User]
├── blocked_users: Set[str]
├── update_status(status) → None
└── is_online() → bool

Message
├── message_id: str
├── sender: User
├── content: str
├── message_type: MessageType
├── status: MessageStatus
├── timestamp: datetime
├── edited: bool
├── deleted: bool
├── mark_delivered() → None
└── mark_read() → None

MessageReceipt
├── message_id: str
├── user: User
├── status: MessageStatus
└── timestamp: datetime

Chat (Abstract)
├── chat_id: str
├── chat_type: ChatType
├── participants: List[User]
├── messages: List[Message]
├── created_at: datetime
├── send_message(message) → None
├── get_messages(limit, offset) → List[Message]
└── add_participant(user) → None

OneOnOneChat extends Chat
├── user1: User
├── user2: User
└── get_other_user(user) → User

GroupChat extends Chat
├── name: str
├── admin: User
├── remove_participant(user) → None
└── change_admin(new_admin) → None

TypingIndicator
├── chat_id: str
├── user: User
├── started_at: datetime
└── is_expired() → bool

MessageQueue
├── queued_messages: Dict[str, List[Message]]
├── enqueue(user_id, message) → None
└── dequeue(user_id) → List[Message]

ChatService (Singleton)
├── users: Dict[str, User]
├── chats: Dict[str, Chat]
├── message_queue: MessageQueue
├── typing_indicators: Dict[str, List[TypingIndicator]]
├── register_user(user) → None
├── create_one_on_one_chat(user1, user2) → OneOnOneChat
├── create_group_chat(name, participants, admin) → GroupChat
├── send_message(chat_id, sender, content) → Message
├── mark_delivered(message_id, user_id) → None
├── mark_read(message_id, user_id) → None
├── set_typing(chat_id, user_id) → None
├── search_messages(query) → List[Message]
└── get_user_chats(user_id) → List[Chat]
```

## Usage Example

```python
# Initialize chat service
chat_service = ChatService()

# Register users
alice = User("U001", "alice", "Alice Johnson")
bob = User("U002", "bob", "Bob Smith")
charlie = User("U003", "charlie", "Charlie Brown")

chat_service.register_user(alice)
chat_service.register_user(bob)
chat_service.register_user(charlie)

# Create one-on-one chat
chat1 = chat_service.create_one_on_one_chat(alice, bob)

# Send message
message = chat_service.send_message(
    chat_id=chat1.chat_id,
    sender=alice,
    content="Hi Bob! How are you?"
)

# Mark as delivered and read
chat_service.mark_delivered(message.message_id, bob.user_id)
chat_service.mark_read(message.message_id, bob.user_id)

# Create group chat
group = chat_service.create_group_chat(
    name="Project Team",
    participants=[alice, bob, charlie],
    admin=alice
)

# Send group message
chat_service.send_message(
    chat_id=group.chat_id,
    sender=alice,
    content="Hello team! Let's discuss the project."
)

# Show typing indicator
chat_service.set_typing(group.chat_id, bob.user_id)

# Get message history
messages = group.get_messages(limit=50, offset=0)
```

## Business Rules

1. **User Rules**
   - Username must be unique
   - Users can block other users (no messages received)
   - User status updates broadcast to contacts
   - Last seen updated on activity
   - Offline users receive queued messages on login

2. **Chat Creation Rules**
   - One-on-one chat: Exactly 2 participants
   - Group chat: 2-256 participants
   - User cannot create duplicate one-on-one chats
   - Group requires at least one admin
   - Admin can add/remove participants

3. **Message Rules**
   - Messages cannot be empty (text) or null (media)
   - Sent messages cannot be unsent (only deleted)
   - Deleted messages show "Message deleted"
   - Edited messages marked with "Edited" indicator
   - Messages delivered to all online participants immediately
   - Offline participants receive on next login

4. **Read Receipts**
   - Message marked delivered when received by device
   - Message marked read when chat opened
   - In groups, multiple users can read at different times
   - Read receipt cannot be reverted to delivered

5. **Typing Indicators**
   - Expire after 3 seconds of no activity
   - Only show in active chat
   - Multiple users can be typing simultaneously
   - Not stored persistently

## Extension Points

1. **Media Sharing**: Voice messages, video calls
2. **Reactions**: Emoji reactions to messages
3. **Threads**: Reply to specific messages
4. **Stories**: Temporary shared content
5. **End-to-End Encryption**: Secure messaging
6. **Message Forwarding**: Share messages across chats
7. **Voice/Video Calls**: Real-time communication
8. **Stickers**: Custom sticker packs

## Security Considerations

- **Authentication**: Secure user login with tokens
- **Authorization**: Users can only access their chats
- **Encryption**: Messages encrypted in transit (TLS)
- **Privacy**: Blocked users cannot see status/messages
- **Rate Limiting**: Prevent message spam
- **Data Privacy**: Deleted messages removed from storage

## Time Complexity

- **Send Message**: O(p) where p is participants (broadcast)
- **Get Messages**: O(log n + k) where n is total messages, k is page size
- **Search Messages**: O(m log m) where m is matching messages
- **Mark Read/Delivered**: O(1) - Direct message update
- **Create Chat**: O(p) where p is participants
- **User Lookup**: O(1) with hash map

## Space Complexity

- O(u) where u is number of users
- O(c) where c is number of chats
- O(m) where m is total messages
- O(q) where q is queued messages for offline users
- O(t) where t is active typing indicators
