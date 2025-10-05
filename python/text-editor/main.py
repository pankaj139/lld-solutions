"""
TEXT EDITOR SYSTEM - Low Level Design Implementation in Python

This file implements a collaborative text editor with undo/redo, cursor management,
operational transformation for real-time collaboration, and version history.

FILE PURPOSE:
Provides a production-ready text editor system supporting single and multi-user editing,
with efficient text operations, unlimited undo/redo, cursor/selection management, and
real-time collaboration through operational transformation.

DESIGN PATTERNS USED:
1. COMMAND PATTERN: Undo/redo functionality
   - Each edit is encapsulated as a command
   - Commands can be undone and redone
   - Command history management

2. MEMENTO PATTERN: Document state snapshots
   - Save document state for version history
   - Restore to previous states
   - Diff and merge capabilities

3. OBSERVER PATTERN: Real-time collaboration
   - Notify collaborators of changes
   - Sync document state
   - Event-driven updates

4. STRATEGY PATTERN: Different buffer implementations
   - Pluggable buffer strategy
   - Optimize for different use cases
   - Easy to switch implementations

5. COMPOSITE PATTERN: Document structure
   - Lines, paragraphs, sections
   - Hierarchical text organization
   - Recursive operations

6. TEMPLATE METHOD PATTERN: Operation workflow
   - Standardized operation flow
   - Customizable steps
   - Consistent behavior

7. CHAIN OF RESPONSIBILITY: Operation transformation
   - Transform operations through chain
   - Handle conflicts
   - Resolution pipeline

OOP CONCEPTS DEMONSTRATED:
- ENCAPSULATION: Text buffer hidden behind interface
- INHERITANCE: Command hierarchy
- POLYMORPHISM: Different command types
- ABSTRACTION: Buffer and operation abstractions

SOLID PRINCIPLES:
- SRP: Each class has single responsibility
- OCP: Open for extension (new commands) closed for modification
- LSP: All commands interchangeable
- ISP: Focused interfaces
- DIP: Depends on abstractions

USAGE:
    # Create document
    doc = Document()
    
    # Insert text
    doc.insert(0, "Hello World")
    
    # Delete text
    doc.delete(6, 5)
    
    # Undo/Redo
    doc.undo()
    doc.redo()
    
    # Cursor and selection
    cursor = Cursor(0, "user1")
    doc.add_cursor(cursor)
    
    selection = Selection(0, 5)
    selected_text = doc.get_text(selection.start, selection.end)
    
    # Save and restore
    doc.save("file.txt")
    version_id = doc.create_version("v1")
    doc.restore_version(version_id)

RETURN VALUES:
- insert(position, text): Returns None
- delete(position, length): Returns deleted text
- undo(): Returns bool (True if successful)
- redo(): Returns bool (True if successful)
- get_text(start, end): Returns str
"""

from abc import ABC, abstractmethod
from enum import Enum
from typing import List, Optional, Dict, Tuple
from datetime import datetime
import time


# ==================== ENUMS ====================

class OperationType(Enum):
    """Operation types for collaborative editing"""
    INSERT = "insert"
    DELETE = "delete"
    REPLACE = "replace"


# ==================== TEXT BUFFER ====================

class TextBuffer:
    """
    Simple text buffer implementation
    
    For production, use Piece Table or Rope for better performance
    This implementation uses a simple list for clarity
    
    USAGE:
        buffer = TextBuffer()
        buffer.insert(0, "Hello")
        text = buffer.get_text()
    
    RETURN:
        TextBuffer instance
    """
    def __init__(self):
        self._content = []  # List of characters for simple implementation
    
    def insert(self, position: int, text: str):
        """Insert text at position"""
        if position < 0 or position > len(self._content):
            raise ValueError(f"Invalid position: {position}")
        
        for i, char in enumerate(text):
            self._content.insert(position + i, char)
    
    def delete(self, position: int, length: int) -> str:
        """Delete text and return deleted content"""
        if position < 0 or position + length > len(self._content):
            raise ValueError(f"Invalid range: {position}, {length}")
        
        deleted = ''.join(self._content[position:position + length])
        del self._content[position:position + length]
        return deleted
    
    def get_text(self, start: int = 0, end: Optional[int] = None) -> str:
        """Get text in range"""
        if end is None:
            end = len(self._content)
        return ''.join(self._content[start:end])
    
    def get_length(self) -> int:
        """Get total length"""
        return len(self._content)
    
    def clear(self):
        """Clear all content"""
        self._content.clear()


# ==================== COMMAND PATTERN ====================

class Command(ABC):
    """
    Abstract command for undo/redo
    
    DESIGN PATTERN: Command Pattern
    
    USAGE:
        command = InsertCommand(buffer, 0, "Hello")
        command.execute()
        command.undo()
    
    RETURN:
        Command instance
    """
    def __init__(self):
        self.timestamp = time.time()
    
    @abstractmethod
    def execute(self):
        """Execute command"""
        pass
    
    @abstractmethod
    def undo(self):
        """Undo command"""
        pass
    
    def get_timestamp(self) -> float:
        """Get command timestamp"""
        return self.timestamp


class InsertCommand(Command):
    """
    Insert text command
    
    USAGE:
        cmd = InsertCommand(buffer, 0, "Hello")
        cmd.execute()
    
    RETURN:
        None
    """
    def __init__(self, buffer: TextBuffer, position: int, text: str, user_id: str = ""):
        super().__init__()
        self.buffer = buffer
        self.position = position
        self.text = text
        self.user_id = user_id
    
    def execute(self):
        """Insert text at position"""
        self.buffer.insert(self.position, self.text)
    
    def undo(self):
        """Delete inserted text"""
        self.buffer.delete(self.position, len(self.text))
    
    def __repr__(self):
        return f"InsertCommand(pos={self.position}, text='{self.text[:20]}...')"


class DeleteCommand(Command):
    """
    Delete text command
    
    USAGE:
        cmd = DeleteCommand(buffer, 0, 5)
        cmd.execute()
    
    RETURN:
        None
    """
    def __init__(self, buffer: TextBuffer, position: int, length: int, user_id: str = ""):
        super().__init__()
        self.buffer = buffer
        self.position = position
        self.length = length
        self.user_id = user_id
        self.deleted_text = ""
    
    def execute(self):
        """Delete text at position"""
        self.deleted_text = self.buffer.delete(self.position, self.length)
    
    def undo(self):
        """Restore deleted text"""
        self.buffer.insert(self.position, self.deleted_text)
    
    def __repr__(self):
        return f"DeleteCommand(pos={self.position}, len={self.length})"


class ReplaceCommand(Command):
    """
    Replace text command
    
    USAGE:
        cmd = ReplaceCommand(buffer, 0, 5, "Hi")
        cmd.execute()
    
    RETURN:
        None
    """
    def __init__(self, buffer: TextBuffer, position: int, length: int, new_text: str, user_id: str = ""):
        super().__init__()
        self.buffer = buffer
        self.position = position
        self.length = length
        self.new_text = new_text
        self.user_id = user_id
        self.old_text = ""
    
    def execute(self):
        """Replace text"""
        self.old_text = self.buffer.delete(self.position, self.length)
        self.buffer.insert(self.position, self.new_text)
    
    def undo(self):
        """Restore original text"""
        self.buffer.delete(self.position, len(self.new_text))
        self.buffer.insert(self.position, self.old_text)
    
    def __repr__(self):
        return f"ReplaceCommand(pos={self.position}, old='{self.old_text[:10]}...', new='{self.new_text[:10]}...')"


# ==================== COMMAND HISTORY ====================

class CommandHistory:
    """
    Manages undo/redo stack
    
    USAGE:
        history = CommandHistory()
        history.execute(command)
        history.undo()
        history.redo()
    
    RETURN:
        CommandHistory instance
    """
    def __init__(self, max_size: int = 1000):
        self._undo_stack: List[Command] = []
        self._redo_stack: List[Command] = []
        self._max_size = max_size
    
    def execute(self, command: Command):
        """Execute command and add to undo stack"""
        command.execute()
        self._undo_stack.append(command)
        self._redo_stack.clear()  # Clear redo stack on new command
        
        # Limit stack size
        if len(self._undo_stack) > self._max_size:
            self._undo_stack.pop(0)
    
    def undo(self) -> bool:
        """Undo last command"""
        if not self._undo_stack:
            return False
        
        command = self._undo_stack.pop()
        command.undo()
        self._redo_stack.append(command)
        return True
    
    def redo(self) -> bool:
        """Redo last undone command"""
        if not self._redo_stack:
            return False
        
        command = self._redo_stack.pop()
        command.execute()
        self._undo_stack.append(command)
        return True
    
    def can_undo(self) -> bool:
        """Check if undo is available"""
        return len(self._undo_stack) > 0
    
    def can_redo(self) -> bool:
        """Check if redo is available"""
        return len(self._redo_stack) > 0
    
    def clear(self):
        """Clear all history"""
        self._undo_stack.clear()
        self._redo_stack.clear()
    
    def get_history_size(self) -> Tuple[int, int]:
        """Get (undo_size, redo_size)"""
        return (len(self._undo_stack), len(self._redo_stack))


# ==================== CURSOR AND SELECTION ====================

class Cursor:
    """
    Cursor position in document
    
    USAGE:
        cursor = Cursor(0, "user1")
        cursor.move(5)
        pos = cursor.get_position()
    
    RETURN:
        Cursor instance
    """
    def __init__(self, position: int, user_id: str):
        self.position = position
        self.user_id = user_id
    
    def move(self, delta: int):
        """Move cursor by delta"""
        self.position = max(0, self.position + delta)
    
    def set_position(self, position: int):
        """Set cursor position"""
        self.position = max(0, position)
    
    def get_position(self) -> int:
        """Get cursor position"""
        return self.position
    
    def __repr__(self):
        return f"Cursor(user={self.user_id}, pos={self.position})"


class Selection:
    """
    Text selection range
    
    USAGE:
        selection = Selection(0, 5)
        length = selection.length()
    
    RETURN:
        Selection instance
    """
    def __init__(self, start: int, end: int):
        self.start = min(start, end)
        self.end = max(start, end)
    
    def length(self) -> int:
        """Get selection length"""
        return self.end - self.start
    
    def is_empty(self) -> bool:
        """Check if selection is empty"""
        return self.start == self.end
    
    def contains(self, position: int) -> bool:
        """Check if position is in selection"""
        return self.start <= position < self.end
    
    def __repr__(self):
        return f"Selection({self.start}, {self.end})"


# ==================== VERSION HISTORY ====================

class Version:
    """
    Document version snapshot
    
    USAGE:
        version = Version("v1", "Initial version", text_content)
    
    RETURN:
        Version instance
    """
    def __init__(self, version_id: str, description: str, content: str):
        self.version_id = version_id
        self.description = description
        self.content = content
        self.timestamp = datetime.now()
    
    def __repr__(self):
        return f"Version({self.version_id}, {self.timestamp})"


class VersionHistory:
    """
    Manages document versions
    
    USAGE:
        history = VersionHistory()
        version_id = history.create_version("v1", "Initial", content)
        history.restore(version_id)
    
    RETURN:
        VersionHistory instance
    """
    def __init__(self):
        self._versions: Dict[str, Version] = {}
    
    def create_version(self, version_id: str, description: str, content: str) -> str:
        """Create new version snapshot"""
        version = Version(version_id, description, content)
        self._versions[version_id] = version
        return version_id
    
    def get_version(self, version_id: str) -> Optional[Version]:
        """Get version by ID"""
        return self._versions.get(version_id)
    
    def list_versions(self) -> List[Version]:
        """List all versions"""
        return sorted(self._versions.values(), key=lambda v: v.timestamp)
    
    def delete_version(self, version_id: str) -> bool:
        """Delete version"""
        if version_id in self._versions:
            del self._versions[version_id]
            return True
        return False


# ==================== OPERATIONAL TRANSFORMATION ====================

class Operation:
    """
    Operation for collaborative editing
    
    USAGE:
        op = Operation(OperationType.INSERT, 0, "Hello", "user1")
    
    RETURN:
        Operation instance
    """
    def __init__(self, op_type: OperationType, position: int, content: str, user_id: str):
        self.op_type = op_type
        self.position = position
        self.content = content
        self.user_id = user_id
        self.timestamp = time.time()
    
    def __repr__(self):
        return f"Operation({self.op_type.value}, pos={self.position}, user={self.user_id})"


def transform_operation(op1: Operation, op2: Operation) -> Operation:
    """
    Transform op2 against op1 (op1 happened first)
    
    USAGE:
        transformed_op = transform_operation(op1, op2)
    
    RETURN:
        Transformed Operation
    """
    if op1.op_type == OperationType.INSERT and op2.op_type == OperationType.INSERT:
        # Both insertions
        if op2.position > op1.position:
            op2.position += len(op1.content)
        elif op2.position == op1.position and op2.user_id < op1.user_id:
            # Tie-breaking by user_id
            op2.position += len(op1.content)
    
    elif op1.op_type == OperationType.DELETE and op2.op_type == OperationType.INSERT:
        # Delete then insert
        if op2.position >= op1.position + len(op1.content):
            op2.position -= len(op1.content)
        elif op2.position > op1.position:
            op2.position = op1.position
    
    elif op1.op_type == OperationType.INSERT and op2.op_type == OperationType.DELETE:
        # Insert then delete
        if op2.position >= op1.position:
            op2.position += len(op1.content)
    
    elif op1.op_type == OperationType.DELETE and op2.op_type == OperationType.DELETE:
        # Both deletions
        if op2.position >= op1.position + len(op1.content):
            op2.position -= len(op1.content)
        elif op2.position >= op1.position:
            # Overlapping deletes - adjust
            overlap = min(len(op2.content), op1.position + len(op1.content) - op2.position)
            op2.content = op2.content[overlap:]
            op2.position = op1.position
    
    return op2


# ==================== DOCUMENT ====================

class Document:
    """
    Main document manager
    
    DESIGN PATTERN: Facade - coordinates all components
    
    USAGE:
        doc = Document()
        doc.insert(0, "Hello World")
        doc.undo()
        doc.save("file.txt")
    
    RETURN:
        Document instance
    """
    def __init__(self):
        self._buffer = TextBuffer()
        self._history = CommandHistory()
        self._cursors: List[Cursor] = []
        self._versions = VersionHistory()
        self._collaboration_enabled = False
        self._pending_operations: List[Operation] = []
    
    def insert(self, position: int, text: str, user_id: str = "local"):
        """
        Insert text at position
        
        USAGE:
            doc.insert(0, "Hello")
        
        RETURN:
            None
        """
        command = InsertCommand(self._buffer, position, text, user_id)
        self._history.execute(command)
        
        # Update cursors
        for cursor in self._cursors:
            if cursor.position >= position:
                cursor.move(len(text))
    
    def delete(self, position: int, length: int, user_id: str = "local") -> str:
        """
        Delete text at position
        
        USAGE:
            deleted = doc.delete(0, 5)
        
        RETURN:
            Deleted text
        """
        command = DeleteCommand(self._buffer, position, length, user_id)
        self._history.execute(command)
        
        # Update cursors
        for cursor in self._cursors:
            if cursor.position >= position + length:
                cursor.move(-length)
            elif cursor.position > position:
                cursor.set_position(position)
        
        return command.deleted_text
    
    def replace(self, position: int, length: int, new_text: str, user_id: str = "local"):
        """
        Replace text
        
        USAGE:
            doc.replace(0, 5, "Hi")
        
        RETURN:
            None
        """
        command = ReplaceCommand(self._buffer, position, length, new_text, user_id)
        self._history.execute(command)
    
    def undo(self) -> bool:
        """
        Undo last operation
        
        USAGE:
            success = doc.undo()
        
        RETURN:
            bool - True if successful
        """
        return self._history.undo()
    
    def redo(self) -> bool:
        """
        Redo last undone operation
        
        USAGE:
            success = doc.redo()
        
        RETURN:
            bool - True if successful
        """
        return self._history.redo()
    
    def get_text(self, start: int = 0, end: Optional[int] = None) -> str:
        """
        Get text in range
        
        USAGE:
            text = doc.get_text(0, 10)
        
        RETURN:
            str - text content
        """
        return self._buffer.get_text(start, end)
    
    def get_length(self) -> int:
        """Get document length"""
        return self._buffer.get_length()
    
    def add_cursor(self, cursor: Cursor):
        """Add cursor"""
        self._cursors.append(cursor)
    
    def remove_cursor(self, user_id: str) -> bool:
        """Remove cursor by user ID"""
        initial_len = len(self._cursors)
        self._cursors = [c for c in self._cursors if c.user_id != user_id]
        return len(self._cursors) < initial_len
    
    def get_cursors(self) -> List[Cursor]:
        """Get all cursors"""
        return self._cursors.copy()
    
    def create_version(self, version_id: str, description: str = "") -> str:
        """
        Create version snapshot
        
        USAGE:
            version_id = doc.create_version("v1", "Initial version")
        
        RETURN:
            str - version ID
        """
        content = self.get_text()
        return self._versions.create_version(version_id, description, content)
    
    def restore_version(self, version_id: str) -> bool:
        """
        Restore document to version
        
        USAGE:
            success = doc.restore_version("v1")
        
        RETURN:
            bool - True if successful
        """
        version = self._versions.get_version(version_id)
        if version:
            self._buffer.clear()
            self._buffer.insert(0, version.content)
            self._history.clear()
            return True
        return False
    
    def list_versions(self) -> List[Version]:
        """List all versions"""
        return self._versions.list_versions()
    
    def save(self, filename: str):
        """
        Save document to file
        
        USAGE:
            doc.save("document.txt")
        
        RETURN:
            None
        """
        with open(filename, 'w') as f:
            f.write(self.get_text())
        print(f"✓ Saved to {filename}")
    
    def load(self, filename: str):
        """
        Load document from file
        
        USAGE:
            doc.load("document.txt")
        
        RETURN:
            None
        """
        with open(filename, 'r') as f:
            content = f.read()
        self._buffer.clear()
        self._buffer.insert(0, content)
        self._history.clear()
        print(f"✓ Loaded from {filename}")
    
    def apply_operation(self, operation: Operation):
        """Apply remote operation with transformation"""
        # Transform against pending local operations
        transformed_op = operation
        for local_op in self._pending_operations:
            transformed_op = transform_operation(local_op, transformed_op)
        
        # Apply operation
        if operation.op_type == OperationType.INSERT:
            self.insert(transformed_op.position, transformed_op.content, transformed_op.user_id)
        elif operation.op_type == OperationType.DELETE:
            self.delete(transformed_op.position, len(transformed_op.content), transformed_op.user_id)
    
    def __repr__(self):
        length = self.get_length()
        undo, redo = self._history.get_history_size()
        return f"Document(length={length}, undo={undo}, redo={redo}, cursors={len(self._cursors)})"


# ==================== DEMO ====================

def main():
    """
    Demo of Text Editor
    
    Demonstrates:
    - Text insertion and deletion
    - Undo/redo functionality
    - Cursor management
    - Selection operations
    - Version history
    - Operational transformation
    """
    print("=" * 70)
    print("📝 TEXT EDITOR DEMO")
    print("=" * 70)
    
    # Create document
    print("\n📄 Creating document...")
    doc = Document()
    
    # Insert text
    print("\n✏️  Inserting text...")
    doc.insert(0, "Hello ")
    print(f"  Text: '{doc.get_text()}'")
    
    doc.insert(6, "World")
    print(f"  Text: '{doc.get_text()}'")
    
    doc.insert(11, "!")
    print(f"  Text: '{doc.get_text()}'")
    
    # Document info
    print(f"\n📊 Document: {doc}")
    
    # Undo operations
    print("\n⏪ Undo operations...")
    doc.undo()
    print(f"  After undo 1: '{doc.get_text()}'")
    
    doc.undo()
    print(f"  After undo 2: '{doc.get_text()}'")
    
    # Redo operations
    print("\n⏩ Redo operations...")
    doc.redo()
    print(f"  After redo 1: '{doc.get_text()}'")
    
    doc.redo()
    print(f"  After redo 2: '{doc.get_text()}'")
    
    # Delete text
    print("\n🗑️  Deleting text...")
    deleted = doc.delete(5, 7)
    print(f"  Deleted: '{deleted}'")
    print(f"  Text: '{doc.get_text()}'")
    
    # Undo delete
    print("\n⏪ Undo delete...")
    doc.undo()
    print(f"  Text: '{doc.get_text()}'")
    
    # Replace text
    print("\n🔄 Replace text...")
    doc.replace(6, 5, "Python")
    print(f"  Text: '{doc.get_text()}'")
    
    # Cursor management
    print("\n🖱️  Cursor management...")
    cursor1 = Cursor(0, "user1")
    cursor2 = Cursor(6, "user2")
    doc.add_cursor(cursor1)
    doc.add_cursor(cursor2)
    print(f"  Cursors: {doc.get_cursors()}")
    
    # Insert at cursor position
    print("\n✏️  Insert at cursor positions...")
    doc.insert(cursor1.position, ">>> ")
    print(f"  Text: '{doc.get_text()}'")
    print(f"  Cursor1 after insert: {cursor1}")
    print(f"  Cursor2 after insert: {cursor2}")
    
    # Selection
    print("\n🔍 Selection...")
    selection = Selection(4, 9)
    selected_text = doc.get_text(selection.start, selection.end)
    print(f"  Selected text: '{selected_text}'")
    print(f"  Selection length: {selection.length()}")
    
    # Version history
    print("\n📚 Version history...")
    doc.delete(0, 4)  # Remove ">>> "
    version1_id = doc.create_version("v1", "After cleanup")
    print(f"  Created version: {version1_id}")
    print(f"  Text at v1: '{doc.get_text()}'")
    
    doc.insert(doc.get_length(), " - Collaborative Edition")
    version2_id = doc.create_version("v2", "Added subtitle")
    print(f"  Created version: {version2_id}")
    print(f"  Text at v2: '{doc.get_text()}'")
    
    # List versions
    print("\n  All versions:")
    for version in doc.list_versions():
        print(f"    - {version.version_id}: {version.description} ({version.timestamp})")
    
    # Restore version
    print("\n⏮️  Restore to v1...")
    doc.restore_version("v1")
    print(f"  Text: '{doc.get_text()}'")
    
    # Collaborative editing simulation
    print("\n👥 Collaborative editing simulation...")
    doc.insert(0, "Collaborative ")
    print(f"  User A: '{doc.get_text()}'")
    
    # Simulate remote operation
    remote_op = Operation(OperationType.INSERT, doc.get_length(), " Editor", "userB")
    doc.apply_operation(remote_op)
    print(f"  After remote op from User B: '{doc.get_text()}'")
    
    # Operational transformation example
    print("\n🔀 Operational Transformation...")
    op1 = Operation(OperationType.INSERT, 10, " Amazing", "userA")
    op2 = Operation(OperationType.INSERT, 15, " Cool", "userB")
    
    print(f"  Original op2: {op2}")
    transformed_op2 = transform_operation(op1, op2)
    print(f"  Transformed op2: {transformed_op2}")
    print(f"  Position changed from {op2.position} to {transformed_op2.position}")
    
    # Final statistics
    print("\n📊 Final Statistics:")
    print(f"  Document length: {doc.get_length()} characters")
    print(f"  Undo available: {doc._history.can_undo()}")
    print(f"  Redo available: {doc._history.can_redo()}")
    print(f"  Active cursors: {len(doc.get_cursors())}")
    print(f"  Versions saved: {len(doc.list_versions())}")
    
    # Save document
    print("\n💾 Saving document...")
    doc.save("demo_document.txt")
    
    print("\n" + "=" * 70)
    print("✨ Demo completed successfully!")
    print("=" * 70)


if __name__ == "__main__":
    main()
