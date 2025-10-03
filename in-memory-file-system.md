# In-Memory File System - Low Level Design

## Problem Statement

Design and implement an in-memory file system that supports hierarchical directory structure with files and folders. The system should support standard file operations like create, read, write, delete, and navigation operations like listing directory contents and path traversal.

## Functional Requirements

### Core Operations

1. **Directory Operations**
   - Create directories (mkdir)
   - List directory contents (ls)
   - Change current directory (cd)
   - Remove directories (rmdir)
   - Get current working directory (pwd)

2. **File Operations**
   - Create files (touch)
   - Write content to files
   - Read file contents (cat)
   - Append to files
   - Delete files (rm)
   - Copy files (cp)
   - Move/rename files (mv)

3. **Path Operations**
   - Support absolute paths (/home/user/file.txt)
   - Support relative paths (../folder/file.txt)
   - Path resolution and normalization
   - Symbolic link support (optional)

4. **Metadata Operations**
   - File size tracking
   - Creation and modification timestamps
   - File permissions (read, write, execute)
   - File type identification

### Advanced Features

1. **Search Operations**
   - Find files by name pattern
   - Search file contents
   - Recursive directory traversal

2. **File System Operations**
   - Calculate directory size
   - File system statistics
   - Disk usage simulation

3. **Concurrent Access**
   - Thread-safe operations
   - File locking mechanisms
   - Atomic operations

## Non-Functional Requirements

1. **Performance**
   - O(1) file access within directories
   - O(log n) path traversal
   - Efficient memory usage

2. **Scalability**
   - Support for large directory trees
   - Memory-efficient storage
   - Fast search operations

3. **Reliability**
   - Data consistency
   - Error handling for invalid operations
   - Recovery from corrupted states

4. **Usability**
   - Unix-like command interface
   - Clear error messages
   - Intuitive navigation

## Core Classes and Design Patterns

### 1. Composite Pattern (File System Hierarchy)

```python
class FileSystemNode:
    """Base class for both files and directories"""
    
class File(FileSystemNode):
    """Represents a file with content"""
    
class Directory(FileSystemNode):
    """Represents a directory containing other nodes"""
```

### 2. Command Pattern (File Operations)

```python
class FileSystemCommand:
    """Base class for all file system operations"""
    
class CreateFileCommand(FileSystemCommand):
class WriteFileCommand(FileSystemCommand):
class ReadFileCommand(FileSystemCommand):
class DeleteNodeCommand(FileSystemCommand):
```

### 3. Visitor Pattern (Traversal Operations)

```python
class FileSystemVisitor:
    """Base class for file system traversal operations"""
    
class SearchVisitor(FileSystemVisitor):
class SizeCalculatorVisitor(FileSystemVisitor):
class BackupVisitor(FileSystemVisitor):
```

### 4. Strategy Pattern (Path Resolution)

```python
class PathResolver:
    """Strategy for resolving different path types"""
    
class AbsolutePathResolver(PathResolver):
class RelativePathResolver(PathResolver):
class SymbolicLinkResolver(PathResolver):
```

## Architecture Components

### Core Components

1. **FileSystem**
   - Main facade class
   - Manages root directory
   - Handles current working directory
   - Coordinates all operations

2. **FileSystemNode (Abstract Base)**
   - Common interface for files and directories
   - Metadata management
   - Permission handling

3. **File**
   - Content storage
   - Read/write operations
   - Size tracking

4. **Directory**
   - Child node management
   - Directory listing
   - Hierarchical navigation

5. **PathManager**
   - Path parsing and validation
   - Absolute/relative path resolution
   - Path normalization

6. **PermissionManager**
   - Access control
   - Permission checking
   - Security validation

### Supporting Components

1. **FileSystemException**
   - Custom exception hierarchy
   - Error code management
   - Detailed error messages

2. **Metadata**
   - File/directory properties
   - Timestamp management
   - Size calculations

3. **SearchEngine**
   - Pattern matching
   - Content search
   - Recursive traversal

4. **CommandHistory**
   - Operation logging
   - Undo/redo functionality
   - Audit trail

## Detailed Implementation

### Class Relationships

```text
FileSystem
├── Directory (root)
│   ├── File
│   ├── Directory
│   └── ...
├── PathManager
├── PermissionManager
├── SearchEngine
└── CommandHistory
```

### Key Algorithms

1. **Path Resolution Algorithm**

   ```text
   1. Parse path into components
   2. Handle special cases (., .., ~)
   3. Resolve relative to current directory
   4. Validate each component exists
   5. Return resolved absolute path
   ```

2. **Directory Traversal Algorithm**

   ```text
   1. Start from current/specified directory
   2. Apply visitor pattern for operation
   3. Recursively process subdirectories
   4. Collect and return results
   ```

3. **File Search Algorithm**

   ```text
   1. Parse search criteria (name, content, size)
   2. Traverse directory tree (DFS/BFS)
   3. Apply filters at each node
   4. Collect matching results
   5. Return sorted results
   ```

## API Design

### Primary Interface

```python
class FileSystem:
    def mkdir(self, path: str) -> bool
    def rmdir(self, path: str) -> bool
    def ls(self, path: str = None) -> List[str]
    def cd(self, path: str) -> bool
    def pwd() -> str
    
    def touch(self, path: str) -> bool
    def rm(self, path: str) -> bool
    def cat(self, path: str) -> str
    def write(self, path: str, content: str) -> bool
    def append(self, path: str, content: str) -> bool
    
    def cp(self, src: str, dst: str) -> bool
    def mv(self, src: str, dst: str) -> bool
    def find(self, pattern: str, path: str = None) -> List[str]
    def du(self, path: str = None) -> int
```

### Command Line Interface

```python
class FileSystemCLI:
    def execute_command(self, command: str) -> str
    def run_interactive_mode(self) -> None
    def batch_execute(self, commands: List[str]) -> List[str]
```

## Error Handling

### Exception Hierarchy

```python
class FileSystemException(Exception): pass
class PathNotFoundException(FileSystemException): pass
class PermissionDeniedException(FileSystemException): pass
class DirectoryNotEmptyException(FileSystemException): pass
class FileAlreadyExistsException(FileSystemException): pass
class InvalidPathException(FileSystemException): pass
class InsufficientSpaceException(FileSystemException): pass
```

### Error Scenarios

1. **Path Errors**
   - Invalid path format
   - Path not found
   - Circular references in symbolic links

2. **Permission Errors**
   - Read permission denied
   - Write permission denied
   - Execute permission denied

3. **Operation Errors**
   - Directory not empty during deletion
   - File already exists during creation
   - Insufficient memory space

4. **Concurrency Errors**
   - File locked by another process
   - Concurrent modification conflicts
   - Deadlock detection

## Memory Management

### Storage Strategy

1. **Node Storage**
   - Hash maps for O(1) child lookup
   - Reference counting for memory cleanup
   - Lazy loading for large directories

2. **Content Storage**
   - Efficient string storage
   - Compression for large files
   - Memory pooling for small files

3. **Cache Management**
   - LRU cache for frequently accessed files
   - Path resolution cache
   - Metadata cache

### Memory Optimization

1. **Copy-on-Write**
   - Share content between file copies
   - Lazy copying for efficiency
   - Reference counting

2. **String Interning**
   - Common path components
   - Filename deduplication
   - Memory savings

## Testing Strategy

### Unit Tests

1. **Core Operations**
   - File creation/deletion
   - Directory operations
   - Path resolution

2. **Edge Cases**
   - Empty directories
   - Root directory operations
   - Invalid paths

3. **Error Conditions**
   - Permission violations
   - Invalid operations
   - Resource exhaustion

### Integration Tests

1. **Command Sequences**
   - Complex file operations
   - Directory tree manipulation
   - Batch operations

2. **Concurrency Tests**
   - Multi-threaded access
   - Lock contention
   - Race conditions

### Performance Tests

1. **Scalability**
   - Large directory trees
   - Deep nesting levels
   - Memory usage patterns

2. **Benchmark Operations**
   - File creation speed
   - Search performance
   - Memory efficiency

## Extension Points

### Plugin Architecture

1. **File Type Handlers**
   - Custom file operations
   - Type-specific behavior
   - Metadata extraction

2. **Storage Backends**
   - Persistent storage
   - Network file systems
   - Cloud storage integration

3. **Search Plugins**
   - Advanced search algorithms
   - Content indexing
   - Fuzzy matching

### Advanced Features

1. **Version Control**
   - File history tracking
   - Diff operations
   - Branch management

2. **Compression**
   - Automatic file compression
   - Storage optimization
   - Transparent decompression

3. **Encryption**
   - File content encryption
   - Secure metadata
   - Key management

## Interview Discussion Points

### Design Decisions

1. **Why Composite Pattern?**
   - Uniform treatment of files and directories
   - Simplified tree operations
   - Easy extension for new node types

2. **Memory vs. Performance Trade-offs**
   - Hash maps for fast lookup vs. memory overhead
   - Caching strategies vs. memory usage
   - Lazy loading vs. access speed

3. **Concurrency Considerations**
   - Read-write locks for performance
   - Atomic operations for consistency
   - Deadlock prevention strategies

### Scalability Questions

1. **How to handle millions of files?**
   - Hierarchical indexing
   - Distributed storage
   - Memory optimization techniques

2. **Large file handling?**
   - Streaming operations
   - Chunked storage
   - Virtual memory management

3. **Search optimization?**
   - Inverted indexes
   - Parallel search
   - Result caching

### Alternative Designs

1. **Database-backed Storage**
   - Relational vs. NoSQL
   - Query optimization
   - Transaction management

2. **Event-driven Architecture**
   - File system events
   - Observer notifications
   - Audit logging

3. **Microservices Approach**
   - Service decomposition
   - API gateway
   - Data consistency

## Real-World Applications

1. **IDE File Explorers**
2. **Cloud Storage Systems**
3. **Container File Systems**
4. **Version Control Systems**
5. **Virtual File Systems**

This in-memory file system design demonstrates advanced software engineering concepts including design patterns, concurrent programming, memory management, and scalable architecture - making it an excellent problem for senior software engineer interviews.

## Implementation

### Python Implementation
**File:** [`python/in-memory-file-system/main.py`](./python/in-memory-file-system/main.py)

- Complete hierarchical file system with UNIX-like operations
- Thread-safe concurrent access with proper locking mechanisms
- Comprehensive CLI with 15+ file system commands
- Advanced search functionality with pattern matching
- File permissions and metadata management
- Path resolution for absolute and relative paths
- Composite pattern for file/directory hierarchy
- Visitor pattern for tree traversal operations
- Command pattern for file operations
- Strategy pattern for path resolution

### JavaScript Implementation
**File:** [`javascript/in-memory-file-system/main.js`](./javascript/in-memory-file-system/main.js)

- Full-featured file system with equivalent functionality
- Modern JavaScript implementation with async/await patterns
- Complete feature parity with Python version
- Efficient Map-based storage for O(1) file access
- Promise-based asynchronous operations
- Node.js readline interface for interactive CLI
- Memory-efficient string handling and path management
- Comprehensive error handling and validation
- Cross-platform path handling
- Performance optimization for large directory trees

### Key Features Implemented

- **File Operations**: Create, read, write, delete, copy, move files
- **Directory Operations**: Create, list, navigate, remove directories
- **Path Management**: Absolute/relative path resolution and normalization
- **Search Functionality**: Find files by name patterns and content
- **Metadata Support**: File sizes, timestamps, and permissions
- **CLI Interface**: Interactive command-line with 15+ commands
- **Concurrent Access**: Thread-safe operations with proper locking
- **Error Handling**: Comprehensive exception hierarchy
- **Performance**: O(1) file access and efficient tree traversal
- **Memory Management**: Optimized storage and lazy loading

### Supported Commands

**File Operations:**
- `touch <filename>` - Create files
- `cat <filename>` - Read file contents
- `write <filename> <content>` - Write to files
- `append <filename> <content>` - Append to files
- `rm <filename>` - Delete files
- `cp <src> <dst>` - Copy files
- `mv <src> <dst>` - Move/rename files

**Directory Operations:**
- `mkdir <dirname>` - Create directories
- `ls [path]` - List directory contents
- `cd <path>` - Change directory
- `pwd` - Print working directory
- `rmdir <dirname>` - Remove directories

**Utility Operations:**
- `find <pattern> [path]` - Search for files
- `du [path]` - Calculate directory size
- `stat <path>` - Show file/directory metadata
- `tree [path]` - Display directory tree structure

### Running the Code

**Python:**
```bash
cd python/in-memory-file-system
python main.py
```

**JavaScript:**
```bash
cd javascript/in-memory-file-system
node main.js
```

Both implementations provide interactive CLI demos, comprehensive testing, and full file system simulations with advanced features.
