from abc import ABC, abstractmethod
from enum import Enum
from datetime import datetime
from typing import List, Dict, Optional
import uuid

class MessageType(Enum):
    TEXT = 1
    IMAGE = 2
    FILE = 3
    EMOJI = 4

class MessageStatus(Enum):
    SENT = 1
    DELIVERED = 2
    READ = 3
    FAILED = 4

class UserStatus(Enum):
    ONLINE = 1
    OFFLINE = 2
    AWAY = 3
    BUSY = 4

class ChatType(Enum):
    PRIVATE = 1
    GROUP = 2

class User:
    def __init__(self, user_id: str, username: str, email: str):
        self.user_id = user_id
        self.username = username
        self.email = email
        self.status = UserStatus.OFFLINE
        self.last_seen = datetime.now()
        self.created_at = datetime.now()

    def set_status(self, status: UserStatus):
        self.status = status
        if status == UserStatus.OFFLINE:
            self.last_seen = datetime.now()

class Message:
    def __init__(self, sender: User, content: str, message_type: MessageType = MessageType.TEXT):
        self.message_id = str(uuid.uuid4())
        self.sender = sender
        self.content = content
        self.message_type = message_type
        self.timestamp = datetime.now()
        self.status = MessageStatus.SENT
        self.read_by: Dict[str, datetime] = {}  # user_id -> read_timestamp

    def mark_as_read(self, user_id: str):
        self.read_by[user_id] = datetime.now()
        if len(self.read_by) > 0:  # At least one person read it
            self.status = MessageStatus.READ

    def mark_as_delivered(self):
        self.status = MessageStatus.DELIVERED

class Chat(ABC):
    def __init__(self, chat_id: str, chat_type: ChatType):
        self.chat_id = chat_id
        self.chat_type = chat_type
        self.messages: List[Message] = []
        self.created_at = datetime.now()
        self.last_activity = datetime.now()

    @abstractmethod
    def add_participant(self, user: User) -> bool:
        pass

    @abstractmethod
    def remove_participant(self, user_id: str) -> bool:
        pass

    @abstractmethod
    def can_send_message(self, user_id: str) -> bool:
        pass

    def send_message(self, sender: User, content: str, message_type: MessageType = MessageType.TEXT) -> Message:
        if not self.can_send_message(sender.user_id):
            raise Exception("User cannot send message to this chat")
        
        message = Message(sender, content, message_type)
        self.messages.append(message)
        self.last_activity = datetime.now()
        
        # Mark as delivered (simplified - in real system this would be async)
        message.mark_as_delivered()
        
        return message

    def get_messages(self, limit: int = 50, offset: int = 0) -> List[Message]:
        start_idx = max(0, len(self.messages) - offset - limit)
        end_idx = len(self.messages) - offset
        return self.messages[start_idx:end_idx]

    def mark_messages_as_read(self, user_id: str, up_to_message_id: str):
        for message in reversed(self.messages):
            if message.sender.user_id != user_id:  # Don't mark own messages as read
                message.mark_as_read(user_id)
            if message.message_id == up_to_message_id:
                break

class PrivateChat(Chat):
    def __init__(self, user1: User, user2: User):
        chat_id = f"private_{min(user1.user_id, user2.user_id)}_{max(user1.user_id, user2.user_id)}"
        super().__init__(chat_id, ChatType.PRIVATE)
        self.participants = {user1.user_id: user1, user2.user_id: user2}

    def add_participant(self, user: User) -> bool:
        # Private chats can't add new participants
        return False

    def remove_participant(self, user_id: str) -> bool:
        # In private chat, removing participant effectively deletes the chat
        if user_id in self.participants:
            del self.participants[user_id]
            return True
        return False

    def can_send_message(self, user_id: str) -> bool:
        return user_id in self.participants

    def get_other_user(self, user_id: str) -> Optional[User]:
        for uid, user in self.participants.items():
            if uid != user_id:
                return user
        return None

class GroupChat(Chat):
    def __init__(self, chat_id: str, name: str, creator: User):
        super().__init__(chat_id, ChatType.GROUP)
        self.name = name
        self.description = ""
        self.participants: Dict[str, User] = {creator.user_id: creator}
        self.admins = {creator.user_id}  # Creator is admin by default
        self.max_participants = 256

    def add_participant(self, user: User) -> bool:
        if len(self.participants) >= self.max_participants:
            return False
        
        if user.user_id not in self.participants:
            self.participants[user.user_id] = user
            return True
        return False

    def remove_participant(self, user_id: str) -> bool:
        if user_id in self.participants:
            del self.participants[user_id]
            # Remove from admins if they were admin
            self.admins.discard(user_id)
            return True
        return False

    def can_send_message(self, user_id: str) -> bool:
        return user_id in self.participants

    def make_admin(self, user_id: str, by_admin_id: str) -> bool:
        if by_admin_id not in self.admins:
            return False
        if user_id in self.participants:
            self.admins.add(user_id)
            return True
        return False

    def set_description(self, description: str, by_user_id: str) -> bool:
        if by_user_id in self.admins:
            self.description = description
            return True
        return False

class NotificationService:
    def __init__(self):
        self.observers: Dict[str, List] = {}  # user_id -> list of observers

    def subscribe(self, user_id: str, observer):
        if user_id not in self.observers:
            self.observers[user_id] = []
        self.observers[user_id].append(observer)

    def notify_new_message(self, chat: Chat, message: Message):
        # Notify all participants except sender
        participants = []
        if isinstance(chat, PrivateChat):
            participants = list(chat.participants.keys())
        elif isinstance(chat, GroupChat):
            participants = list(chat.participants.keys())
        
        for user_id in participants:
            if user_id != message.sender.user_id and user_id in self.observers:
                for observer in self.observers[user_id]:
                    observer.on_new_message(chat, message)

class ChatManager:
    def __init__(self):
        self.users: Dict[str, User] = {}
        self.chats: Dict[str, Chat] = {}
        self.user_chats: Dict[str, List[str]] = {}  # user_id -> list of chat_ids
        self.notification_service = NotificationService()

    def register_user(self, username: str, email: str) -> User:
        user_id = str(uuid.uuid4())
        user = User(user_id, username, email)
        self.users[user_id] = user
        self.user_chats[user_id] = []
        return user

    def create_private_chat(self, user1_id: str, user2_id: str) -> PrivateChat:
        if user1_id not in self.users or user2_id not in self.users:
            raise Exception("Invalid user IDs")
        
        user1 = self.users[user1_id]
        user2 = self.users[user2_id]
        
        # Check if chat already exists
        chat_id = f"private_{min(user1_id, user2_id)}_{max(user1_id, user2_id)}"
        if chat_id in self.chats:
            return self.chats[chat_id]
        
        chat = PrivateChat(user1, user2)
        self.chats[chat.chat_id] = chat
        
        # Add to user's chat lists
        self.user_chats[user1_id].append(chat.chat_id)
        self.user_chats[user2_id].append(chat.chat_id)
        
        return chat

    def create_group_chat(self, creator_id: str, name: str) -> GroupChat:
        if creator_id not in self.users:
            raise Exception("Invalid creator ID")
        
        creator = self.users[creator_id]
        chat_id = str(uuid.uuid4())
        
        chat = GroupChat(chat_id, name, creator)
        self.chats[chat_id] = chat
        self.user_chats[creator_id].append(chat_id)
        
        return chat

    def add_user_to_group(self, chat_id: str, user_id: str, added_by: str) -> bool:
        if chat_id not in self.chats or user_id not in self.users:
            return False
        
        chat = self.chats[chat_id]
        if not isinstance(chat, GroupChat):
            return False
        
        # Check if added_by is admin
        if added_by not in chat.admins:
            return False
        
        user = self.users[user_id]
        if chat.add_participant(user):
            self.user_chats[user_id].append(chat_id)
            return True
        return False

    def send_message(self, chat_id: str, sender_id: str, content: str, message_type: MessageType = MessageType.TEXT) -> Message:
        if chat_id not in self.chats or sender_id not in self.users:
            raise Exception("Invalid chat or sender ID")
        
        chat = self.chats[chat_id]
        sender = self.users[sender_id]
        
        message = chat.send_message(sender, content, message_type)
        
        # Notify participants
        self.notification_service.notify_new_message(chat, message)
        
        return message

    def get_user_chats(self, user_id: str) -> List[Chat]:
        if user_id not in self.user_chats:
            return []
        
        user_chats = []
        for chat_id in self.user_chats[user_id]:
            if chat_id in self.chats:
                user_chats.append(self.chats[chat_id])
        
        # Sort by last activity
        user_chats.sort(key=lambda x: x.last_activity, reverse=True)
        return user_chats

    def search_messages(self, chat_id: str, query: str, user_id: str) -> List[Message]:
        if chat_id not in self.chats:
            return []
        
        chat = self.chats[chat_id]
        if not chat.can_send_message(user_id):  # User must be participant
            return []
        
        results = []
        for message in chat.messages:
            if query.lower() in message.content.lower():
                results.append(message)
        
        return results

    def set_user_status(self, user_id: str, status: UserStatus):
        if user_id in self.users:
            self.users[user_id].set_status(status)

# Simple observer for notifications
class ConsoleNotificationObserver:
    def __init__(self, user_id: str):
        self.user_id = user_id

    def on_new_message(self, chat: Chat, message: Message):
        if isinstance(chat, PrivateChat):
            print(f"[{self.user_id}] New message from {message.sender.username}: {message.content}")
        elif isinstance(chat, GroupChat):
            print(f"[{self.user_id}] New message in {chat.name} from {message.sender.username}: {message.content}")

# Demo usage
def main():
    chat_manager = ChatManager()
    
    # Register users
    alice = chat_manager.register_user("Alice", "alice@example.com")
    bob = chat_manager.register_user("Bob", "bob@example.com")
    charlie = chat_manager.register_user("Charlie", "charlie@example.com")
    
    print(f"Registered users: {alice.username}, {bob.username}, {charlie.username}")
    
    # Set users online
    chat_manager.set_user_status(alice.user_id, UserStatus.ONLINE)
    chat_manager.set_user_status(bob.user_id, UserStatus.ONLINE)
    chat_manager.set_user_status(charlie.user_id, UserStatus.ONLINE)
    
    # Setup notifications
    alice_observer = ConsoleNotificationObserver(alice.user_id)
    bob_observer = ConsoleNotificationObserver(bob.user_id)
    charlie_observer = ConsoleNotificationObserver(charlie.user_id)
    
    chat_manager.notification_service.subscribe(alice.user_id, alice_observer)
    chat_manager.notification_service.subscribe(bob.user_id, bob_observer)
    chat_manager.notification_service.subscribe(charlie.user_id, charlie_observer)
    
    # Create private chat
    private_chat = chat_manager.create_private_chat(alice.user_id, bob.user_id)
    print(f"\nPrivate chat created: {private_chat.chat_id}")
    
    # Send messages in private chat
    msg1 = chat_manager.send_message(private_chat.chat_id, alice.user_id, "Hi Bob!")
    msg2 = chat_manager.send_message(private_chat.chat_id, bob.user_id, "Hello Alice! How are you?")
    
    # Create group chat
    group_chat = chat_manager.create_group_chat(alice.user_id, "Project Team")
    print(f"\nGroup chat created: {group_chat.name}")
    
    # Add Charlie to group
    chat_manager.add_user_to_group(group_chat.chat_id, bob.user_id, alice.user_id)
    chat_manager.add_user_to_group(group_chat.chat_id, charlie.user_id, alice.user_id)
    
    # Send messages in group chat
    chat_manager.send_message(group_chat.chat_id, alice.user_id, "Welcome to the team chat!")
    chat_manager.send_message(group_chat.chat_id, bob.user_id, "Thanks for adding me!")
    chat_manager.send_message(group_chat.chat_id, charlie.user_id, "Great to be here!")
    
    # Show Alice's chats
    alice_chats = chat_manager.get_user_chats(alice.user_id)
    print(f"\n{alice.username} has {len(alice_chats)} chats:")
    for chat in alice_chats:
        if isinstance(chat, PrivateChat):
            other_user = chat.get_other_user(alice.user_id)
            print(f"  - Private chat with {other_user.username}")
        elif isinstance(chat, GroupChat):
            print(f"  - Group chat: {chat.name} ({len(chat.participants)} members)")
    
    # Search messages
    search_results = chat_manager.search_messages(group_chat.chat_id, "team", alice.user_id)
    print(f"\nSearch results for 'team': {len(search_results)} messages found")
    
    # Mark messages as read
    private_chat.mark_messages_as_read(bob.user_id, msg1.message_id)
    print(f"\nMessage read status: {msg1.status}")

if __name__ == "__main__":
    main()