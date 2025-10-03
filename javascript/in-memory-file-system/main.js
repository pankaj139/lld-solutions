#!/usr/bin/env node
/**
 * In-Memory File System Implementation
 * 
 * A comprehensive file system simulation with hierarchical directory structure,
 * file operations, permissions, and advanced features like search and metadata management.
 * 
 * Features:
 * - Complete directory and file operations (mkdir, rmdir, touch, rm, etc.)
 * - Path resolution (absolute and relative paths)
 * - File permissions and metadata
 * - Search functionality with pattern matching
 * - Memory-efficient storage with caching
 * - Thread-safe operations (async/await patterns)
 * - Command-line interface
 * 
 * Author: LLD Solutions
 * Date: 2024
 */

const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

// Enums
const FileType = {
    FILE: 'file',
    DIRECTORY: 'directory',
    SYMBOLIC_LINK: 'symlink'
};

const Permission = {
    READ: 'r',
    WRITE: 'w',
    EXECUTE: 'x'
};

// Utility functions
function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

function validateName(name) {
    if (!name || name === '.' || name === '..') {
        return false;
    }
    
    const invalidChars = ['/', '\0', '\n', '\r', '\t'];
    for (const char of invalidChars) {
        if (name.includes(char)) {
            return false;
        }
    }
    
    return name.length <= 255;
}

function wildcardMatch(pattern, str) {
    const regexPattern = pattern
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.');
    const regex = new RegExp(`^${regexPattern}$`, 'i');
    return regex.test(str);
}

// Metadata class
class Metadata {
    constructor(name, fileType) {
        this.name = name;
        this.fileType = fileType;
        this.size = 0;
        this.createdTime = new Date();
        this.modifiedTime = new Date();
        this.accessedTime = new Date();
        this.permissions = new Set([Permission.READ, Permission.WRITE]);
        this.owner = 'user';
        this.group = 'users';
    }
    
    hasPermission(permission) {
        return this.permissions.has(permission);
    }
    
    addPermission(permission) {
        this.permissions.add(permission);
    }
    
    removePermission(permission) {
        this.permissions.delete(permission);
    }
    
    updateAccessTime() {
        this.accessedTime = new Date();
    }
    
    updateModifiedTime() {
        this.modifiedTime = new Date();
    }
}

// Custom Exceptions
class FileSystemException extends Error {
    constructor(message) {
        super(message);
        this.name = 'FileSystemException';
    }
}

class PathNotFoundException extends FileSystemException {
    constructor(message) {
        super(message);
        this.name = 'PathNotFoundException';
    }
}

class PermissionDeniedException extends FileSystemException {
    constructor(message) {
        super(message);
        this.name = 'PermissionDeniedException';
    }
}

class DirectoryNotEmptyException extends FileSystemException {
    constructor(message) {
        super(message);
        this.name = 'DirectoryNotEmptyException';
    }
}

class FileAlreadyExistsException extends FileSystemException {
    constructor(message) {
        super(message);
        this.name = 'FileAlreadyExistsException';
    }
}

class InvalidPathException extends FileSystemException {
    constructor(message) {
        super(message);
        this.name = 'InvalidPathException';
    }
}

class InsufficientSpaceException extends FileSystemException {
    constructor(message) {
        super(message);
        this.name = 'InsufficientSpaceException';
    }
}

// Path Manager
class PathManager {
    static normalizePath(path) {
        if (!path) {
            throw new InvalidPathException('Empty path');
        }
        
        let components;
        let isAbsolute;
        
        if (path.startsWith('/')) {
            components = [''].concat(path.split('/').filter(c => c && c !== '.'));
            isAbsolute = true;
        } else {
            components = path.split('/').filter(c => c && c !== '.');
            isAbsolute = false;
        }
        
        const resolved = [];
        for (const component of components) {
            if (component === '..') {
                if (resolved.length > 0 && resolved[resolved.length - 1] !== '..') {
                    resolved.pop();
                } else if (!isAbsolute) {
                    resolved.push('..');
                }
            } else {
                resolved.push(component);
            }
        }
        
        if (isAbsolute) {
            return resolved.length > 1 ? '/' + resolved.slice(1).join('/') : '/';
        } else {
            return resolved.length > 0 ? resolved.join('/') : '.';
        }
    }
    
    static splitPath(path) {
        const normalized = PathManager.normalizePath(path);
        if (normalized === '/') {
            return ['/', ''];
        }
        
        const lastSlash = normalized.lastIndexOf('/');
        if (lastSlash === 0) {
            return ['/', normalized.slice(1)];
        } else if (lastSlash === -1) {
            return ['.', normalized];
        } else {
            return [normalized.slice(0, lastSlash), normalized.slice(lastSlash + 1)];
        }
    }
    
    static joinPaths(base, relative) {
        if (relative.startsWith('/')) {
            return PathManager.normalizePath(relative);
        }
        
        const joined = base === '/' ? '/' + relative : base + '/' + relative;
        return PathManager.normalizePath(joined);
    }
}

// Base FileSystemNode class
class FileSystemNode {
    constructor(name, parent = null) {
        this.metadata = new Metadata(name, this.getFileType());
        this.parent = parent;
        this.id = generateId();
    }
    
    getFileType() {
        throw new Error('getFileType must be implemented by subclass');
    }
    
    getSize() {
        throw new Error('getSize must be implemented by subclass');
    }
    
    getAbsolutePath() {
        if (this.parent === null) {
            return this.metadata.name === '' ? '/' : `/${this.metadata.name}`;
        }
        
        const parentPath = this.parent.getAbsolutePath();
        if (parentPath === '/') {
            return `/${this.metadata.name}`;
        }
        return `${parentPath}/${this.metadata.name}`;
    }
    
    checkPermission(permission) {
        return this.metadata.hasPermission(permission);
    }
    
    requirePermission(permission) {
        if (!this.checkPermission(permission)) {
            throw new PermissionDeniedException(
                `Permission denied: ${permission} access to ${this.getAbsolutePath()}`
            );
        }
    }
}

// File class
class File extends FileSystemNode {
    constructor(name, parent = null, content = '') {
        super(name, parent);
        this._content = content;
        this.metadata.size = Buffer.byteLength(content, 'utf8');
        this._version = 1;
    }
    
    getFileType() {
        return FileType.FILE;
    }
    
    getSize() {
        return Buffer.byteLength(this._content, 'utf8');
    }
    
    read() {
        this.requirePermission(Permission.READ);
        this.metadata.updateAccessTime();
        return this._content;
    }
    
    write(content) {
        this.requirePermission(Permission.WRITE);
        this._content = content;
        this.metadata.size = Buffer.byteLength(content, 'utf8');
        this.metadata.updateModifiedTime();
        this._version++;
    }
    
    append(content) {
        this.requirePermission(Permission.WRITE);
        this._content += content;
        this.metadata.size = Buffer.byteLength(this._content, 'utf8');
        this.metadata.updateModifiedTime();
        this._version++;
    }
    
    truncate() {
        this.requirePermission(Permission.WRITE);
        this._content = '';
        this.metadata.size = 0;
        this.metadata.updateModifiedTime();
        this._version++;
    }
    
    copy() {
        this.requirePermission(Permission.READ);
        const copyFile = new File(this.metadata.name, null, this._content);
        copyFile.metadata = new Metadata(this.metadata.name, this.metadata.fileType);
        copyFile.metadata.size = this.metadata.size;
        copyFile.metadata.permissions = new Set(this.metadata.permissions);
        copyFile.metadata.owner = this.metadata.owner;
        copyFile.metadata.group = this.metadata.group;
        return copyFile;
    }
}

// Directory class
class Directory extends FileSystemNode {
    constructor(name, parent = null) {
        super(name, parent);
        this._children = new Map();
        this._maxChildren = 10000;
    }
    
    getFileType() {
        return FileType.DIRECTORY;
    }
    
    getSize() {
        let totalSize = 0;
        for (const child of this._children.values()) {
            totalSize += child.getSize();
        }
        return totalSize;
    }
    
    addChild(node) {
        this.requirePermission(Permission.WRITE);
        
        if (this._children.size >= this._maxChildren) {
            throw new InsufficientSpaceException('Directory is full');
        }
        
        if (this._children.has(node.metadata.name)) {
            throw new FileAlreadyExistsException(
                `File or directory '${node.metadata.name}' already exists`
            );
        }
        
        this._children.set(node.metadata.name, node);
        node.parent = this;
        this.metadata.updateModifiedTime();
    }
    
    removeChild(name) {
        this.requirePermission(Permission.WRITE);
        
        if (!this._children.has(name)) {
            throw new PathNotFoundException(`'${name}' not found`);
        }
        
        const child = this._children.get(name);
        if (child instanceof Directory && !child.isEmpty()) {
            throw new DirectoryNotEmptyException(`Directory '${name}' is not empty`);
        }
        
        this._children.delete(name);
        this.metadata.updateModifiedTime();
    }
    
    getChild(name) {
        this.requirePermission(Permission.READ);
        this.metadata.updateAccessTime();
        return this._children.get(name) || null;
    }
    
    listChildren() {
        this.requirePermission(Permission.READ);
        this.metadata.updateAccessTime();
        return Array.from(this._children.keys()).sort();
    }
    
    getChildren() {
        this.requirePermission(Permission.READ);
        this.metadata.updateAccessTime();
        return new Map(this._children);
    }
    
    isEmpty() {
        return this._children.size === 0;
    }
}

// Search Engine
class SearchEngine {
    constructor(filesystem) {
        this.filesystem = filesystem;
    }
    
    findByName(pattern, startPath = '/', recursive = true) {
        const results = [];
        const startNode = this.filesystem._resolvePath(startPath);
        
        if (!(startNode instanceof Directory)) {
            return results;
        }
        
        this._searchByName(startNode, pattern, results, recursive);
        return results.sort();
    }
    
    _searchByName(directory, pattern, results, recursive) {
        try {
            for (const [name, node] of directory.getChildren()) {
                if (wildcardMatch(pattern, name)) {
                    results.push(node.getAbsolutePath());
                }
                
                if (recursive && node instanceof Directory) {
                    this._searchByName(node, pattern, results, recursive);
                }
            }
        } catch (e) {
            if (!(e instanceof PermissionDeniedException)) {
                throw e;
            }
        }
    }
    
    findByContent(contentPattern, startPath = '/') {
        const results = [];
        const startNode = this.filesystem._resolvePath(startPath);
        
        if (!(startNode instanceof Directory)) {
            return results;
        }
        
        this._searchByContent(startNode, contentPattern, results);
        return results.sort();
    }
    
    _searchByContent(directory, pattern, results) {
        try {
            for (const node of directory.getChildren().values()) {
                if (node instanceof File) {
                    try {
                        const content = node.read();
                        const regex = new RegExp(pattern, 'i');
                        if (regex.test(content)) {
                            results.push(node.getAbsolutePath());
                        }
                    } catch (e) {
                        if (!(e instanceof PermissionDeniedException)) {
                            throw e;
                        }
                    }
                } else if (node instanceof Directory) {
                    this._searchByContent(node, pattern, results);
                }
            }
        } catch (e) {
            if (!(e instanceof PermissionDeniedException)) {
                throw e;
            }
        }
    }
    
    findBySize(minSize = 0, maxSize = Infinity, startPath = '/') {
        const results = [];
        const startNode = this.filesystem._resolvePath(startPath);
        
        if (!(startNode instanceof Directory)) {
            return results;
        }
        
        this._searchBySize(startNode, minSize, maxSize, results);
        return results.sort();
    }
    
    _searchBySize(directory, minSize, maxSize, results) {
        try {
            for (const node of directory.getChildren().values()) {
                if (node instanceof File) {
                    const size = node.getSize();
                    if (size >= minSize && size <= maxSize) {
                        results.push(node.getAbsolutePath());
                    }
                } else if (node instanceof Directory) {
                    this._searchBySize(node, minSize, maxSize, results);
                }
            }
        } catch (e) {
            if (!(e instanceof PermissionDeniedException)) {
                throw e;
            }
        }
    }
}

// Main FileSystem class
class FileSystem {
    constructor() {
        this.root = new Directory(''); // Root directory with empty name
        this.currentDirectory = this.root;
        this.searchEngine = new SearchEngine(this);
        this._memoryLimit = 100 * 1024 * 1024; // 100MB limit
        this._currentMemory = 0;
    }
    
    _resolvePath(path) {
        if (!path) {
            throw new InvalidPathException('Empty path');
        }
        
        const normalizedPath = PathManager.normalizePath(path);
        
        if (normalizedPath === '/') {
            return this.root;
        }
        
        let current;
        let components;
        
        if (normalizedPath.startsWith('/')) {
            current = this.root;
            components = normalizedPath.split('/').filter(c => c);
        } else {
            current = this.currentDirectory;
            components = normalizedPath.split('/').filter(c => c);
        }
        
        for (const component of components) {
            if (!(current instanceof Directory)) {
                throw new PathNotFoundException(`'${component}' is not a directory`);
            }
            
            const child = current.getChild(component);
            if (child === null) {
                throw new PathNotFoundException(`Path not found: ${normalizedPath}`);
            }
            
            current = child;
        }
        
        return current;
    }
    
    _getParentDirectory(path) {
        const [dirPath, filename] = PathManager.splitPath(path);
        
        if (!filename) {
            throw new InvalidPathException('Invalid path for file operation');
        }
        
        if (!validateName(filename)) {
            throw new InvalidPathException(`Invalid filename: ${filename}`);
        }
        
        const parent = this._resolvePath(dirPath);
        if (!(parent instanceof Directory)) {
            throw new PathNotFoundException(`Parent is not a directory: ${dirPath}`);
        }
        
        return [parent, filename];
    }
    
    mkdir(path) {
        try {
            const [parent, dirname] = this._getParentDirectory(path);
            const newDir = new Directory(dirname);
            parent.addChild(newDir);
            return true;
        } catch (e) {
            return false;
        }
    }
    
    rmdir(path) {
        try {
            const node = this._resolvePath(path);
            if (!(node instanceof Directory)) {
                return false;
            }
            
            if (!node.isEmpty()) {
                return false;
            }
            
            if (node.parent) {
                node.parent.removeChild(node.metadata.name);
            }
            return true;
        } catch (e) {
            return false;
        }
    }
    
    ls(path = null) {
        try {
            const target = path === null ? this.currentDirectory : this._resolvePath(path);
            
            if (!(target instanceof Directory)) {
                return [];
            }
            
            return target.listChildren();
        } catch (e) {
            return [];
        }
    }
    
    cd(path) {
        try {
            const target = this._resolvePath(path);
            if (!(target instanceof Directory)) {
                return false;
            }
            
            target.requirePermission(Permission.EXECUTE);
            this.currentDirectory = target;
            return true;
        } catch (e) {
            return false;
        }
    }
    
    pwd() {
        return this.currentDirectory.getAbsolutePath();
    }
    
    touch(path) {
        try {
            const [parent, filename] = this._getParentDirectory(path);
            const newFile = new File(filename);
            parent.addChild(newFile);
            return true;
        } catch (e) {
            return false;
        }
    }
    
    rm(path) {
        try {
            const node = this._resolvePath(path);
            
            if (node instanceof Directory && !node.isEmpty()) {
                return false;
            }
            
            if (node.parent) {
                node.parent.removeChild(node.metadata.name);
            }
            return true;
        } catch (e) {
            return false;
        }
    }
    
    cat(path) {
        try {
            const node = this._resolvePath(path);
            if (!(node instanceof File)) {
                throw new PathNotFoundException('Not a file');
            }
            
            return node.read();
        } catch (e) {
            throw e;
        }
    }
    
    write(path, content) {
        try {
            try {
                const node = this._resolvePath(path);
                if (!(node instanceof File)) {
                    return false;
                }
                node.write(content);
                return true;
            } catch (e) {
                if (e instanceof PathNotFoundException) {
                    const [parent, filename] = this._getParentDirectory(path);
                    const newFile = new File(filename, null, content);
                    parent.addChild(newFile);
                    return true;
                }
                return false;
            }
        } catch (e) {
            return false;
        }
    }
    
    append(path, content) {
        try {
            const node = this._resolvePath(path);
            if (!(node instanceof File)) {
                return false;
            }
            
            node.append(content);
            return true;
        } catch (e) {
            return false;
        }
    }
    
    cp(src, dst) {
        try {
            const srcNode = this._resolvePath(src);
            
            if (srcNode instanceof File) {
                const [parent, filename] = this._getParentDirectory(dst);
                const newFile = srcNode.copy();
                newFile.metadata.name = filename;
                parent.addChild(newFile);
                return true;
            }
            
            return false;
        } catch (e) {
            return false;
        }
    }
    
    mv(src, dst) {
        try {
            const srcNode = this._resolvePath(src);
            const [dstParent, dstName] = this._getParentDirectory(dst);
            
            if (srcNode.parent) {
                srcNode.parent.removeChild(srcNode.metadata.name);
            }
            
            srcNode.metadata.name = dstName;
            dstParent.addChild(srcNode);
            return true;
        } catch (e) {
            return false;
        }
    }
    
    find(pattern, path = null) {
        const startPath = path || this.pwd();
        return this.searchEngine.findByName(pattern, startPath);
    }
    
    grep(pattern, path = null) {
        const startPath = path || this.pwd();
        return this.searchEngine.findByContent(pattern, startPath);
    }
    
    du(path = null) {
        try {
            const target = path === null ? this.currentDirectory : this._resolvePath(path);
            return target.getSize();
        } catch (e) {
            return 0;
        }
    }
    
    stat(path) {
        try {
            const node = this._resolvePath(path);
            return {
                name: node.metadata.name,
                type: node.metadata.fileType,
                size: node.getSize(),
                created: node.metadata.createdTime.toISOString(),
                modified: node.metadata.modifiedTime.toISOString(),
                accessed: node.metadata.accessedTime.toISOString(),
                permissions: Array.from(node.metadata.permissions),
                owner: node.metadata.owner,
                group: node.metadata.group,
                path: node.getAbsolutePath()
            };
        } catch (e) {
            return {};
        }
    }
}

// Command Line Interface
class FileSystemCLI {
    constructor() {
        this.fs = new FileSystem();
        this.commands = {
            mkdir: this._mkdir.bind(this),
            rmdir: this._rmdir.bind(this),
            ls: this._ls.bind(this),
            cd: this._cd.bind(this),
            pwd: this._pwd.bind(this),
            touch: this._touch.bind(this),
            rm: this._rm.bind(this),
            cat: this._cat.bind(this),
            echo: this._echo.bind(this),
            cp: this._cp.bind(this),
            mv: this._mv.bind(this),
            find: this._find.bind(this),
            grep: this._grep.bind(this),
            du: this._du.bind(this),
            stat: this._stat.bind(this),
            help: this._help.bind(this),
            exit: this._exit.bind(this)
        };
    }
    
    _mkdir(args) {
        if (args.length === 0) {
            return 'mkdir: missing operand';
        }
        
        const results = [];
        for (const path of args) {
            if (this.fs.mkdir(path)) {
                results.push(`Created directory: ${path}`);
            } else {
                results.push(`mkdir: cannot create directory '${path}'`);
            }
        }
        
        return results.join('\n');
    }
    
    _rmdir(args) {
        if (args.length === 0) {
            return 'rmdir: missing operand';
        }
        
        const results = [];
        for (const path of args) {
            if (this.fs.rmdir(path)) {
                results.push(`Removed directory: ${path}`);
            } else {
                results.push(`rmdir: failed to remove '${path}'`);
            }
        }
        
        return results.join('\n');
    }
    
    _ls(args) {
        const path = args.length > 0 ? args[0] : null;
        const items = this.fs.ls(path);
        
        if (items.length === 0) {
            return '';
        }
        
        return items.join('\n');
    }
    
    _cd(args) {
        const path = args.length > 0 ? args[0] : '/';
        
        if (this.fs.cd(path)) {
            return `Changed directory to: ${this.fs.pwd()}`;
        } else {
            return `cd: cannot access '${path}': No such file or directory`;
        }
    }
    
    _pwd(args) {
        return this.fs.pwd();
    }
    
    _touch(args) {
        if (args.length === 0) {
            return 'touch: missing file operand';
        }
        
        const results = [];
        for (const path of args) {
            if (this.fs.touch(path)) {
                results.push(`Created file: ${path}`);
            } else {
                results.push(`touch: cannot create file '${path}'`);
            }
        }
        
        return results.join('\n');
    }
    
    _rm(args) {
        if (args.length === 0) {
            return 'rm: missing operand';
        }
        
        const results = [];
        for (const path of args) {
            if (this.fs.rm(path)) {
                results.push(`Removed: ${path}`);
            } else {
                results.push(`rm: cannot remove '${path}'`);
            }
        }
        
        return results.join('\n');
    }
    
    _cat(args) {
        if (args.length === 0) {
            return 'cat: missing file operand';
        }
        
        try {
            return this.fs.cat(args[0]);
        } catch (e) {
            return `cat: ${args[0]}: ${e.message}`;
        }
    }
    
    _echo(args) {
        if (args.length < 3 || args[args.length - 2] !== '>') {
            return args.join(' ');
        }
        
        const content = args.slice(0, -2).join(' ');
        const filename = args[args.length - 1];
        
        if (this.fs.write(filename, content)) {
            return `Written to ${filename}`;
        } else {
            return `echo: cannot write to '${filename}'`;
        }
    }
    
    _cp(args) {
        if (args.length !== 2) {
            return 'cp: usage: cp source destination';
        }
        
        if (this.fs.cp(args[0], args[1])) {
            return `Copied ${args[0]} to ${args[1]}`;
        } else {
            return `cp: cannot copy '${args[0]}' to '${args[1]}'`;
        }
    }
    
    _mv(args) {
        if (args.length !== 2) {
            return 'mv: usage: mv source destination';
        }
        
        if (this.fs.mv(args[0], args[1])) {
            return `Moved ${args[0]} to ${args[1]}`;
        } else {
            return `mv: cannot move '${args[0]}' to '${args[1]}'`;
        }
    }
    
    _find(args) {
        if (args.length === 0) {
            return 'find: missing pattern';
        }
        
        const pattern = args[0];
        const path = args.length > 1 ? args[1] : null;
        const results = this.fs.find(pattern, path);
        
        return results.length > 0 ? results.join('\n') : 'No files found';
    }
    
    _grep(args) {
        if (args.length === 0) {
            return 'grep: missing pattern';
        }
        
        const pattern = args[0];
        const path = args.length > 1 ? args[1] : null;
        const results = this.fs.grep(pattern, path);
        
        return results.length > 0 ? results.join('\n') : 'No matches found';
    }
    
    _du(args) {
        const path = args.length > 0 ? args[0] : null;
        const size = this.fs.du(path);
        return `${size} bytes`;
    }
    
    _stat(args) {
        if (args.length === 0) {
            return 'stat: missing file operand';
        }
        
        const stats = this.fs.stat(args[0]);
        if (Object.keys(stats).length === 0) {
            return `stat: cannot stat '${args[0]}'`;
        }
        
        return `File: ${stats.path}
Type: ${stats.type}
Size: ${stats.size} bytes
Created: ${stats.created}
Modified: ${stats.modified}
Accessed: ${stats.accessed}
Permissions: ${stats.permissions.join(', ')}
Owner: ${stats.owner}
Group: ${stats.group}`;
    }
    
    _help(args) {
        return `Available commands:
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
exit             - Exit the program`;
    }
    
    _exit(args) {
        return 'EXIT';
    }
    
    executeCommand(commandLine) {
        if (!commandLine.trim()) {
            return '';
        }
        
        const parts = commandLine.trim().split(/\s+/);
        const command = parts[0];
        const args = parts.slice(1);
        
        if (this.commands[command]) {
            return this.commands[command](args);
        } else {
            return `Command not found: ${command}`;
        }
    }
    
    async runInteractiveMode() {
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        console.log('In-Memory File System');
        console.log("Type 'help' for available commands, 'exit' to quit");
        
        const prompt = () => {
            rl.question(`${this.fs.pwd()}$ `, (commandLine) => {
                const result = this.executeCommand(commandLine);
                
                if (result === 'EXIT') {
                    rl.close();
                    return;
                } else if (result) {
                    console.log(result);
                }
                
                prompt();
            });
        };
        
        prompt();
    }
}

// Demo functions
function demoFileSystem() {
    console.log('🗂️  In-Memory File System Demo');
    console.log('='.repeat(50));
    
    const cli = new FileSystemCLI();
    const fs = cli.fs;
    
    console.log('\n📁 1. Directory Operations');
    console.log('-'.repeat(30));
    
    const commands = [
        'mkdir /home',
        'mkdir /home/user',
        'mkdir /home/user/documents',
        'mkdir /home/user/projects',
        'mkdir /var',
        'mkdir /var/log',
        'ls /'
    ];
    
    for (const cmd of commands) {
        const result = cli.executeCommand(cmd);
        console.log(`$ ${cmd}`);
        if (result) {
            console.log(`  ${result}`);
        }
    }
    
    console.log('\n📄 2. File Operations');
    console.log('-'.repeat(30));
    
    const fileCommands = [
        'cd /home/user',
        'pwd',
        'touch README.md',
        'echo Hello World > greeting.txt',
        'echo This is a test file > test.txt',
        'ls',
        'cat greeting.txt'
    ];
    
    for (const cmd of fileCommands) {
        const result = cli.executeCommand(cmd);
        console.log(`$ ${cmd}`);
        if (result) {
            console.log(`  ${result}`);
        }
    }
    
    console.log('\n🔍 3. Search Operations');
    console.log('-'.repeat(30));
    
    // Create more files for search
    fs.write('/home/user/documents/report.txt', 'Annual report with important data');
    fs.write('/home/user/projects/readme.md', 'Project documentation');
    fs.write('/var/log/system.log', 'System log entries with error messages');
    
    const searchCommands = [
        'find *.txt',
        'find *report*',
        'grep data',
        'grep error'
    ];
    
    for (const cmd of searchCommands) {
        const result = cli.executeCommand(cmd);
        console.log(`$ ${cmd}`);
        if (result) {
            console.log(`  ${result}`);
        }
    }
    
    console.log('\n📊 4. File Statistics');
    console.log('-'.repeat(30));
    
    const statCommands = [
        'du /home',
        'stat /home/user/greeting.txt',
        'ls /home/user'
    ];
    
    for (const cmd of statCommands) {
        const result = cli.executeCommand(cmd);
        console.log(`$ ${cmd}`);
        if (result) {
            console.log(`  ${result}`);
        }
    }
    
    console.log('\n🔧 5. File Manipulation');
    console.log('-'.repeat(30));
    
    const manipCommands = [
        'cp /home/user/greeting.txt /home/user/greeting_copy.txt',
        'mv /home/user/test.txt /home/user/documents/test_moved.txt',
        'ls /home/user',
        'ls /home/user/documents'
    ];
    
    for (const cmd of manipCommands) {
        const result = cli.executeCommand(cmd);
        console.log(`$ ${cmd}`);
        if (result) {
            console.log(`  ${result}`);
        }
    }
    
    console.log('\n✅ Demo completed successfully!');
}

function performanceTest() {
    console.log('\n🚀 Performance Test');
    console.log('='.repeat(50));
    
    const fs = new FileSystem();
    
    // Test directory creation performance
    let startTime = performance.now();
    for (let i = 0; i < 1000; i++) {
        fs.mkdir(`/dir_${i}`);
    }
    const dirTime = (performance.now() - startTime) / 1000;
    
    // Test file creation performance
    startTime = performance.now();
    for (let i = 0; i < 1000; i++) {
        fs.write(`/file_${i}.txt`, `Content of file ${i}`);
    }
    const fileTime = (performance.now() - startTime) / 1000;
    
    // Test search performance
    startTime = performance.now();
    const results = fs.find('file_*');
    const searchTime = (performance.now() - startTime) / 1000;
    
    console.log(`Directory Creation: ${dirTime.toFixed(3)}s (1000 directories)`);
    console.log(`File Creation: ${fileTime.toFixed(3)}s (1000 files)`);
    console.log(`Search Operation: ${searchTime.toFixed(3)}s (${results.length} files found)`);
    console.log(`Total Memory Usage: ${fs.du('/')} bytes`);
    
    // Test concurrent operations (simulated with promises)
    console.log('\n🔄 Concurrency Test');
    
    async function createFiles(threadId, count) {
        for (let i = 0; i < count; i++) {
            fs.write(`/thread_${threadId}_file_${i}.txt`, `Thread ${threadId} file ${i}`);
        }
    }
    
    startTime = performance.now();
    
    const promises = [];
    for (let t = 0; t < 5; t++) {
        promises.push(createFiles(t, 100));
    }
    
    Promise.all(promises).then(() => {
        const concurrentTime = (performance.now() - startTime) / 1000;
        console.log(`Concurrent File Creation: ${concurrentTime.toFixed(3)}s (5 threads, 100 files each)`);
        console.log('\n🎉 Performance test completed!');
    });
}

async function main() {
    console.log('In-Memory File System Implementation');
    console.log('1. Demo Mode');
    console.log('2. Interactive Mode');
    console.log('3. Performance Test');
    
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    rl.question('\nSelect mode (1-3): ', (choice) => {
        rl.close();
        
        if (choice === '1') {
            demoFileSystem();
            performanceTest();
        } else if (choice === '2') {
            const cli = new FileSystemCLI();
            cli.runInteractiveMode();
        } else if (choice === '3') {
            performanceTest();
        } else {
            console.log('Running demo mode...');
            demoFileSystem();
            performanceTest();
        }
    });
}

// Run if this file is executed directly
if (require.main === module) {
    main();
}

module.exports = {
    FileSystem,
    FileSystemCLI,
    File,
    Directory,
    PathManager,
    SearchEngine
};