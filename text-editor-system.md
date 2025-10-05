# Text Editor System

## 🔗 Implementation Links

- **Python Implementation**: [python/text-editor/main.py](python/text-editor/main.py)
- **JavaScript Implementation**: [javascript/text-editor/main.js](javascript/text-editor/main.js)

## Problem Statement

Design a collaborative text editor system that can:

1. **Manage text buffer efficiently** with insert, delete, replace operations
2. **Support undo/redo** with unlimited history
3. **Handle cursor and selection** for multiple users
4. **Enable real-time collaboration** with operational transformation
5. **Provide version history** and snapshots
6. **Support text formatting** (bold, italic, font, color)
7. **Implement auto-save** with draft management
8. **Handle large documents** efficiently (millions of characters)

## Requirements

### Functional Requirements

- Insert, delete, replace text at any position
- Undo/redo operations with full history
- Cursor position tracking and movement
- Text selection (single and multi-select)
- Find and replace functionality
- Copy, cut, paste operations
- Real-time collaborative editing
- Conflict resolution for concurrent edits
- Version history with restore capability
- Auto-save and draft management
- Text formatting (rich text support)
- Export to different formats

### Non-Functional Requirements

- Fast operations: O(log n) for insert/delete
- Low latency: < 100ms for user operations
- Memory efficient: < 2x document size
- Support large documents: up to 10MB
- Real-time sync: < 500ms latency
- Conflict-free collaboration
- Data persistence and recovery
- Cross-platform compatibility

## Design Decisions

### Key Classes

1. **Text Buffer**
   - `TextBuffer`: Efficient text storage (Piece Table or Gap Buffer)
   - Supports fast insert/delete operations
   - Memory efficient representation

2. **Command System**
   - `Command`: Abstract command interface
   - `InsertCommand`, `DeleteCommand`, `ReplaceCommand`
   - Supports undo/redo with memento pattern

3. **Cursor Management**
   - `Cursor`: Single cursor position
   - `Selection`: Text selection range
   - `MultiCursor`: Multiple cursors support

4. **Collaborative Editing**
   - `Operation`: Operational transformation
   - `OperationTransform`: Transform concurrent operations
   - `CollaborationManager`: Sync operations

5. **Version Control**
   - `Version`: Document snapshot
   - `VersionHistory`: Version management
   - Diff and merge capabilities

6. **Document**
   - `Document`: Main document manager
   - Coordinates all components
   - Manages state and persistence

### Design Patterns Used

1. **Command Pattern**: Undo/redo functionality
2. **Memento Pattern**: Document state snapshots
3. **Observer Pattern**: Real-time collaboration updates
4. **Strategy Pattern**: Different buffer implementations
5. **Composite Pattern**: Document structure (lines, paragraphs)
6. **Flyweight Pattern**: Character formatting optimization
7. **Chain of Responsibility**: Operation transformation
8. **Template Method**: Text operation workflow

### Key Features

- **Efficient Buffer**: Piece Table or Gap Buffer
- **Unlimited Undo/Redo**: Command pattern with history
- **Operational Transformation**: Conflict-free collaboration
- **Version Snapshots**: Point-in-time recovery
- **Auto-Save**: Periodic and on-idle save

## Class Diagram

```text
Document
├── buffer: TextBuffer
├── commandHistory: CommandHistory
├── cursors: List[Cursor]
├── selections: List[Selection]
├── versionHistory: VersionHistory
├── collaborationManager: CollaborationManager
├── insert(position, text) → void
├── delete(position, length) → void
├── undo() → bool
├── redo() → bool
├── save() → void
└── sync(operation) → void

TextBuffer (Interface)
├── insert(position, text)
├── delete(position, length)
├── getText(start, end) → string
├── getLength() → int
└── implementations:
    ├── PieceTableBuffer
    ├── GapBuffer
    └── RopeBuffer

Command (Abstract)
├── execute()
├── undo()
├── getTimestamp()
└── implementations:
    ├── InsertCommand
    ├── DeleteCommand
    └── ReplaceCommand

CommandHistory
├── undoStack: Stack[Command]
├── redoStack: Stack[Command]
├── execute(command)
├── undo() → bool
├── redo() → bool
└── clear()

Cursor
├── position: int
├── userId: string
├── move(delta)
├── setPosition(position)
└── getPosition() → int

Selection
├── start: int
├── end: int
├── getText() → string
├── delete()
└── replace(text)

Operation (OT)
├── type: OperationType
├── position: int
├── content: string
├── timestamp: int
├── userId: string
├── transform(other) → Operation
└── apply(document)

VersionHistory
├── versions: List[Version]
├── createSnapshot() → Version
├── restore(versionId) → void
├── getDiff(v1, v2) → Diff
└── merge(branch) → void

CollaborationManager
├── pendingOps: Queue[Operation]
├── localOps: List[Operation]
├── remoteOps: List[Operation]
├── applyOperation(op)
├── transformOperation(op)
└── broadcastOperation(op)
```

## Usage Example

```python
# Create document
doc = Document()

# Insert text
doc.insert(0, "Hello ")
doc.insert(6, "World")
print(doc.getText())  # "Hello World"

# Undo operation
doc.undo()
print(doc.getText())  # "Hello "

# Redo operation
doc.redo()
print(doc.getText())  # "Hello World"

# Delete text
doc.delete(5, 6)
print(doc.getText())  # "Hello"

# Selection
selection = Selection(0, 5)
selected_text = doc.getText(selection.start, selection.end)
print(selected_text)  # "Hello"

# Replace selection
doc.replace(0, 5, "Hi")
print(doc.getText())  # "Hi"

# Cursor management
cursor = Cursor(0, "user1")
cursor.move(2)
doc.insert(cursor.position, " there")
print(doc.getText())  # "Hi there"

# Save document
doc.save("document.txt")

# Version history
doc.createVersion("v1")
doc.insert(8, "!")
doc.createVersion("v2")
doc.restoreVersion("v1")
print(doc.getText())  # "Hi there"

# Collaborative editing
doc.startCollaboration()
operation = Operation(OperationType.INSERT, 8, "!", "user2")
doc.applyRemoteOperation(operation)
print(doc.getText())  # "Hi there!"
```

## Text Buffer Implementations

### 1. Gap Buffer

```text
Simple and fast for sequential edits

Text: "Hello World"
Gap Buffer: ['H','e','l','l','o',_,_,_,_,'W','o','r','l','d']
                              ↑ gap

Insert 'X' at position 5:
Buffer: ['H','e','l','l','o','X',_,_,_,'W','o','r','l','d']

Pros: O(1) for sequential inserts
Cons: O(n) for random access
```

### 2. Piece Table

```text
Efficient for any edit pattern

Original: "Hello World"
Add Buffer: ""

Insert "Beautiful " at position 6:
Pieces:
- [Original, 0, 6]    → "Hello "
- [Add, 0, 10]        → "Beautiful "
- [Original, 6, 5]    → "World"

Result: "Hello Beautiful World"

Pros: O(log n) operations, efficient undo
Cons: More complex implementation
```

### 3. Rope Data Structure

```text
Binary tree of strings

        "Hello World"
           /      \
      "Hello"    " World"
       /   \      /    \
    "Hel" "lo"  " W"  "orld"

Insert "Beautiful " at position 6:
Rebalance tree with new node

Pros: O(log n) operations, good for large docs
Cons: Higher constant factor
```

## Undo/Redo Implementation

### Command Pattern

```python
class InsertCommand(Command):
    def __init__(self, buffer, position, text):
        self.buffer = buffer
        self.position = position
        self.text = text
    
    def execute(self):
        self.buffer.insert(self.position, self.text)
    
    def undo(self):
        self.buffer.delete(self.position, len(self.text))

class DeleteCommand(Command):
    def __init__(self, buffer, position, length):
        self.buffer = buffer
        self.position = position
        self.length = length
        self.deleted_text = None
    
    def execute(self):
        self.deleted_text = self.buffer.get_text(
            self.position, self.position + self.length
        )
        self.buffer.delete(self.position, self.length)
    
    def undo(self):
        self.buffer.insert(self.position, self.deleted_text)
```

### Undo/Redo Stack

```text
Initial: ""
Execute: Insert("Hello") → "Hello"
  Undo Stack: [InsertCommand("Hello")]
  
Execute: Insert(" World") → "Hello World"
  Undo Stack: [InsertCommand("Hello"), InsertCommand(" World")]
  
Undo: Remove " World" → "Hello"
  Undo Stack: [InsertCommand("Hello")]
  Redo Stack: [InsertCommand(" World")]
  
Execute: Insert("!") → "Hello!"
  Undo Stack: [InsertCommand("Hello"), InsertCommand("!")]
  Redo Stack: []  ← Cleared on new operation
```

## Operational Transformation

### Concurrent Edit Scenario

```text
Initial state: "Hello"

User A: Insert "Beautiful " at position 6 → "Hello Beautiful "
User B: Insert "!" at position 5 → "Hello!"

Without OT:
- Apply A's operation: "Hello Beautiful "
- Apply B's operation: "Hello Beautiful !" (Wrong! B's position is off)

With OT:
- A's operation: Insert(6, "Beautiful ")
- B's operation: Insert(5, "!")
- Transform B's operation against A's:
  - B's new position: 5 + 10 (length of "Beautiful ") = 15
- Apply A: "Hello Beautiful "
- Apply transformed B: "Hello Beautiful !" (Correct!)
```

### Transformation Rules

```python
def transform(op1, op2):
    """
    Transform op2 against op1 (op1 happened first)
    """
    if op1.type == INSERT and op2.type == INSERT:
        if op2.position > op1.position:
            op2.position += len(op1.content)
    
    elif op1.type == DELETE and op2.type == INSERT:
        if op2.position >= op1.position:
            op2.position -= op1.length
    
    elif op1.type == INSERT and op2.type == DELETE:
        if op2.position >= op1.position:
            op2.position += len(op1.content)
    
    elif op1.type == DELETE and op2.type == DELETE:
        if op2.position >= op1.position + op1.length:
            op2.position -= op1.length
        elif op2.position >= op1.position:
            # Overlapping deletes
            overlap = min(op2.position + op2.length, 
                         op1.position + op1.length) - op2.position
            op2.length -= overlap
    
    return op2
```

## Version History

### Snapshot Strategy

```python
# Time-based snapshots
versions = []
last_snapshot = time.now()

if time.now() - last_snapshot > snapshot_interval:
    version = create_snapshot()
    versions.append(version)
    last_snapshot = time.now()

# Operation-based snapshots
operation_count = 0

on_operation():
    operation_count += 1
    if operation_count >= operations_per_snapshot:
        create_snapshot()
        operation_count = 0
```

### Delta Compression

```text
V1 (Full): "Hello World" (11 bytes)
V2 (Delta): +6:" Beautiful" (14 bytes vs 22 bytes full)
V3 (Delta): -11:"d", +11:"d!" (vs 23 bytes full)

Restore V3:
1. Load V1: "Hello World"
2. Apply V2 delta: "Hello Beautiful World"
3. Apply V3 delta: "Hello Beautiful World!"

Storage: 11 + 14 + 14 = 39 bytes vs 56 bytes (3 full versions)
Savings: 30%
```

## Cursor and Selection

### Multi-Cursor Support

```python
# Multiple cursors for simultaneous editing
cursors = [
    Cursor(0, "user1"),   # Beginning
    Cursor(5, "user1"),   # Middle
    Cursor(10, "user1")   # End
]

# Insert at all cursor positions
for cursor in reversed(cursors):  # Reverse to maintain positions
    document.insert(cursor.position, "X")

# Before: "Hello World"
# After:  "XHelloX WorlXd"
```

### Selection Operations

```python
# Select word at cursor
def select_word_at_cursor(cursor):
    # Find word boundaries
    start = find_word_start(cursor.position)
    end = find_word_end(cursor.position)
    return Selection(start, end)

# Expand selection
def expand_selection(selection):
    # Expand to line
    start = find_line_start(selection.start)
    end = find_line_end(selection.end)
    return Selection(start, end)
```

## Performance Optimizations

### 1. Lazy Loading

```python
# Load document in chunks
class LazyDocument:
    def __init__(self, file_path):
        self.file_path = file_path
        self.chunks = {}  # position → text chunk
        self.chunk_size = 4096
    
    def get_text(self, start, end):
        chunk_start = (start // self.chunk_size) * self.chunk_size
        chunk_end = ((end // self.chunk_size) + 1) * self.chunk_size
        
        # Load chunks if not in memory
        for pos in range(chunk_start, chunk_end, self.chunk_size):
            if pos not in self.chunks:
                self.load_chunk(pos)
        
        # Return requested text
        return self.get_from_chunks(start, end)
```

### 2. Diff Optimization

```python
# Myers' diff algorithm
def diff(old_text, new_text):
    """
    O(n*d) where d is the number of differences
    Much faster than O(n²) naive approach
    """
    # Find common prefix
    prefix_len = common_prefix_length(old_text, new_text)
    
    # Find common suffix
    suffix_len = common_suffix_length(
        old_text[prefix_len:],
        new_text[prefix_len:]
    )
    
    # Only diff the middle part
    old_middle = old_text[prefix_len:-suffix_len] if suffix_len else old_text[prefix_len:]
    new_middle = new_text[prefix_len:-suffix_len] if suffix_len else new_text[prefix_len:]
    
    return myers_diff(old_middle, new_middle)
```

### 3. Rendering Optimization

```python
# Virtual scrolling - only render visible text
class TextRenderer:
    def render_visible(self, document, viewport):
        # Calculate visible line range
        start_line = viewport.top // line_height
        end_line = (viewport.bottom // line_height) + 1
        
        # Only render visible lines
        for line_num in range(start_line, end_line):
            line = document.get_line(line_num)
            render_line(line, line_num * line_height)
```

## Real-World Use Cases

### 1. Google Docs Style Collaboration

```python
# Real-time collaborative document
doc = CollaborativeDocument("doc_id")

# User A makes edit
operation_a = Operation(INSERT, 10, "Hello", "user_a")
doc.apply_local_operation(operation_a)
doc.broadcast_operation(operation_a)

# User B makes concurrent edit
operation_b = Operation(INSERT, 15, "World", "user_b")
doc.apply_local_operation(operation_b)

# Receive User A's operation
received_op = transform(operation_a, operation_b)
doc.apply_remote_operation(received_op)

# Both users see: consistent state
```

### 2. Code Editor with Syntax Highlighting

```python
# Editor with language-specific features
editor = CodeEditor(language="python")

# Syntax highlighting
editor.set_syntax_highlighter(PythonSyntaxHighlighter())

# Auto-completion
editor.enable_autocomplete()
editor.on_key_press(".", lambda: show_completions())

# Code folding
editor.enable_code_folding()

# Lint errors
editor.show_linting_errors(pylint.check(editor.get_text()))
```

### 3. Markdown Editor with Preview

```python
# Markdown editor with live preview
markdown_editor = MarkdownEditor()

# Live preview
markdown_editor.on_change(lambda text: 
    preview.update(markdown.render(text))
)

# Export
markdown_editor.export("html")
markdown_editor.export("pdf")
```

## Time Complexity

| Operation | Gap Buffer | Piece Table | Rope |
|-----------|------------|-------------|------|
| Insert (sequential) | O(1) | O(log n) | O(log n) |
| Insert (random) | O(n) | O(log n) | O(log n) |
| Delete | O(n) | O(log n) | O(log n) |
| Get char | O(1) | O(log n) | O(log n) |
| Get substring | O(k) | O(k + log n) | O(k + log n) |
| Undo | O(1) | O(1) | O(1) |
| Redo | O(1) | O(1) | O(1) |

**Note:** k = length of substring, n = document length

## Space Complexity

| Component | Space |
|-----------|-------|
| Text Buffer | O(n) |
| Undo Stack | O(h × m) |
| Redo Stack | O(h × m) |
| Cursors | O(c) |
| Versions | O(v × n) |

**Note:** n = text length, h = history depth, m = avg operation size, c = cursor count, v = version count

## Interview Discussion Points

1. **How to handle very large documents?**
   - Lazy loading with chunks
   - Virtual scrolling
   - Incremental parsing
   - Stream processing

2. **How to resolve concurrent edit conflicts?**
   - Operational transformation
   - CRDT (Conflict-free Replicated Data Types)
   - Last-write-wins with versioning
   - Manual conflict resolution UI

3. **How to optimize undo/redo for large operations?**
   - Command compression
   - Snapshot-based undo
   - Incremental undo
   - Operation merging

4. **How to implement real-time collaboration?**
   - WebSocket for bidirectional communication
   - Operational transformation
   - State synchronization
   - Presence awareness

5. **How to handle network partitions?**
   - Offline editing support
   - Operation queue
   - Sync on reconnect
   - Conflict resolution

## Best Practices

1. **Use Piece Table** for general-purpose editors
2. **Implement Command Pattern** for undo/redo
3. **Use Operational Transformation** for collaboration
4. **Implement Auto-Save** with debouncing
5. **Lazy Load Large Documents** for performance
6. **Cache Frequently Accessed** data
7. **Validate Operations** before applying
8. **Test Concurrent Scenarios** thoroughly

## Summary

Text Editor System demonstrates:

- **Efficient Buffer**: O(log n) operations
- **Unlimited Undo/Redo**: Command pattern
- **Collaboration**: Operational transformation
- **Version Control**: Snapshot management
- **Performance**: Optimized for large documents
- **Extensible**: Plugin architecture

Perfect for:

- Collaborative document editors
- Code editors and IDEs
- Note-taking applications
- Markdown editors
- Rich text editors
