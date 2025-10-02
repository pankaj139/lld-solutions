# Chat Application

## 🔗 Implementation Links
- **Python Implementation**: [python/chat-application/main.py](python/chat-application/main.py)
- **JavaScript Implementation**: [javascript/chat-application/main.js](javascript/chat-application/main.js)

## Problem Statement

Design a chat application system that can:

1. **Support multiple users** with online/offline status
2. **Handle private chats** between two users
3. **Support group chats** with multiple participants and admins
4. **Send different message types** (text, image, file, emoji)
5. **Track message status** (sent, delivered, read)
6. **Provide real-time notifications** for new messages
7. **Search functionality** within chat conversations
8. **Message history** and pagination support

## Requirements

### Functional Requirements
- User registration and authentication
- Create private chats between two users
- Create group chats with multiple participants
- Send and receive messages with different types
- Track message delivery and read status
- Real-time notifications for new messages
- Search messages within conversations
- User status management (online, offline, away, busy)
- Admin controls in group chats
- Message pagination for chat history

### Non-Functional Requirements
- System should handle concurrent messaging
- Fast message delivery and retrieval
- Scalable to support thousands of users
- Support for message attachments
- Efficient search across message history
- Real-time updates without frequent polling

## Design Decisions

### Key Classes

1. **User Management**
   - `User`: Represents system users with status and profile info
   - `UserStatus`: Enum for online/offline/away/busy states

2. **Message System**
   - `Message`: Individual message with content, type, and metadata
   - `MessageType`: Support for text, image, file, emoji
   - `MessageStatus`: Track sent/delivered/read states

3. **Chat Management**
   - `Chat`: Abstract base class for all chat types
   - `PrivateChat`: Two-user conversations
   - `GroupChat`: Multi-user conversations with admin controls

4. **System Components**
   - `ChatManager`: Main coordinator for all chat operations
   - `NotificationService`: Observer pattern for real-time notifications

### Design Patterns Used

1. **Abstract Factory**: Chat creation (private vs group)
2. **Observer Pattern**: Real-time notification system
3. **Template Method**: Base chat functionality with specific implementations
4. **Strategy Pattern**: Different message type handling
5. **Factory Method**: Message and user creation

### Key Features

- **Real-time Messaging**: Observer pattern for instant notifications
- **Message Status Tracking**: Comprehensive delivery and read receipts
- **Flexible Chat Types**: Both private and group conversations
- **Search Functionality**: Message content search within chats
- **Admin Controls**: Group management with admin privileges
- **User Status**: Online presence and last seen tracking

## Class Diagram

```
User
├── user_id: str
├── username: str
├── email: str
├── status: UserStatus
└── last_seen: datetime

Message
├── message_id: str
├── sender: User
├── content: str
├── message_type: MessageType
├── timestamp: datetime
├── status: MessageStatus
└── read_by: Dict[str, datetime]

Chat (Abstract)
├── chat_id: str
├── chat_type: ChatType
├── messages: List[Message]
├── send_message()
└── mark_messages_as_read()

PrivateChat extends Chat
├── participants: Dict[str, User]
└── get_other_user()

GroupChat extends Chat
├── name: str
├── participants: Dict[str, User]
├── admins: Set[str]
├── make_admin()
└── set_description()

ChatManager
├── users: Dict[str, User]
├── chats: Dict[str, Chat]
├── user_chats: Dict[str, List[str]]
├── create_private_chat()
├── create_group_chat()
├── send_message()
└── search_messages()
```

## Usage Example

```python
# Create chat manager and register users
chat_manager = ChatManager()
alice = chat_manager.register_user("Alice", "alice@example.com")
bob = chat_manager.register_user("Bob", "bob@example.com")

# Create private chat and send messages
private_chat = chat_manager.create_private_chat(alice.user_id, bob.user_id)
message = chat_manager.send_message(private_chat.chat_id, alice.user_id, "Hello!")

# Create group chat and add participants
group_chat = chat_manager.create_group_chat(alice.user_id, "Project Team")
chat_manager.add_user_to_group(group_chat.chat_id, bob.user_id, alice.user_id)

# Search messages
results = chat_manager.search_messages(group_chat.chat_id, "project", alice.user_id)
```

## Real-time Features

### Notification System
```python
class NotificationObserver:
    def on_new_message(self, chat: Chat, message: Message):
        # Handle new message notification
        pass

# Subscribe to notifications
chat_manager.notification_service.subscribe(user_id, observer)
```

### Message Status Updates
- **Sent**: Message created and stored
- **Delivered**: Message reached recipient's device
- **Read**: Recipient viewed the message

## Business Rules

1. **Private Chats**
   - Only two participants allowed
   - Cannot add new participants
   - Both users can send messages

2. **Group Chats**
   - Creator becomes admin automatically
   - Admins can add/remove participants
   - Admins can promote other users to admin
   - Maximum 256 participants per group

3. **Message Handling**
   - Messages are immutable once sent
   - Read receipts only for non-sender participants
   - Search only available to chat participants

4. **User Status**
   - Automatic offline status when disconnected
   - Last seen timestamp updated on status change
   - Status visible to chat participants

## Extension Points

1. **Message Reactions**: Add emoji reactions to messages
2. **File Sharing**: Enhanced file upload and sharing
3. **Voice/Video Calls**: Integration with calling features
4. **Message Encryption**: End-to-end encryption support
5. **Push Notifications**: Mobile push notification integration
6. **Message Threading**: Reply threads for group conversations
7. **Bot Integration**: Support for chatbots and automated responses
8. **Message Formatting**: Rich text, mentions, and formatting

## Security Considerations

1. **Authentication**: Secure user authentication and session management
2. **Authorization**: Proper access control for chat participation
3. **Data Privacy**: Message content protection and user privacy
4. **Rate Limiting**: Prevent spam and abuse
5. **Content Moderation**: Automatic and manual content filtering

## Performance Optimizations

1. **Message Pagination**: Load messages in chunks for better performance
2. **Caching**: Cache frequently accessed chats and recent messages
3. **Database Indexing**: Efficient queries for message search and retrieval
4. **Connection Pooling**: Manage database connections efficiently
5. **Real-time Optimization**: WebSocket connections for instant messaging

## Time Complexity

- **Send Message**: O(1) for message creation, O(n) for notifications
- **Search Messages**: O(m) where m is number of messages in chat
- **Get User Chats**: O(n log n) for sorting by last activity
- **Mark as Read**: O(k) where k is number of messages to mark

## Space Complexity

- O(n) for users where n is total number of users
- O(m) for messages where m is total number of messages
- O(c) for chats where c is total number of chats
- Additional O(p) for participant mappings and indexes