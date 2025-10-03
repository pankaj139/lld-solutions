#!/usr/bin/env python3
"""
In-Memory File System Implementation

A comprehensive file system simulation with hierarchical directory structure,
file operations, permissions, and advanced features like search and metadata management.

Features:
- Complete directory and file operations (mkdir, rmdir, touch, rm, etc.)
- Path resolution (absolute and relative paths)
- File permissions and metadata
- Search functionality with pattern matching
- Memory-efficient storage with caching
- Thread-safe operations
- Command-line interface

Author: LLD Solutions
Date: 2024
"""

import os
import re
import time
import threading
from abc import ABC, abstractmethod
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Dict, List, Optional, Set, Any, Tuple
from dataclasses import dataclass
import fnmatch
import uuid


class FileType(Enum):
    """File system node types"""
    FILE = "file"
    DIRECTORY = "directory"
    SYMBOLIC_LINK = "symlink"


class Permission(Enum):
    """File system permissions"""
    READ = "r"
    WRITE = "w"
    EXECUTE = "x"


@dataclass
class Metadata:
    """File system node metadata"""
    name: str
    file_type: FileType
    size: int
    created_time: datetime
    modified_time: datetime
    accessed_time: datetime
    permissions: Set[Permission]
    owner: str
    group: str
    
    def __post_init__(self):
        """Initialize default values"""
        if not self.permissions:
            self.permissions = {Permission.READ, Permission.WRITE}
    
    def has_permission(self, permission: Permission) -> bool:
        """Check if permission is granted"""
        return permission in self.permissions
    
    def add_permission(self, permission: Permission):
        """Add permission"""
        self.permissions.add(permission)
    
    def remove_permission(self, permission: Permission):
        """Remove permission"""
        self.permissions.discard(permission)
    
    def update_access_time(self):
        """Update last access time"""
        self.accessed_time = datetime.now()
    
    def update_modified_time(self):
        """Update last modified time"""
        self.modified_time = datetime.now()


class FileSystemException(Exception):
    """Base exception for file system errors"""
    pass


class PathNotFoundException(FileSystemException):
    """Path not found error"""
    pass


class PermissionDeniedException(FileSystemException):
    """Permission denied error"""
    pass


class DirectoryNotEmptyException(FileSystemException):
    """Directory not empty error"""
    pass


class FileAlreadyExistsException(FileSystemException):
    """File already exists error"""
    pass


class InvalidPathException(FileSystemException):
    """Invalid path error"""
    pass


class InsufficientSpaceException(FileSystemException):
    """Insufficient space error"""
    pass


class FileSystemNode(ABC):
    """Abstract base class for file system nodes"""
    
    def __init__(self, name: str, parent: Optional['Directory'] = None):
        self.metadata = Metadata(
            name=name,
            file_type=self.get_file_type(),
            size=0,
            created_time=datetime.now(),
            modified_time=datetime.now(),
            accessed_time=datetime.now(),
            permissions={Permission.READ, Permission.WRITE},
            owner="user",
            group="users"
        )
        self.parent = parent
        self._lock = threading.RLock()
        self.id = str(uuid.uuid4())
    
    @abstractmethod
    def get_file_type(self) -> FileType:
        """Get the file type"""
        pass
    
    @abstractmethod
    def get_size(self) -> int:
        """Get the size of the node"""
        pass
    
    def get_absolute_path(self) -> str:
        """Get absolute path of the node"""
        if self.parent is None:
            return "/" if self.metadata.name == "" else f"/{self.metadata.name}"
        
        parent_path = self.parent.get_absolute_path()
        if parent_path == "/":
            return f"/{self.metadata.name}"
        return f"{parent_path}/{self.metadata.name}"
    
    def check_permission(self, permission: Permission) -> bool:
        """Check if user has permission"""
        return self.metadata.has_permission(permission)
    
    def require_permission(self, permission: Permission):
        """Require permission or raise exception"""
        if not self.check_permission(permission):
            raise PermissionDeniedException(
                f"Permission denied: {permission.value} access to {self.get_absolute_path()}"
            )


class File(FileSystemNode):
    """File implementation"""
    
    def __init__(self, name: str, parent: Optional['Directory'] = None, content: str = ""):
        super().__init__(name, parent)
        self._content = content
        self.metadata.size = len(content.encode('utf-8'))
        self._version = 1
    
    def get_file_type(self) -> FileType:
        return FileType.FILE
    
    def get_size(self) -> int:
        return len(self._content.encode('utf-8'))
    
    def read(self) -> str:
        """Read file content"""
        with self._lock:
            self.require_permission(Permission.READ)
            self.metadata.update_access_time()
            return self._content
    
    def write(self, content: str):
        """Write content to file"""
        with self._lock:
            self.require_permission(Permission.WRITE)
            self._content = content
            self.metadata.size = len(content.encode('utf-8'))
            self.metadata.update_modified_time()
            self._version += 1
    
    def append(self, content: str):
        """Append content to file"""
        with self._lock:
            self.require_permission(Permission.WRITE)
            self._content += content
            self.metadata.size = len(self._content.encode('utf-8'))
            self.metadata.update_modified_time()
            self._version += 1
    
    def truncate(self):
        """Clear file content"""
        with self._lock:
            self.require_permission(Permission.WRITE)
            self._content = ""
            self.metadata.size = 0
            self.metadata.update_modified_time()
            self._version += 1
    
    def copy(self) -> 'File':
        """Create a copy of the file"""
        with self._lock:
            self.require_permission(Permission.READ)
            copy_file = File(self.metadata.name, None, self._content)
            copy_file.metadata = Metadata(
                name=self.metadata.name,
                file_type=self.metadata.file_type,
                size=self.metadata.size,
                created_time=datetime.now(),
                modified_time=datetime.now(),
                accessed_time=datetime.now(),
                permissions=self.metadata.permissions.copy(),
                owner=self.metadata.owner,
                group=self.metadata.group
            )
            return copy_file


class Directory(FileSystemNode):
    """Directory implementation"""
    
    def __init__(self, name: str, parent: Optional['Directory'] = None):
        super().__init__(name, parent)
        self._children: Dict[str, FileSystemNode] = {}
        self._max_children = 10000  # Limit for memory management
    
    def get_file_type(self) -> FileType:
        return FileType.DIRECTORY
    
    def get_size(self) -> int:
        """Calculate total size of directory and its contents"""
        with self._lock:
            total_size = 0
            for child in self._children.values():
                total_size += child.get_size()
            return total_size
    
    def add_child(self, node: FileSystemNode):
        """Add child node to directory"""
        with self._lock:
            self.require_permission(Permission.WRITE)
            
            if len(self._children) >= self._max_children:
                raise InsufficientSpaceException("Directory is full")
            
            if node.metadata.name in self._children:
                raise FileAlreadyExistsException(
                    f"File or directory '{node.metadata.name}' already exists"
                )
            
            self._children[node.metadata.name] = node
            node.parent = self
            self.metadata.update_modified_time()
    
    def remove_child(self, name: str):
        """Remove child node from directory"""
        with self._lock:
            self.require_permission(Permission.WRITE)
            
            if name not in self._children:
                raise PathNotFoundException(f"'{name}' not found")
            
            child = self._children[name]
            if isinstance(child, Directory) and child._children:
                raise DirectoryNotEmptyException(
                    f"Directory '{name}' is not empty"
                )
            
            del self._children[name]
            self.metadata.update_modified_time()
    
    def get_child(self, name: str) -> Optional[FileSystemNode]:
        """Get child node by name"""
        with self._lock:
            self.require_permission(Permission.READ)
            self.metadata.update_access_time()
            return self._children.get(name)
    
    def list_children(self) -> List[str]:
        """List all child names"""
        with self._lock:
            self.require_permission(Permission.READ)
            self.metadata.update_access_time()
            return sorted(self._children.keys())
    
    def get_children(self) -> Dict[str, FileSystemNode]:
        """Get all children"""
        with self._lock:
            self.require_permission(Permission.READ)
            self.metadata.update_access_time()
            return self._children.copy()
    
    def is_empty(self) -> bool:
        """Check if directory is empty"""
        with self._lock:
            return len(self._children) == 0


class PathManager:
    """Manages path resolution and validation"""
    
    @staticmethod
    def normalize_path(path: str) -> str:
        """Normalize path by resolving . and .. components"""
        if not path:
            raise InvalidPathException("Empty path")
        
        # Split path into components
        if path.startswith('/'):
            components = [''] + [c for c in path.split('/') if c and c != '.']
            is_absolute = True
        else:
            components = [c for c in path.split('/') if c and c != '.']
            is_absolute = False
        
        # Resolve .. components
        resolved = []
        for component in components:
            if component == '..':
                if resolved and resolved[-1] != '..':
                    resolved.pop()
                elif not is_absolute:
                    resolved.append('..')
            else:
                resolved.append(component)
        
        if is_absolute:
            return '/' + '/'.join(resolved[1:]) if len(resolved) > 1 else '/'
        else:
            return '/'.join(resolved) if resolved else '.'
    
    @staticmethod
    def split_path(path: str) -> Tuple[str, str]:
        """Split path into directory and filename"""
        normalized = PathManager.normalize_path(path)
        if normalized == '/':
            return '/', ''
        
        last_slash = normalized.rfind('/')
        if last_slash == 0:
            return '/', normalized[1:]
        elif last_slash == -1:
            return '.', normalized
        else:
            return normalized[:last_slash], normalized[last_slash + 1:]
    
    @staticmethod
    def join_paths(base: str, relative: str) -> str:
        """Join base path with relative path"""
        if relative.startswith('/'):
            return PathManager.normalize_path(relative)
        
        if base == '/':
            joined = '/' + relative
        else:
            joined = base + '/' + relative
        
        return PathManager.normalize_path(joined)
    
    @staticmethod
    def validate_name(name: str) -> bool:
        """Validate file/directory name"""
        if not name or name in ['.', '..']:
            return False
        
        # Check for invalid characters
        invalid_chars = ['/', '\0', '\n', '\r', '\t']
        for char in invalid_chars:
            if char in name:
                return False
        
        # Check length
        if len(name) > 255:
            return False
        
        return True


class SearchEngine:
    """Handles file system search operations"""
    
    def __init__(self, filesystem: 'FileSystem'):
        self.filesystem = filesystem
    
    def find_by_name(self, pattern: str, start_path: str = "/", recursive: bool = True) -> List[str]:
        """Find files/directories by name pattern"""
        results = []
        start_node = self.filesystem._resolve_path(start_path)
        
        if not isinstance(start_node, Directory):
            return results
        
        self._search_by_name(start_node, pattern, results, recursive)
        return sorted(results)
    
    def _search_by_name(self, directory: Directory, pattern: str, results: List[str], recursive: bool):
        """Recursive search by name pattern"""
        try:
            for name, node in directory.get_children().items():
                if fnmatch.fnmatch(name, pattern):
                    results.append(node.get_absolute_path())
                
                if recursive and isinstance(node, Directory):
                    self._search_by_name(node, pattern, results, recursive)
        except PermissionDeniedException:
            # Skip directories without read permission
            pass
    
    def find_by_content(self, content_pattern: str, start_path: str = "/") -> List[str]:
        """Find files containing content pattern"""
        results = []
        start_node = self.filesystem._resolve_path(start_path)
        
        if not isinstance(start_node, Directory):
            return results
        
        self._search_by_content(start_node, content_pattern, results)
        return sorted(results)
    
    def _search_by_content(self, directory: Directory, pattern: str, results: List[str]):
        """Recursive search by content pattern"""
        try:
            for node in directory.get_children().values():
                if isinstance(node, File):
                    try:
                        content = node.read()
                        if re.search(pattern, content, re.IGNORECASE):
                            results.append(node.get_absolute_path())
                    except PermissionDeniedException:
                        continue
                elif isinstance(node, Directory):
                    self._search_by_content(node, pattern, results)
        except PermissionDeniedException:
            # Skip directories without read permission
            pass
    
    def find_by_size(self, min_size: int = 0, max_size: int = float('inf'), start_path: str = "/") -> List[str]:
        """Find files by size range"""
        results = []
        start_node = self.filesystem._resolve_path(start_path)
        
        if not isinstance(start_node, Directory):
            return results
        
        self._search_by_size(start_node, min_size, max_size, results)
        return sorted(results)
    
    def _search_by_size(self, directory: Directory, min_size: int, max_size: int, results: List[str]):
        """Recursive search by size"""
        try:
            for node in directory.get_children().values():
                if isinstance(node, File):
                    size = node.get_size()
                    if min_size <= size <= max_size:
                        results.append(node.get_absolute_path())
                elif isinstance(node, Directory):
                    self._search_by_size(node, min_size, max_size, results)
        except PermissionDeniedException:
            # Skip directories without read permission
            pass


class FileSystem:
    """Main file system implementation"""
    
    def __init__(self):
        self.root = Directory("")  # Root directory with empty name
        self.current_directory = self.root
        self.search_engine = SearchEngine(self)
        self._lock = threading.RLock()
        self._memory_limit = 100 * 1024 * 1024  # 100MB limit
        self._current_memory = 0
    
    def _resolve_path(self, path: str) -> FileSystemNode:
        """Resolve path to file system node"""
        if not path:
            raise InvalidPathException("Empty path")
        
        normalized_path = PathManager.normalize_path(path)
        
        if normalized_path == '/':
            return self.root
        
        # Start from root or current directory
        if normalized_path.startswith('/'):
            current = self.root
            components = [c for c in normalized_path.split('/') if c]
        else:
            current = self.current_directory
            components = [c for c in normalized_path.split('/') if c]
        
        # Traverse path components
        for component in components:
            if not isinstance(current, Directory):
                raise PathNotFoundException(f"'{component}' is not a directory")
            
            child = current.get_child(component)
            if child is None:
                raise PathNotFoundException(f"Path not found: {normalized_path}")
            
            current = child
        
        return current
    
    def _get_parent_directory(self, path: str) -> Tuple[Directory, str]:
        """Get parent directory and filename from path"""
        dir_path, filename = PathManager.split_path(path)
        
        if not filename:
            raise InvalidPathException("Invalid path for file operation")
        
        if not PathManager.validate_name(filename):
            raise InvalidPathException(f"Invalid filename: {filename}")
        
        parent = self._resolve_path(dir_path)
        if not isinstance(parent, Directory):
            raise PathNotFoundException(f"Parent is not a directory: {dir_path}")
        
        return parent, filename
    
    def mkdir(self, path: str) -> bool:
        """Create directory"""
        with self._lock:
            try:
                parent, dirname = self._get_parent_directory(path)
                new_dir = Directory(dirname)
                parent.add_child(new_dir)
                return True
            except (FileSystemException, Exception):
                return False
    
    def rmdir(self, path: str) -> bool:
        """Remove directory"""
        with self._lock:
            try:
                node = self._resolve_path(path)
                if not isinstance(node, Directory):
                    return False
                
                if not node.is_empty():
                    return False
                
                if node.parent:
                    node.parent.remove_child(node.metadata.name)
                return True
            except (FileSystemException, Exception):
                return False
    
    def ls(self, path: str = None) -> List[str]:
        """List directory contents"""
        with self._lock:
            try:
                if path is None:
                    target = self.current_directory
                else:
                    target = self._resolve_path(path)
                
                if not isinstance(target, Directory):
                    return []
                
                return target.list_children()
            except (FileSystemException, Exception):
                return []
    
    def cd(self, path: str) -> bool:
        """Change current directory"""
        with self._lock:
            try:
                target = self._resolve_path(path)
                if not isinstance(target, Directory):
                    return False
                
                target.require_permission(Permission.EXECUTE)
                self.current_directory = target
                return True
            except (FileSystemException, Exception):
                return False
    
    def pwd(self) -> str:
        """Get current working directory"""
        return self.current_directory.get_absolute_path()
    
    def touch(self, path: str) -> bool:
        """Create empty file"""
        with self._lock:
            try:
                parent, filename = self._get_parent_directory(path)
                new_file = File(filename)
                parent.add_child(new_file)
                return True
            except (FileSystemException, Exception):
                return False
    
    def rm(self, path: str) -> bool:
        """Remove file or empty directory"""
        with self._lock:
            try:
                node = self._resolve_path(path)
                
                if isinstance(node, Directory) and not node.is_empty():
                    return False
                
                if node.parent:
                    node.parent.remove_child(node.metadata.name)
                return True
            except (FileSystemException, Exception):
                return False
    
    def cat(self, path: str) -> str:
        """Read file content"""
        with self._lock:
            try:
                node = self._resolve_path(path)
                if not isinstance(node, File):
                    raise PathNotFoundException("Not a file")
                
                return node.read()
            except (FileSystemException, Exception) as e:
                raise e
    
    def write(self, path: str, content: str) -> bool:
        """Write content to file"""
        with self._lock:
            try:
                # Try to get existing file
                try:
                    node = self._resolve_path(path)
                    if not isinstance(node, File):
                        return False
                    node.write(content)
                    return True
                except PathNotFoundException:
                    # Create new file
                    parent, filename = self._get_parent_directory(path)
                    new_file = File(filename, content=content)
                    parent.add_child(new_file)
                    return True
            except (FileSystemException, Exception):
                return False
    
    def append(self, path: str, content: str) -> bool:
        """Append content to file"""
        with self._lock:
            try:
                node = self._resolve_path(path)
                if not isinstance(node, File):
                    return False
                
                node.append(content)
                return True
            except (FileSystemException, Exception):
                return False
    
    def cp(self, src: str, dst: str) -> bool:
        """Copy file or directory"""
        with self._lock:
            try:
                src_node = self._resolve_path(src)
                
                if isinstance(src_node, File):
                    # Copy file
                    parent, filename = self._get_parent_directory(dst)
                    new_file = src_node.copy()
                    new_file.metadata.name = filename
                    parent.add_child(new_file)
                    return True
                else:
                    # Directory copying not implemented for simplicity
                    return False
            except (FileSystemException, Exception):
                return False
    
    def mv(self, src: str, dst: str) -> bool:
        """Move/rename file or directory"""
        with self._lock:
            try:
                src_node = self._resolve_path(src)
                dst_parent, dst_name = self._get_parent_directory(dst)
                
                # Remove from source location
                if src_node.parent:
                    src_node.parent.remove_child(src_node.metadata.name)
                
                # Add to destination
                src_node.metadata.name = dst_name
                dst_parent.add_child(src_node)
                return True
            except (FileSystemException, Exception):
                return False
    
    def find(self, pattern: str, path: str = None) -> List[str]:
        """Find files by name pattern"""
        start_path = path if path else self.pwd()
        return self.search_engine.find_by_name(pattern, start_path)
    
    def grep(self, pattern: str, path: str = None) -> List[str]:
        """Find files by content pattern"""
        start_path = path if path else self.pwd()
        return self.search_engine.find_by_content(pattern, start_path)
    
    def du(self, path: str = None) -> int:
        """Get disk usage"""
        with self._lock:
            try:
                if path is None:
                    target = self.current_directory
                else:
                    target = self._resolve_path(path)
                
                return target.get_size()
            except (FileSystemException, Exception):
                return 0
    
    def stat(self, path: str) -> Dict[str, Any]:
        """Get file statistics"""
        with self._lock:
            try:
                node = self._resolve_path(path)
                return {
                    'name': node.metadata.name,
                    'type': node.metadata.file_type.value,
                    'size': node.get_size(),
                    'created': node.metadata.created_time.isoformat(),
                    'modified': node.metadata.modified_time.isoformat(),
                    'accessed': node.metadata.accessed_time.isoformat(),
                    'permissions': [p.value for p in node.metadata.permissions],
                    'owner': node.metadata.owner,
                    'group': node.metadata.group,
                    'path': node.get_absolute_path()
                }
            except (FileSystemException, Exception):
                return {}


class FileSystemCLI:
    """Command line interface for file system"""
    
    def __init__(self):
        self.fs = FileSystem()
        self.commands = {
            'mkdir': self._mkdir,
            'rmdir': self._rmdir,
            'ls': self._ls,
            'cd': self._cd,
            'pwd': self._pwd,
            'touch': self._touch,
            'rm': self._rm,
            'cat': self._cat,
            'echo': self._echo,
            'cp': self._cp,
            'mv': self._mv,
            'find': self._find,
            'grep': self._grep,
            'du': self._du,
            'stat': self._stat,
            'help': self._help,
            'exit': self._exit
        }
    
    def _mkdir(self, args: List[str]) -> str:
        if not args:
            return "mkdir: missing operand"
        
        results = []
        for path in args:
            if self.fs.mkdir(path):
                results.append(f"Created directory: {path}")
            else:
                results.append(f"mkdir: cannot create directory '{path}'")
        
        return "\n".join(results)
    
    def _rmdir(self, args: List[str]) -> str:
        if not args:
            return "rmdir: missing operand"
        
        results = []
        for path in args:
            if self.fs.rmdir(path):
                results.append(f"Removed directory: {path}")
            else:
                results.append(f"rmdir: failed to remove '{path}'")
        
        return "\n".join(results)
    
    def _ls(self, args: List[str]) -> str:
        path = args[0] if args else None
        items = self.fs.ls(path)
        
        if not items:
            return ""
        
        return "\n".join(items)
    
    def _cd(self, args: List[str]) -> str:
        path = args[0] if args else "/"
        
        if self.fs.cd(path):
            return f"Changed directory to: {self.fs.pwd()}"
        else:
            return f"cd: cannot access '{path}': No such file or directory"
    
    def _pwd(self, args: List[str]) -> str:
        return self.fs.pwd()
    
    def _touch(self, args: List[str]) -> str:
        if not args:
            return "touch: missing file operand"
        
        results = []
        for path in args:
            if self.fs.touch(path):
                results.append(f"Created file: {path}")
            else:
                results.append(f"touch: cannot create file '{path}'")
        
        return "\n".join(results)
    
    def _rm(self, args: List[str]) -> str:
        if not args:
            return "rm: missing operand"
        
        results = []
        for path in args:
            if self.fs.rm(path):
                results.append(f"Removed: {path}")
            else:
                results.append(f"rm: cannot remove '{path}'")
        
        return "\n".join(results)
    
    def _cat(self, args: List[str]) -> str:
        if not args:
            return "cat: missing file operand"
        
        try:
            return self.fs.cat(args[0])
        except Exception as e:
            return f"cat: {args[0]}: {str(e)}"
    
    def _echo(self, args: List[str]) -> str:
        if len(args) < 3 or args[-2] != '>':
            return " ".join(args)
        
        content = " ".join(args[:-2])
        filename = args[-1]
        
        if self.fs.write(filename, content):
            return f"Written to {filename}"
        else:
            return f"echo: cannot write to '{filename}'"
    
    def _cp(self, args: List[str]) -> str:
        if len(args) != 2:
            return "cp: usage: cp source destination"
        
        if self.fs.cp(args[0], args[1]):
            return f"Copied {args[0]} to {args[1]}"
        else:
            return f"cp: cannot copy '{args[0]}' to '{args[1]}'"
    
    def _mv(self, args: List[str]) -> str:
        if len(args) != 2:
            return "mv: usage: mv source destination"
        
        if self.fs.mv(args[0], args[1]):
            return f"Moved {args[0]} to {args[1]}"
        else:
            return f"mv: cannot move '{args[0]}' to '{args[1]}'"
    
    def _find(self, args: List[str]) -> str:
        if not args:
            return "find: missing pattern"
        
        pattern = args[0]
        path = args[1] if len(args) > 1 else None
        results = self.fs.find(pattern, path)
        
        return "\n".join(results) if results else "No files found"
    
    def _grep(self, args: List[str]) -> str:
        if not args:
            return "grep: missing pattern"
        
        pattern = args[0]
        path = args[1] if len(args) > 1 else None
        results = self.fs.grep(pattern, path)
        
        return "\n".join(results) if results else "No matches found"
    
    def _du(self, args: List[str]) -> str:
        path = args[0] if args else None
        size = self.fs.du(path)
        return f"{size} bytes"
    
    def _stat(self, args: List[str]) -> str:
        if not args:
            return "stat: missing file operand"
        
        stats = self.fs.stat(args[0])
        if not stats:
            return f"stat: cannot stat '{args[0]}'"
        
        return f"""File: {stats['path']}
Type: {stats['type']}
Size: {stats['size']} bytes
Created: {stats['created']}
Modified: {stats['modified']}
Accessed: {stats['accessed']}
Permissions: {', '.join(stats['permissions'])}
Owner: {stats['owner']}
Group: {stats['group']}"""
    
    def _help(self, args: List[str]) -> str:
        return """Available commands:
mkdir <path>     - Create directory
rmdir <path>     - Remove directory
ls [path]        - List directory contents
cd <path>        - Change directory
pwd              - Print working directory
touch <path>     - Create empty file
rm <path>        - Remove file
cat <path>       - Display file content
echo <text> > <file> - Write text to file
cp <src> <dst>   - Copy file
mv <src> <dst>   - Move/rename file
find <pattern>   - Find files by name
grep <pattern>   - Find files by content
du [path]        - Show disk usage
stat <path>      - Show file statistics
help             - Show this help
exit             - Exit the program"""
    
    def _exit(self, args: List[str]) -> str:
        return "EXIT"
    
    def execute_command(self, command_line: str) -> str:
        """Execute a command line"""
        if not command_line.strip():
            return ""
        
        parts = command_line.strip().split()
        command = parts[0]
        args = parts[1:]
        
        if command in self.commands:
            return self.commands[command](args)
        else:
            return f"Command not found: {command}"
    
    def run_interactive_mode(self):
        """Run interactive command line interface"""
        print("In-Memory File System")
        print("Type 'help' for available commands, 'exit' to quit")
        
        while True:
            try:
                prompt = f"{self.fs.pwd()}$ "
                command_line = input(prompt)
                
                result = self.execute_command(command_line)
                
                if result == "EXIT":
                    break
                elif result:
                    print(result)
                    
            except KeyboardInterrupt:
                print("\nExiting...")
                break
            except Exception as e:
                print(f"Error: {e}")


def demo_file_system():
    """Demonstrate file system capabilities"""
    print("🗂️  In-Memory File System Demo")
    print("=" * 50)
    
    cli = FileSystemCLI()
    fs = cli.fs
    
    print("\n📁 1. Directory Operations")
    print("-" * 30)
    
    # Create directory structure
    commands = [
        "mkdir /home",
        "mkdir /home/user",
        "mkdir /home/user/documents",
        "mkdir /home/user/projects",
        "mkdir /var",
        "mkdir /var/log",
        "ls /"
    ]
    
    for cmd in commands:
        result = cli.execute_command(cmd)
        print(f"$ {cmd}")
        if result:
            print(f"  {result}")
    
    print("\n📄 2. File Operations")
    print("-" * 30)
    
    # File operations
    file_commands = [
        "cd /home/user",
        "pwd",
        "touch README.md",
        "echo Hello World > greeting.txt",
        "echo This is a test file > test.txt",
        "ls",
        "cat greeting.txt"
    ]
    
    for cmd in file_commands:
        result = cli.execute_command(cmd)
        print(f"$ {cmd}")
        if result:
            print(f"  {result}")
    
    print("\n🔍 3. Search Operations")
    print("-" * 30)
    
    # Create more files for search
    fs.write("/home/user/documents/report.txt", "Annual report with important data")
    fs.write("/home/user/projects/readme.md", "Project documentation")
    fs.write("/var/log/system.log", "System log entries with error messages")
    
    search_commands = [
        "find *.txt",
        "find *report*",
        "grep data",
        "grep error"
    ]
    
    for cmd in search_commands:
        result = cli.execute_command(cmd)
        print(f"$ {cmd}")
        if result:
            print(f"  {result}")
    
    print("\n📊 4. File Statistics")
    print("-" * 30)
    
    stat_commands = [
        "du /home",
        "stat /home/user/greeting.txt",
        "ls /home/user"
    ]
    
    for cmd in stat_commands:
        result = cli.execute_command(cmd)
        print(f"$ {cmd}")
        if result:
            print(f"  {result}")
    
    print("\n🔧 5. File Manipulation")
    print("-" * 30)
    
    manip_commands = [
        "cp /home/user/greeting.txt /home/user/greeting_copy.txt",
        "mv /home/user/test.txt /home/user/documents/test_moved.txt",
        "ls /home/user",
        "ls /home/user/documents"
    ]
    
    for cmd in manip_commands:
        result = cli.execute_command(cmd)
        print(f"$ {cmd}")
        if result:
            print(f"  {result}")
    
    print("\n✅ Demo completed successfully!")


def performance_test():
    """Test file system performance"""
    print("\n🚀 Performance Test")
    print("=" * 50)
    
    fs = FileSystem()
    
    # Test directory creation performance
    start_time = time.time()
    for i in range(1000):
        fs.mkdir(f"/dir_{i}")
    dir_time = time.time() - start_time
    
    # Test file creation performance
    start_time = time.time()
    for i in range(1000):
        fs.write(f"/file_{i}.txt", f"Content of file {i}")
    file_time = time.time() - start_time
    
    # Test search performance
    start_time = time.time()
    results = fs.find("file_*")
    search_time = time.time() - start_time
    
    print(f"Directory Creation: {dir_time:.3f}s (1000 directories)")
    print(f"File Creation: {file_time:.3f}s (1000 files)")
    print(f"Search Operation: {search_time:.3f}s ({len(results)} files found)")
    print(f"Total Memory Usage: {fs.du('/')} bytes")
    
    # Test concurrent operations
    print("\n🔄 Concurrency Test")
    import threading
    
    def create_files(thread_id, count):
        for i in range(count):
            fs.write(f"/thread_{thread_id}_file_{i}.txt", f"Thread {thread_id} file {i}")
    
    threads = []
    start_time = time.time()
    
    for t in range(5):
        thread = threading.Thread(target=create_files, args=(t, 100))
        threads.append(thread)
        thread.start()
    
    for thread in threads:
        thread.join()
    
    concurrent_time = time.time() - start_time
    print(f"Concurrent File Creation: {concurrent_time:.3f}s (5 threads, 100 files each)")
    
    print("\n🎉 Performance test completed!")


def main():
    """Main function"""
    print("In-Memory File System Implementation")
    print("1. Demo Mode")
    print("2. Interactive Mode")
    print("3. Performance Test")
    
    choice = input("\nSelect mode (1-3): ").strip()
    
    if choice == "1":
        demo_file_system()
        performance_test()
    elif choice == "2":
        cli = FileSystemCLI()
        cli.run_interactive_mode()
    elif choice == "3":
        fs = FileSystem()
        performance_test()
    else:
        print("Running demo mode...")
        demo_file_system()
        performance_test()


if __name__ == "__main__":
    main()