"""
Trello / Kanban Board System - Low Level Design Implementation in Python

This file implements a comprehensive Kanban board system like Trello for task and project management.
It supports boards, lists, and cards hierarchy with drag-and-drop, labels, attachments, and real-time collaboration.

DESIGN PATTERNS USED:
1. Composite Pattern: Board contains Lists, List contains Cards (tree structure)
2. Command Pattern: All operations as commands for undo/redo functionality
3. Observer Pattern: Real-time updates when board state changes
4. Memento Pattern: Save and restore board states for undo
5. Chain of Responsibility: Permission checking chain
6. Decorator Pattern: Add features to cards (labels, attachments, comments)

OOP CONCEPTS DEMONSTRATED:
- ENCAPSULATION: Private attributes with getter/setter methods
- ABSTRACTION: Abstract Command, Observer, and PermissionChecker interfaces
- INHERITANCE: Concrete commands inherit from Command
- POLYMORPHISM: Different commands implement same interface differently

SOLID PRINCIPLES:
- SRP: Each class has single responsibility (Board, List, Card, Command)
- OCP: Open for extension (new commands, decorators) closed for modification
- LSP: Any Command can be used interchangeably
- ISP: Focused interfaces (Observer, Command, PermissionChecker)
- DIP: BoardService depends on abstractions

BUSINESS FEATURES:
- Hierarchical board structure (Board → List → Card)
- Drag-and-drop with fractional indexing
- Undo/redo functionality
- Real-time collaboration with observers
- Role-based permission system
- Activity tracking and audit log

ARCHITECTURAL NOTES:
- Fractional indexing for O(1) reordering
- Command pattern enables complete undo/redo history
- Observer pattern for real-time WebSocket updates
- Chain of Responsibility for flexible permission system
"""

from abc import ABC, abstractmethod
from enum import Enum
from datetime import datetime
from typing import Dict, List, Optional, Any
import uuid


# ============================================================================
# ENUMS - Domain Definitions
# ============================================================================

class BoardVisibility(Enum):
    """Board visibility levels."""
    PRIVATE = "PRIVATE"
    TEAM = "TEAM"
    PUBLIC = "PUBLIC"


class Role(Enum):
    """User roles with different permission levels."""
    OWNER = "OWNER"
    ADMIN = "ADMIN"
    MEMBER = "MEMBER"
    OBSERVER = "OBSERVER"


class ActivityType(Enum):
    """Types of activities for audit log."""
    BOARD_CREATED = "BOARD_CREATED"
    LIST_ADDED = "LIST_ADDED"
    LIST_MOVED = "LIST_MOVED"
    LIST_ARCHIVED = "LIST_ARCHIVED"
    CARD_CREATED = "CARD_CREATED"
    CARD_MOVED = "CARD_MOVED"
    CARD_UPDATED = "CARD_UPDATED"
    CARD_ARCHIVED = "CARD_ARCHIVED"
    MEMBER_ADDED = "MEMBER_ADDED"
    MEMBER_REMOVED = "MEMBER_REMOVED"
    COMMENT_ADDED = "COMMENT_ADDED"
    LABEL_ADDED = "LABEL_ADDED"


# ============================================================================
# CORE DOMAIN MODELS
# ============================================================================

class User:
    """
    Represents a user in the Kanban system.
    
    OOP CONCEPTS: Encapsulation - private attributes with getters
    
    How to use:
    user = User("Alice", "alice@example.com")
    print(user.get_name())
    
    Returns: User object with unique ID
    """
    
    def __init__(self, name: str, email: str, avatar_url: str = ""):
        self._id = str(uuid.uuid4())
        self._name = name
        self._email = email
        self._avatar_url = avatar_url
    
    def get_id(self) -> str:
        return self._id
    
    def get_name(self) -> str:
        return self._name
    
    def get_email(self) -> str:
        return self._email
    
    def __str__(self) -> str:
        return f"User({self._name})"
    
    def __repr__(self) -> str:
        return self.__str__()


class Label:
    """
    Label for categorizing cards.
    
    OOP CONCEPTS: Value Object pattern
    """
    
    def __init__(self, name: str, color: str, board: 'Board'):
        self._id = str(uuid.uuid4())
        self._name = name
        self._color = color
        self._board = board
    
    def get_id(self) -> str:
        return self._id
    
    def get_name(self) -> str:
        return self._name
    
    def get_color(self) -> str:
        return self._color
    
    def __str__(self) -> str:
        return f"Label({self._name}, {self._color})"


class Attachment:
    """
    File attachment for cards.
    """
    
    def __init__(self, filename: str, url: str, size: int, uploaded_by: User):
        self._id = str(uuid.uuid4())
        self._filename = filename
        self._url = url
        self._size = size
        self._uploaded_by = uploaded_by
        self._uploaded_at = datetime.now()
    
    def get_id(self) -> str:
        return self._id
    
    def get_filename(self) -> str:
        return self._filename
    
    def get_url(self) -> str:
        return self._url
    
    def __str__(self) -> str:
        return f"Attachment({self._filename})"


class Comment:
    """
    Comment on a card for discussions.
    """
    
    def __init__(self, text: str, author: User, card: 'Card'):
        self._id = str(uuid.uuid4())
        self._text = text
        self._author = author
        self._card = card
        self._created_at = datetime.now()
        self._updated_at = datetime.now()
    
    def get_id(self) -> str:
        return self._id
    
    def get_text(self) -> str:
        return self._text
    
    def get_author(self) -> User:
        return self._author
    
    def update_text(self, text: str) -> None:
        self._text = text
        self._updated_at = datetime.now()
    
    def __str__(self) -> str:
        return f"Comment by {self._author.get_name()}: {self._text[:50]}"


class Activity:
    """
    Activity log entry for audit trail.
    
    OOP CONCEPTS: Value Object - immutable activity record
    """
    
    def __init__(self, activity_type: ActivityType, user: User, 
                 entity_id: str, description: str, metadata: Dict = None):
        self._id = str(uuid.uuid4())
        self._type = activity_type
        self._user = user
        self._entity_id = entity_id
        self._description = description
        self._timestamp = datetime.now()
        self._metadata = metadata or {}
    
    def get_description(self) -> str:
        return self._description
    
    def get_timestamp(self) -> datetime:
        return self._timestamp
    
    def get_user(self) -> User:
        return self._user
    
    def __str__(self) -> str:
        return f"{self._timestamp.strftime('%Y-%m-%d %H:%M:%S')} - {self._user.get_name()}: {self._description}"


# ============================================================================
# COMPOSITE PATTERN - Board, List, Card Hierarchy
# ============================================================================

class Card:
    """
    Individual task card in a list.
    
    DESIGN PATTERN: Composite Pattern - leaf node in tree
    OOP CONCEPTS: Encapsulation - manages card data
    
    How to use:
    card = Card("Implement feature", "Add OAuth authentication", list_obj)
    card.set_due_date(datetime.now() + timedelta(days=7))
    card.add_label(label)
    
    Returns: Card object representing a task
    """
    
    def __init__(self, title: str, description: str, board_list: 'BoardList'):
        self._id = str(uuid.uuid4())
        self._title = title
        self._description = description
        self._list = board_list
        self._position = 0.0
        self._due_date: Optional[datetime] = None
        self._labels: List[Label] = []
        self._assigned_members: List[User] = []
        self._attachments: List[Attachment] = []
        self._comments: List[Comment] = []
        self._created_at = datetime.now()
        self._updated_at = datetime.now()
        self._archived = False
    
    def get_id(self) -> str:
        return self._id
    
    def get_title(self) -> str:
        return self._title
    
    def set_title(self, title: str) -> None:
        self._title = title
        self._updated_at = datetime.now()
    
    def get_description(self) -> str:
        return self._description
    
    def set_description(self, description: str) -> None:
        self._description = description
        self._updated_at = datetime.now()
    
    def get_list(self) -> 'BoardList':
        return self._list
    
    def set_list(self, board_list: 'BoardList') -> None:
        self._list = board_list
    
    def get_position(self) -> float:
        return self._position
    
    def set_position(self, position: float) -> None:
        """
        Set card position for ordering.
        
        ALGORITHM: Fractional indexing for efficient reordering
        """
        self._position = position
    
    def get_due_date(self) -> Optional[datetime]:
        return self._due_date
    
    def set_due_date(self, due_date: datetime) -> None:
        self._due_date = due_date
        self._updated_at = datetime.now()
    
    def add_label(self, label: Label) -> None:
        """
        Add label to card.
        
        DESIGN PATTERN: Decorator Pattern - adding features to card
        """
        if label not in self._labels:
            self._labels.append(label)
            self._updated_at = datetime.now()
    
    def remove_label(self, label: Label) -> None:
        if label in self._labels:
            self._labels.remove(label)
            self._updated_at = datetime.now()
    
    def get_labels(self) -> List[Label]:
        return self._labels.copy()
    
    def assign_member(self, user: User) -> None:
        if user not in self._assigned_members:
            self._assigned_members.append(user)
            self._updated_at = datetime.now()
    
    def unassign_member(self, user: User) -> None:
        if user in self._assigned_members:
            self._assigned_members.remove(user)
            self._updated_at = datetime.now()
    
    def get_assigned_members(self) -> List[User]:
        return self._assigned_members.copy()
    
    def add_attachment(self, attachment: Attachment) -> None:
        """
        Add attachment to card.
        
        DESIGN PATTERN: Decorator Pattern - enriching card with attachments
        """
        self._attachments.append(attachment)
        self._updated_at = datetime.now()
    
    def get_attachments(self) -> List[Attachment]:
        return self._attachments.copy()
    
    def add_comment(self, comment: Comment) -> None:
        """
        Add comment to card.
        
        DESIGN PATTERN: Decorator Pattern - enriching card with comments
        """
        self._comments.append(comment)
        self._updated_at = datetime.now()
    
    def get_comments(self) -> List[Comment]:
        return self._comments.copy()
    
    def archive(self) -> None:
        """Archive card (soft delete)."""
        self._archived = True
    
    def restore(self) -> None:
        """Restore archived card."""
        self._archived = False
    
    def is_archived(self) -> bool:
        return self._archived
    
    def __str__(self) -> str:
        return f"Card({self._title})"


class BoardList:
    """
    List containing cards (workflow stage like "To Do", "In Progress").
    
    DESIGN PATTERN: Composite Pattern - composite node containing cards
    OOP CONCEPTS: Composition - list has-a collection of cards
    
    How to use:
    list_obj = BoardList("To Do", board)
    list_obj.add_card(card)
    list_obj.move_card(card_id, 1.5)
    
    Returns: BoardList object representing a workflow stage
    """
    
    def __init__(self, name: str, board: 'Board'):
        self._id = str(uuid.uuid4())
        self._name = name
        self._board = board
        self._cards: List[Card] = []
        self._position = 0.0
        self._created_at = datetime.now()
        self._archived = False
    
    def get_id(self) -> str:
        return self._id
    
    def get_name(self) -> str:
        return self._name
    
    def set_name(self, name: str) -> None:
        self._name = name
    
    def get_board(self) -> 'Board':
        return self._board
    
    def get_position(self) -> float:
        return self._position
    
    def set_position(self, position: float) -> None:
        """
        Set list position for ordering.
        
        ALGORITHM: Fractional indexing for O(1) reordering
        """
        self._position = position
    
    def add_card(self, card: Card) -> None:
        """
        Add card to list.
        
        DESIGN PATTERN: Composite Pattern - adding child component
        """
        if card not in self._cards:
            self._cards.append(card)
            card.set_list(self)
    
    def remove_card(self, card_id: str) -> Optional[Card]:
        """
        Remove card from list.
        
        DESIGN PATTERN: Composite Pattern - removing child component
        """
        for card in self._cards:
            if card.get_id() == card_id:
                self._cards.remove(card)
                return card
        return None
    
    def get_card(self, card_id: str) -> Optional[Card]:
        """Get card by ID."""
        for card in self._cards:
            if card.get_id() == card_id:
                return card
        return None
    
    def get_cards(self) -> List[Card]:
        """
        Get all cards sorted by position.
        
        ALGORITHM: Sort by position for display order
        """
        return sorted([c for c in self._cards if not c.is_archived()], 
                     key=lambda x: x.get_position())
    
    def get_card_count(self) -> int:
        """Get number of active cards."""
        return sum(1 for c in self._cards if not c.is_archived())
    
    def move_card(self, card_id: str, new_position: float) -> bool:
        """
        Move card to new position within list.
        
        BUSINESS RULE: Use fractional indexing for efficient reordering
        """
        card = self.get_card(card_id)
        if card:
            card.set_position(new_position)
            return True
        return False
    
    def archive(self) -> None:
        """Archive list and all its cards."""
        self._archived = True
        for card in self._cards:
            card.archive()
    
    def restore(self) -> None:
        """Restore archived list and its cards."""
        self._archived = False
        for card in self._cards:
            card.restore()
    
    def is_archived(self) -> bool:
        return self._archived
    
    def __str__(self) -> str:
        return f"List({self._name}, {self.get_card_count()} cards)"


class Board:
    """
    Top-level board containing lists.
    
    DESIGN PATTERN: Composite Pattern - root composite containing lists
    OOP CONCEPTS: Composition - board has-a collection of lists
    
    How to use:
    board = Board("Project Alpha", owner, BoardVisibility.TEAM)
    board.add_list(list_obj)
    board.add_member(user, Role.MEMBER)
    
    Returns: Board object representing a project board
    """
    
    def __init__(self, name: str, owner: User, visibility: BoardVisibility = BoardVisibility.PRIVATE):
        self._id = str(uuid.uuid4())
        self._name = name
        self._description = ""
        self._owner = owner
        self._lists: List[BoardList] = []
        self._members: Dict[str, Role] = {owner.get_id(): Role.OWNER}
        self._labels: List[Label] = []
        self._activities: List[Activity] = []
        self._visibility = visibility
        self._created_at = datetime.now()
        self._updated_at = datetime.now()
    
    def get_id(self) -> str:
        return self._id
    
    def get_name(self) -> str:
        return self._name
    
    def set_name(self, name: str) -> None:
        self._name = name
        self._updated_at = datetime.now()
    
    def get_description(self) -> str:
        return self._description
    
    def set_description(self, description: str) -> None:
        self._description = description
        self._updated_at = datetime.now()
    
    def get_owner(self) -> User:
        return self._owner
    
    def get_visibility(self) -> BoardVisibility:
        return self._visibility
    
    def add_list(self, board_list: BoardList) -> None:
        """
        Add list to board.
        
        DESIGN PATTERN: Composite Pattern - adding child composite
        """
        if board_list not in self._lists:
            self._lists.append(board_list)
    
    def remove_list(self, list_id: str) -> Optional[BoardList]:
        """
        Remove list from board.
        
        DESIGN PATTERN: Composite Pattern - removing child composite
        """
        for board_list in self._lists:
            if board_list.get_id() == list_id:
                self._lists.remove(board_list)
                return board_list
        return None
    
    def get_list(self, list_id: str) -> Optional[BoardList]:
        """Get list by ID."""
        for board_list in self._lists:
            if board_list.get_id() == list_id:
                return board_list
        return None
    
    def get_lists(self) -> List[BoardList]:
        """
        Get all lists sorted by position.
        """
        return sorted([l for l in self._lists if not l.is_archived()], 
                     key=lambda x: x.get_position())
    
    def move_list(self, list_id: str, new_position: float) -> bool:
        """Move list to new position."""
        board_list = self.get_list(list_id)
        if board_list:
            board_list.set_position(new_position)
            return True
        return False
    
    def add_member(self, user: User, role: Role) -> None:
        """Add member to board with specific role."""
        self._members[user.get_id()] = role
    
    def remove_member(self, user_id: str) -> bool:
        """Remove member from board."""
        if user_id in self._members and user_id != self._owner.get_id():
            del self._members[user_id]
            return True
        return False
    
    def get_member_role(self, user_id: str) -> Optional[Role]:
        """Get role of a member."""
        return self._members.get(user_id)
    
    def is_member(self, user_id: str) -> bool:
        """Check if user is board member."""
        return user_id in self._members
    
    def add_label(self, label: Label) -> None:
        """Add label to board."""
        if label not in self._labels:
            self._labels.append(label)
    
    def get_labels(self) -> List[Label]:
        """Get all board labels."""
        return self._labels.copy()
    
    def add_activity(self, activity: Activity) -> None:
        """
        Log activity to board.
        
        BUSINESS RULE: Maintain audit trail of all operations
        """
        self._activities.append(activity)
    
    def get_activities(self, limit: int = 50) -> List[Activity]:
        """Get recent activities (newest first)."""
        return sorted(self._activities, key=lambda x: x.get_timestamp(), reverse=True)[:limit]
    
    def __str__(self) -> str:
        return f"Board({self._name}, {len(self._lists)} lists)"


# ============================================================================
# MEMENTO PATTERN - State Saving for Undo
# ============================================================================

class CardMemento:
    """
    Memento storing card state for undo functionality.
    
    DESIGN PATTERN: Memento Pattern - stores object state
    OOP CONCEPTS: Encapsulation - state hidden from external access
    
    How to use:
    memento = CardMemento.create_from(card)
    # ... modify card ...
    memento.restore(card)
    """
    
    def __init__(self, title: str, description: str, due_date: Optional[datetime],
                 labels: List[Label], assigned_members: List[User]):
        self._title = title
        self._description = description
        self._due_date = due_date
        self._labels = labels.copy()
        self._assigned_members = assigned_members.copy()
    
    @staticmethod
    def create_from(card: Card) -> 'CardMemento':
        """
        Create memento from card current state.
        
        DESIGN PATTERN: Memento Pattern - snapshot creation
        """
        return CardMemento(
            card.get_title(),
            card.get_description(),
            card.get_due_date(),
            card.get_labels(),
            card.get_assigned_members()
        )
    
    def restore(self, card: Card) -> None:
        """
        Restore card to saved state.
        
        DESIGN PATTERN: Memento Pattern - state restoration
        """
        card.set_title(self._title)
        card.set_description(self._description)
        card.set_due_date(self._due_date) if self._due_date else None


# ============================================================================
# COMMAND PATTERN - Operations with Undo/Redo
# ============================================================================

class Command(ABC):
    """
    Abstract command for operations.
    
    DESIGN PATTERN: Command Pattern - encapsulates operations
    SOLID: SRP - each command has single responsibility
    
    How to use:
    Subclass and implement execute() and undo() methods
    """
    
    @abstractmethod
    def execute(self) -> None:
        """Execute the command."""
        pass
    
    @abstractmethod
    def undo(self) -> None:
        """Undo the command."""
        pass
    
    @abstractmethod
    def get_description(self) -> str:
        """Get command description for logging."""
        pass


class CreateCardCommand(Command):
    """
    Command to create a new card.
    
    DESIGN PATTERN: Command Pattern - concrete command
    OOP CONCEPTS: Encapsulation - encapsulates card creation
    """
    
    def __init__(self, board_list: BoardList, card: Card):
        self._list = board_list
        self._card = card
        self._executed = False
    
    def execute(self) -> None:
        """Add card to list."""
        if not self._executed:
            self._list.add_card(self._card)
            self._executed = True
    
    def undo(self) -> None:
        """Remove card from list."""
        if self._executed:
            self._list.remove_card(self._card.get_id())
            self._executed = False
    
    def get_description(self) -> str:
        return f"Create card '{self._card.get_title()}' in list '{self._list.get_name()}'"


class MoveCardCommand(Command):
    """
    Command to move card between lists.
    
    DESIGN PATTERN: Command Pattern - concrete command
    BUSINESS RULE: Store old state for undo
    """
    
    def __init__(self, card: Card, from_list: BoardList, to_list: BoardList, 
                 old_position: float, new_position: float):
        self._card = card
        self._from_list = from_list
        self._to_list = to_list
        self._old_position = old_position
        self._new_position = new_position
        self._executed = False
    
    def execute(self) -> None:
        """Move card to new list and position."""
        if not self._executed:
            self._from_list.remove_card(self._card.get_id())
            self._to_list.add_card(self._card)
            self._card.set_position(self._new_position)
            self._executed = True
    
    def undo(self) -> None:
        """Move card back to original list and position."""
        if self._executed:
            self._to_list.remove_card(self._card.get_id())
            self._from_list.add_card(self._card)
            self._card.set_position(self._old_position)
            self._executed = False
    
    def get_description(self) -> str:
        return f"Move card '{self._card.get_title()}' from '{self._from_list.get_name()}' to '{self._to_list.get_name()}'"


class UpdateCardCommand(Command):
    """
    Command to update card details.
    
    DESIGN PATTERN: Command Pattern + Memento Pattern
    Uses memento to store old state for undo
    """
    
    def __init__(self, card: Card, old_state: CardMemento, new_title: str = None, 
                 new_description: str = None):
        self._card = card
        self._old_state = old_state
        self._new_title = new_title
        self._new_description = new_description
        self._executed = False
    
    def execute(self) -> None:
        """Update card with new values."""
        if not self._executed:
            if self._new_title:
                self._card.set_title(self._new_title)
            if self._new_description:
                self._card.set_description(self._new_description)
            self._executed = True
    
    def undo(self) -> None:
        """Restore card to old state."""
        if self._executed:
            self._old_state.restore(self._card)
            self._executed = False
    
    def get_description(self) -> str:
        return f"Update card '{self._card.get_title()}'"


class DeleteCardCommand(Command):
    """
    Command to delete (archive) a card.
    
    DESIGN PATTERN: Command Pattern
    BUSINESS RULE: Archive instead of permanent delete
    """
    
    def __init__(self, card: Card):
        self._card = card
        self._executed = False
    
    def execute(self) -> None:
        """Archive the card."""
        if not self._executed:
            self._card.archive()
            self._executed = True
    
    def undo(self) -> None:
        """Restore the card."""
        if self._executed:
            self._card.restore()
            self._executed = False
    
    def get_description(self) -> str:
        return f"Archive card '{self._card.get_title()}'"


class CommandHistory:
    """
    Manages command history for undo/redo.
    
    DESIGN PATTERN: Command Pattern - command manager
    DATA STRUCTURE: Two stacks for undo/redo
    
    How to use:
    history = CommandHistory()
    history.execute_command(command)
    history.undo()
    history.redo()
    """
    
    def __init__(self, max_size: int = 50):
        self._undo_stack: List[Command] = []
        self._redo_stack: List[Command] = []
        self._max_size = max_size
    
    def execute_command(self, command: Command) -> None:
        """
        Execute command and add to undo stack.
        
        BUSINESS RULE: Clear redo stack on new command
        TIME COMPLEXITY: O(1)
        """
        command.execute()
        self._undo_stack.append(command)
        self._redo_stack.clear()
        
        # Limit stack size
        if len(self._undo_stack) > self._max_size:
            self._undo_stack.pop(0)
    
    def undo(self) -> bool:
        """
        Undo last command.
        
        TIME COMPLEXITY: O(1)
        Returns: True if undo successful, False if nothing to undo
        """
        if self._undo_stack:
            command = self._undo_stack.pop()
            command.undo()
            self._redo_stack.append(command)
            return True
        return False
    
    def redo(self) -> bool:
        """
        Redo last undone command.
        
        TIME COMPLEXITY: O(1)
        Returns: True if redo successful, False if nothing to redo
        """
        if self._redo_stack:
            command = self._redo_stack.pop()
            command.execute()
            self._undo_stack.append(command)
            return True
        return False
    
    def can_undo(self) -> bool:
        """Check if undo is available."""
        return len(self._undo_stack) > 0
    
    def can_redo(self) -> bool:
        """Check if redo is available."""
        return len(self._redo_stack) > 0


# ============================================================================
# OBSERVER PATTERN - Real-time Updates
# ============================================================================

class BoardObserver(ABC):
    """
    Observer interface for board events.
    
    DESIGN PATTERN: Observer Pattern - defines observer interface
    SOLID: ISP - focused interface
    """
    
    @abstractmethod
    def on_board_updated(self, board: Board) -> None:
        pass
    
    @abstractmethod
    def on_list_added(self, board_list: BoardList) -> None:
        pass
    
    @abstractmethod
    def on_card_moved(self, card: Card, from_list: BoardList, to_list: BoardList) -> None:
        pass


class WebSocketNotifier(BoardObserver):
    """
    Concrete observer that sends WebSocket notifications.
    
    DESIGN PATTERN: Observer Pattern - concrete observer
    OOP CONCEPTS: Polymorphism - implements BoardObserver interface
    """
    
    def __init__(self):
        self._connections: Dict[str, Any] = {}  # Simulated WebSocket connections
    
    def on_board_updated(self, board: Board) -> None:
        """Notify all connected clients about board update."""
        message = f"🔔 Board '{board.get_name()}' was updated"
        print(f"WebSocket: {message}")
    
    def on_list_added(self, board_list: BoardList) -> None:
        """Notify about new list."""
        message = f"🔔 List '{board_list.get_name()}' was added"
        print(f"WebSocket: {message}")
    
    def on_card_moved(self, card: Card, from_list: BoardList, to_list: BoardList) -> None:
        """Notify about card movement."""
        message = f"🔔 Card '{card.get_title()}' moved from '{from_list.get_name()}' to '{to_list.get_name()}'"
        print(f"WebSocket: {message}")


class ActivityLogger(BoardObserver):
    """
    Observer that logs all activities.
    
    DESIGN PATTERN: Observer Pattern - concrete observer
    """
    
    def on_board_updated(self, board: Board) -> None:
        """Log board update activity."""
        activity = Activity(
            ActivityType.BOARD_CREATED,
            board.get_owner(),
            board.get_id(),
            f"Board '{board.get_name()}' was updated",
            {}
        )
        board.add_activity(activity)
    
    def on_list_added(self, board_list: BoardList) -> None:
        """Log list addition activity."""
        activity = Activity(
            ActivityType.LIST_ADDED,
            board_list.get_board().get_owner(),
            board_list.get_id(),
            f"List '{board_list.get_name()}' was added",
            {}
        )
        board_list.get_board().add_activity(activity)
    
    def on_card_moved(self, card: Card, from_list: BoardList, to_list: BoardList) -> None:
        """Log card movement activity."""
        activity = Activity(
            ActivityType.CARD_MOVED,
            card.get_list().get_board().get_owner(),
            card.get_id(),
            f"Card '{card.get_title()}' moved from '{from_list.get_name()}' to '{to_list.get_name()}'",
            {"from_list": from_list.get_id(), "to_list": to_list.get_id()}
        )
        card.get_list().get_board().add_activity(activity)


# ============================================================================
# CHAIN OF RESPONSIBILITY - Permission Checking
# ============================================================================

class PermissionChecker(ABC):
    """
    Abstract permission checker.
    
    DESIGN PATTERN: Chain of Responsibility - defines chain interface
    SOLID: SRP - each checker handles one level
    """
    
    def __init__(self):
        self._next: Optional[PermissionChecker] = None
    
    def set_next(self, checker: 'PermissionChecker') -> 'PermissionChecker':
        """Set next checker in chain."""
        self._next = checker
        return checker
    
    @abstractmethod
    def check_permission(self, user: User, resource: Any, action: str) -> bool:
        """Check if user has permission for action on resource."""
        pass


class BoardPermissionChecker(PermissionChecker):
    """
    Checks board-level permissions.
    
    DESIGN PATTERN: Chain of Responsibility - concrete handler
    """
    
    def check_permission(self, user: User, resource: Any, action: str) -> bool:
        """
        Check board permissions.
        
        BUSINESS RULE: OBSERVER role can only view
        """
        if isinstance(resource, Board):
            role = resource.get_member_role(user.get_id())
            if not role:
                return False  # Not a member
            
            if role == Role.OBSERVER and action in ["edit", "delete"]:
                return False
            
            if role in [Role.OWNER, Role.ADMIN]:
                return True  # Full access
            
            if role == Role.MEMBER and action in ["view", "edit"]:
                return True
        
        # Pass to next checker
        if self._next:
            return self._next.check_permission(user, resource, action)
        
        return True  # Default allow


class ListPermissionChecker(PermissionChecker):
    """
    Checks list-level permissions.
    
    DESIGN PATTERN: Chain of Responsibility - concrete handler
    """
    
    def check_permission(self, user: User, resource: Any, action: str) -> bool:
        """Check list permissions (inherits from board)."""
        if isinstance(resource, BoardList):
            # Check board permissions first
            board = resource.get_board()
            board_role = board.get_member_role(user.get_id())
            if not board_role or board_role == Role.OBSERVER:
                return action == "view"
        
        # Pass to next checker
        if self._next:
            return self._next.check_permission(user, resource, action)
        
        return True


class CardPermissionChecker(PermissionChecker):
    """
    Checks card-level permissions.
    
    DESIGN PATTERN: Chain of Responsibility - concrete handler
    """
    
    def check_permission(self, user: User, resource: Any, action: str) -> bool:
        """Check card permissions (inherits from board)."""
        if isinstance(resource, Card):
            # Check board permissions
            board = resource.get_list().get_board()
            board_role = board.get_member_role(user.get_id())
            if not board_role or board_role == Role.OBSERVER:
                return action == "view"
        
        # Pass to next checker
        if self._next:
            return self._next.check_permission(user, resource, action)
        
        return True


# ============================================================================
# BOARD SERVICE - Main Facade
# ============================================================================

class BoardService:
    """
    Main service managing boards with all patterns.
    
    DESIGN PATTERN: Facade Pattern - unified interface
    OOP CONCEPTS: Encapsulation - manages system complexity
    
    How to use:
    service = BoardService()
    board = service.create_board("Project", owner)
    list_obj = service.create_list(board.get_id(), "To Do")
    card = service.create_card(list_obj.get_id(), "Task")
    service.undo()  # Undo last operation
    """
    
    def __init__(self):
        self._boards: Dict[str, Board] = {}
        self._command_history = CommandHistory()
        self._observers: List[BoardObserver] = []
        
        # Setup permission chain
        self._permission_chain = BoardPermissionChecker()
        self._permission_chain.set_next(ListPermissionChecker()).set_next(CardPermissionChecker())
    
    def add_observer(self, observer: BoardObserver) -> None:
        """
        Register observer for board events.
        
        DESIGN PATTERN: Observer Pattern - register observers
        """
        self._observers.append(observer)
    
    def create_board(self, name: str, owner: User, visibility: BoardVisibility = BoardVisibility.PRIVATE) -> Board:
        """Create new board."""
        board = Board(name, owner, visibility)
        self._boards[board.get_id()] = board
        self._notify_board_updated(board)
        return board
    
    def create_list(self, board_id: str, name: str) -> Optional[BoardList]:
        """Create new list in board."""
        board = self._boards.get(board_id)
        if not board:
            return None
        
        board_list = BoardList(name, board)
        position = len(board.get_lists()) + 1.0
        board_list.set_position(position)
        board.add_list(board_list)
        
        self._notify_list_added(board_list)
        return board_list
    
    def create_card(self, list_id: str, title: str, description: str = "") -> Optional[Card]:
        """Create new card in list."""
        # Find list
        board_list = self._find_list(list_id)
        if not board_list:
            return None
        
        card = Card(title, description, board_list)
        position = board_list.get_card_count() + 1.0
        card.set_position(position)
        
        command = CreateCardCommand(board_list, card)
        self._command_history.execute_command(command)
        
        return card
    
    def move_card(self, card_id: str, to_list_id: str, position: float) -> bool:
        """Move card to different list."""
        card = self._find_card(card_id)
        to_list = self._find_list(to_list_id)
        
        if not card or not to_list:
            return False
        
        from_list = card.get_list()
        old_position = card.get_position()
        
        command = MoveCardCommand(card, from_list, to_list, old_position, position)
        self._command_history.execute_command(command)
        
        self._notify_card_moved(card, from_list, to_list)
        return True
    
    def update_card(self, card_id: str, new_title: str = None, new_description: str = None) -> bool:
        """Update card details."""
        card = self._find_card(card_id)
        if not card:
            return False
        
        old_state = CardMemento.create_from(card)
        command = UpdateCardCommand(card, old_state, new_title, new_description)
        self._command_history.execute_command(command)
        
        return True
    
    def delete_card(self, card_id: str) -> bool:
        """Delete (archive) a card."""
        card = self._find_card(card_id)
        if not card:
            return False
        
        command = DeleteCardCommand(card)
        self._command_history.execute_command(command)
        
        return True
    
    def add_label_to_card(self, card_id: str, label: Label) -> bool:
        """Add label to card (Decorator Pattern)."""
        card = self._find_card(card_id)
        if not card:
            return False
        
        card.add_label(label)
        return True
    
    def assign_member_to_card(self, card_id: str, user: User) -> bool:
        """Assign member to card."""
        card = self._find_card(card_id)
        if not card:
            return False
        
        card.assign_member(user)
        return True
    
    def add_comment(self, card_id: str, comment: Comment) -> bool:
        """Add comment to card (Decorator Pattern)."""
        card = self._find_card(card_id)
        if not card:
            return False
        
        card.add_comment(comment)
        return True
    
    def undo(self) -> bool:
        """
        Undo last operation.
        
        DESIGN PATTERN: Command Pattern - undo functionality
        Returns: True if undo successful
        """
        return self._command_history.undo()
    
    def redo(self) -> bool:
        """
        Redo last undone operation.
        
        DESIGN PATTERN: Command Pattern - redo functionality
        Returns: True if redo successful
        """
        return self._command_history.redo()
    
    def can_undo(self) -> bool:
        """Check if undo is available."""
        return self._command_history.can_undo()
    
    def can_redo(self) -> bool:
        """Check if redo is available."""
        return self._command_history.can_redo()
    
    def check_permission(self, user: User, resource: Any, action: str) -> bool:
        """
        Check if user has permission for action.
        
        DESIGN PATTERN: Chain of Responsibility - permission check
        """
        return self._permission_chain.check_permission(user, resource, action)
    
    def _find_list(self, list_id: str) -> Optional[BoardList]:
        """Find list by ID across all boards."""
        for board in self._boards.values():
            board_list = board.get_list(list_id)
            if board_list:
                return board_list
        return None
    
    def _find_card(self, card_id: str) -> Optional[Card]:
        """Find card by ID across all boards."""
        for board in self._boards.values():
            for board_list in board.get_lists():
                card = board_list.get_card(card_id)
                if card:
                    return card
        return None
    
    def _notify_board_updated(self, board: Board) -> None:
        """Notify observers of board update."""
        for observer in self._observers:
            observer.on_board_updated(board)
    
    def _notify_list_added(self, board_list: BoardList) -> None:
        """Notify observers of list addition."""
        for observer in self._observers:
            observer.on_list_added(board_list)
    
    def _notify_card_moved(self, card: Card, from_list: BoardList, to_list: BoardList) -> None:
        """Notify observers of card movement."""
        for observer in self._observers:
            observer.on_card_moved(card, from_list, to_list)


# ============================================================================
# DEMO / MAIN FUNCTION
# ============================================================================

def main():
    """
    Demonstrate the Trello/Kanban board system.
    
    DEMONSTRATES:
    - Board/List/Card hierarchy (Composite Pattern)
    - Undo/Redo operations (Command Pattern)
    - Real-time updates (Observer Pattern)
    - State saving (Memento Pattern)
    - Permission checking (Chain of Responsibility)
    - Card enhancements (Decorator Pattern)
    """
    print("=" * 80)
    print("TRELLO / KANBAN BOARD SYSTEM - COMPREHENSIVE DEMO")
    print("=" * 80)
    print()
    
    # Step 1: Create service and users
    print("📝 Step 1: Creating Board Service and Users")
    print("-" * 80)
    service = BoardService()
    
    # Add observers
    ws_notifier = WebSocketNotifier()
    activity_logger = ActivityLogger()
    service.add_observer(ws_notifier)
    service.add_observer(activity_logger)
    
    alice = User("Alice", "alice@example.com")
    bob = User("Bob", "bob@example.com")
    charlie = User("Charlie", "charlie@example.com")
    print(f"✅ Created users: {alice.get_name()}, {bob.get_name()}, {charlie.get_name()}")
    print()
    
    # Step 2: Create board
    print("📝 Step 2: Creating Board")
    print("-" * 80)
    board = service.create_board("Project Alpha", alice, BoardVisibility.TEAM)
    print(f"✅ Created board: {board.get_name()}")
    print()
    
    # Step 3: Add members
    print("📝 Step 3: Adding Team Members")
    print("-" * 80)
    board.add_member(bob, Role.MEMBER)
    board.add_member(charlie, Role.OBSERVER)
    print(f"✅ Added {bob.get_name()} as MEMBER")
    print(f"✅ Added {charlie.get_name()} as OBSERVER")
    print()
    
    # Step 4: Create lists
    print("📝 Step 4: Creating Workflow Lists")
    print("-" * 80)
    todo_list = service.create_list(board.get_id(), "To Do")
    in_progress_list = service.create_list(board.get_id(), "In Progress")
    done_list = service.create_list(board.get_id(), "Done")
    print(f"✅ Created lists: To Do, In Progress, Done")
    print()
    
    # Step 5: Create cards
    print("📝 Step 5: Creating Task Cards")
    print("-" * 80)
    card1 = service.create_card(todo_list.get_id(), "Implement authentication", "Add OAuth 2.0 authentication")
    card2 = service.create_card(todo_list.get_id(), "Design database schema", "Design tables for users and posts")
    card3 = service.create_card(todo_list.get_id(), "Write API documentation", "Document REST API endpoints")
    print(f"✅ Created 3 cards in 'To Do'")
    print()
    
    # Step 6: Add labels (Decorator Pattern)
    print("📝 Step 6: Adding Labels to Cards (Decorator Pattern)")
    print("-" * 80)
    label_urgent = Label("Urgent", "#FF0000", board)
    label_backend = Label("Backend", "#0000FF", board)
    board.add_label(label_urgent)
    board.add_label(label_backend)
    
    service.add_label_to_card(card1.get_id(), label_urgent)
    service.add_label_to_card(card1.get_id(), label_backend)
    print(f"✅ Added labels to '{card1.get_title()}'")
    print()
    
    # Step 7: Assign members
    print("📝 Step 7: Assigning Team Members to Cards")
    print("-" * 80)
    service.assign_member_to_card(card1.get_id(), bob)
    print(f"✅ Assigned {bob.get_name()} to '{card1.get_title()}'")
    print()
    
    # Step 8: Add comments (Decorator Pattern)
    print("📝 Step 8: Adding Comments (Decorator Pattern)")
    print("-" * 80)
    comment = Comment("Let's use Auth0 for OAuth implementation", alice, card1)
    service.add_comment(card1.get_id(), comment)
    print(f"✅ Added comment to '{card1.get_title()}'")
    print()
    
    # Step 9: Move cards (Command Pattern)
    print("📝 Step 9: Moving Cards Between Lists (Command Pattern)")
    print("-" * 80)
    service.move_card(card1.get_id(), in_progress_list.get_id(), 1.0)
    print(f"✅ Moved '{card1.get_title()}' to 'In Progress'")
    print()
    
    # Step 10: Update card (Command Pattern + Memento Pattern)
    print("📝 Step 10: Updating Card (Command + Memento Pattern)")
    print("-" * 80)
    service.update_card(card2.get_id(), new_title="Design complete database schema")
    print(f"✅ Updated card title")
    print()
    
    # Step 11: Demonstrate undo/redo
    print("📝 Step 11: Demonstrating Undo/Redo (Command Pattern)")
    print("-" * 80)
    print(f"Can undo: {service.can_undo()}")
    print(f"Can redo: {service.can_redo()}")
    print()
    print("Undoing last update...")
    service.undo()
    print(f"Card title after undo: '{card2.get_title()}'")
    print()
    print("Redoing...")
    service.redo()
    print(f"Card title after redo: '{card2.get_title()}'")
    print()
    
    # Step 12: Permission checking (Chain of Responsibility)
    print("📝 Step 12: Checking Permissions (Chain of Responsibility)")
    print("-" * 80)
    can_edit_alice = service.check_permission(alice, board, "edit")
    can_edit_bob = service.check_permission(bob, board, "edit")
    can_edit_charlie = service.check_permission(charlie, board, "edit")
    print(f"Alice (OWNER) can edit board: {can_edit_alice}")
    print(f"Bob (MEMBER) can edit board: {can_edit_bob}")
    print(f"Charlie (OBSERVER) can edit board: {can_edit_charlie}")
    print()
    
    # Step 13: Show board structure (Composite Pattern)
    print("📝 Step 13: Board Structure (Composite Pattern)")
    print("-" * 80)
    print(f"Board: {board.get_name()}")
    for board_list in board.get_lists():
        print(f"  └─ List: {board_list.get_name()} ({board_list.get_card_count()} cards)")
        for card in board_list.get_cards():
            print(f"      └─ Card: {card.get_title()}")
            if card.get_labels():
                labels_str = ", ".join([f"{l.get_name()}" for l in card.get_labels()])
                print(f"          Labels: {labels_str}")
            if card.get_assigned_members():
                members_str = ", ".join([m.get_name() for m in card.get_assigned_members()])
                print(f"          Assigned: {members_str}")
    print()
    
    # Step 14: Activity log (Observer Pattern)
    print("📝 Step 14: Activity Log (Observer Pattern)")
    print("-" * 80)
    activities = board.get_activities(limit=10)
    print(f"Recent activities:")
    for activity in activities:
        print(f"  • {activity}")
    print()
    
    print("=" * 80)
    print("DEMO COMPLETED SUCCESSFULLY!")
    print("=" * 80)
    print()
    print("Design Patterns Demonstrated:")
    print("  1. ✅ Composite Pattern - Board/List/Card hierarchy")
    print("  2. ✅ Command Pattern - Undo/Redo functionality")
    print("  3. ✅ Observer Pattern - Real-time notifications")
    print("  4. ✅ Memento Pattern - State saving for undo")
    print("  5. ✅ Chain of Responsibility - Permission checking")
    print("  6. ✅ Decorator Pattern - Labels, comments, attachments")


if __name__ == "__main__":
    main()

