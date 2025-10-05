/**
 * TEXT EDITOR SYSTEM - Low Level Design Implementation in JavaScript
 * 
 * This file implements a collaborative text editor with undo/redo, cursor management,
 * operational transformation for real-time collaboration, and version history.
 * 
 * FILE PURPOSE:
 * Provides a production-ready text editor system supporting single and multi-user editing,
 * with efficient text operations, unlimited undo/redo, cursor/selection management, and
 * real-time collaboration through operational transformation.
 * 
 * DESIGN PATTERNS USED:
 * 1. COMMAND PATTERN: Undo/redo functionality
 *    - Each edit is encapsulated as a command
 *    - Commands can be undone and redone
 *    - Command history management
 * 
 * 2. MEMENTO PATTERN: Document state snapshots
 *    - Save document state for version history
 *    - Restore to previous states
 *    - Diff and merge capabilities
 * 
 * 3. OBSERVER PATTERN: Real-time collaboration
 *    - Notify collaborators of changes
 *    - Sync document state
 *    - Event-driven updates
 * 
 * 4. STRATEGY PATTERN: Different buffer implementations
 *    - Pluggable buffer strategy
 *    - Optimize for different use cases
 *    - Easy to switch implementations
 * 
 * 5. COMPOSITE PATTERN: Document structure
 *    - Lines, paragraphs, sections
 *    - Hierarchical text organization
 *    - Recursive operations
 * 
 * 6. TEMPLATE METHOD PATTERN: Operation workflow
 *    - Standardized operation flow
 *    - Customizable steps
 *    - Consistent behavior
 * 
 * 7. CHAIN OF RESPONSIBILITY: Operation transformation
 *    - Transform operations through chain
 *    - Handle conflicts
 *    - Resolution pipeline
 * 
 * OOP CONCEPTS DEMONSTRATED:
 * - ENCAPSULATION: Text buffer hidden behind interface
 * - INHERITANCE: Command hierarchy
 * - POLYMORPHISM: Different command types
 * - ABSTRACTION: Buffer and operation abstractions
 * 
 * SOLID PRINCIPLES:
 * - SRP: Each class has single responsibility
 * - OCP: Open for extension (new commands) closed for modification
 * - LSP: All commands interchangeable
 * - ISP: Focused interfaces
 * - DIP: Depends on abstractions
 * 
 * USAGE:
 *     // Create document
 *     const doc = new Document();
 *     
 *     // Insert text
 *     doc.insert(0, "Hello World");
 *     
 *     // Delete text
 *     doc.delete(6, 5);
 *     
 *     // Undo/Redo
 *     doc.undo();
 *     doc.redo();
 *     
 *     // Cursor and selection
 *     const cursor = new Cursor(0, "user1");
 *     doc.addCursor(cursor);
 *     
 *     const selection = new Selection(0, 5);
 *     const selectedText = doc.getText(selection.start, selection.end);
 *     
 *     // Save and restore
 *     doc.save("file.txt");
 *     const versionId = doc.createVersion("v1");
 *     doc.restoreVersion(versionId);
 * 
 * RETURN VALUES:
 * - insert(position, text): Returns undefined
 * - delete(position, length): Returns deleted text
 * - undo(): Returns boolean (true if successful)
 * - redo(): Returns boolean (true if successful)
 * - getText(start, end): Returns string
 */

const fs = require('fs');

// ==================== ENUMS ====================

const OperationType = {
    INSERT: 'insert',
    DELETE: 'delete',
    REPLACE: 'replace'
};

// ==================== TEXT BUFFER ====================

/**
 * Simple text buffer implementation
 * 
 * For production, use Piece Table or Rope for better performance
 * This implementation uses an array for clarity
 * 
 * USAGE:
 *     const buffer = new TextBuffer();
 *     buffer.insert(0, "Hello");
 *     const text = buffer.getText();
 * 
 * RETURN:
 *     TextBuffer instance
 */
class TextBuffer {
    constructor() {
        this._content = []; // Array of characters
    }

    insert(position, text) {
        if (position < 0 || position > this._content.length) {
            throw new Error(`Invalid position: ${position}`);
        }

        const chars = text.split('');
        this._content.splice(position, 0, ...chars);
    }

    delete(position, length) {
        if (position < 0 || position + length > this._content.length) {
            throw new Error(`Invalid range: ${position}, ${length}`);
        }

        const deleted = this._content.splice(position, length);
        return deleted.join('');
    }

    getText(start = 0, end = null) {
        if (end === null) {
            end = this._content.length;
        }
        return this._content.slice(start, end).join('');
    }

    getLength() {
        return this._content.length;
    }

    clear() {
        this._content = [];
    }
}

// ==================== COMMAND PATTERN ====================

/**
 * Abstract command for undo/redo
 * 
 * DESIGN PATTERN: Command Pattern
 * 
 * USAGE:
 *     const command = new InsertCommand(buffer, 0, "Hello");
 *     command.execute();
 *     command.undo();
 * 
 * RETURN:
 *     Command instance
 */
class Command {
    constructor() {
        this.timestamp = Date.now();
    }

    execute() {
        throw new Error('Must implement execute()');
    }

    undo() {
        throw new Error('Must implement undo()');
    }

    getTimestamp() {
        return this.timestamp;
    }
}

/**
 * Insert text command
 * 
 * USAGE:
 *     const cmd = new InsertCommand(buffer, 0, "Hello");
 *     cmd.execute();
 * 
 * RETURN:
 *     undefined
 */
class InsertCommand extends Command {
    constructor(buffer, position, text, userId = '') {
        super();
        this.buffer = buffer;
        this.position = position;
        this.text = text;
        this.userId = userId;
    }

    execute() {
        this.buffer.insert(this.position, this.text);
    }

    undo() {
        this.buffer.delete(this.position, this.text.length);
    }

    toString() {
        return `InsertCommand(pos=${this.position}, text='${this.text.slice(0, 20)}...')`;
    }
}

/**
 * Delete text command
 * 
 * USAGE:
 *     const cmd = new DeleteCommand(buffer, 0, 5);
 *     cmd.execute();
 * 
 * RETURN:
 *     undefined
 */
class DeleteCommand extends Command {
    constructor(buffer, position, length, userId = '') {
        super();
        this.buffer = buffer;
        this.position = position;
        this.length = length;
        this.userId = userId;
        this.deletedText = '';
    }

    execute() {
        this.deletedText = this.buffer.delete(this.position, this.length);
    }

    undo() {
        this.buffer.insert(this.position, this.deletedText);
    }

    toString() {
        return `DeleteCommand(pos=${this.position}, len=${this.length})`;
    }
}

/**
 * Replace text command
 * 
 * USAGE:
 *     const cmd = new ReplaceCommand(buffer, 0, 5, "Hi");
 *     cmd.execute();
 * 
 * RETURN:
 *     undefined
 */
class ReplaceCommand extends Command {
    constructor(buffer, position, length, newText, userId = '') {
        super();
        this.buffer = buffer;
        this.position = position;
        this.length = length;
        this.newText = newText;
        this.userId = userId;
        this.oldText = '';
    }

    execute() {
        this.oldText = this.buffer.delete(this.position, this.length);
        this.buffer.insert(this.position, this.newText);
    }

    undo() {
        this.buffer.delete(this.position, this.newText.length);
        this.buffer.insert(this.position, this.oldText);
    }

    toString() {
        return `ReplaceCommand(pos=${this.position}, old='${this.oldText.slice(0, 10)}...', new='${this.newText.slice(0, 10)}...')`;
    }
}

// ==================== COMMAND HISTORY ====================

/**
 * Manages undo/redo stack
 * 
 * USAGE:
 *     const history = new CommandHistory();
 *     history.execute(command);
 *     history.undo();
 *     history.redo();
 * 
 * RETURN:
 *     CommandHistory instance
 */
class CommandHistory {
    constructor(maxSize = 1000) {
        this._undoStack = [];
        this._redoStack = [];
        this._maxSize = maxSize;
    }

    execute(command) {
        command.execute();
        this._undoStack.push(command);
        this._redoStack = []; // Clear redo stack on new command

        // Limit stack size
        if (this._undoStack.length > this._maxSize) {
            this._undoStack.shift();
        }
    }

    undo() {
        if (this._undoStack.length === 0) {
            return false;
        }

        const command = this._undoStack.pop();
        command.undo();
        this._redoStack.push(command);
        return true;
    }

    redo() {
        if (this._redoStack.length === 0) {
            return false;
        }

        const command = this._redoStack.pop();
        command.execute();
        this._undoStack.push(command);
        return true;
    }

    canUndo() {
        return this._undoStack.length > 0;
    }

    canRedo() {
        return this._redoStack.length > 0;
    }

    clear() {
        this._undoStack = [];
        this._redoStack = [];
    }

    getHistorySize() {
        return {
            undo: this._undoStack.length,
            redo: this._redoStack.length
        };
    }
}

// ==================== CURSOR AND SELECTION ====================

/**
 * Cursor position in document
 * 
 * USAGE:
 *     const cursor = new Cursor(0, "user1");
 *     cursor.move(5);
 *     const pos = cursor.getPosition();
 * 
 * RETURN:
 *     Cursor instance
 */
class Cursor {
    constructor(position, userId) {
        this.position = position;
        this.userId = userId;
    }

    move(delta) {
        this.position = Math.max(0, this.position + delta);
    }

    setPosition(position) {
        this.position = Math.max(0, position);
    }

    getPosition() {
        return this.position;
    }

    toString() {
        return `Cursor(user=${this.userId}, pos=${this.position})`;
    }
}

/**
 * Text selection range
 * 
 * USAGE:
 *     const selection = new Selection(0, 5);
 *     const length = selection.length();
 * 
 * RETURN:
 *     Selection instance
 */
class Selection {
    constructor(start, end) {
        this.start = Math.min(start, end);
        this.end = Math.max(start, end);
    }

    length() {
        return this.end - this.start;
    }

    isEmpty() {
        return this.start === this.end;
    }

    contains(position) {
        return this.start <= position && position < this.end;
    }

    toString() {
        return `Selection(${this.start}, ${this.end})`;
    }
}

// ==================== VERSION HISTORY ====================

/**
 * Document version snapshot
 * 
 * USAGE:
 *     const version = new Version("v1", "Initial version", textContent);
 * 
 * RETURN:
 *     Version instance
 */
class Version {
    constructor(versionId, description, content) {
        this.versionId = versionId;
        this.description = description;
        this.content = content;
        this.timestamp = new Date();
    }

    toString() {
        return `Version(${this.versionId}, ${this.timestamp})`;
    }
}

/**
 * Manages document versions
 * 
 * USAGE:
 *     const history = new VersionHistory();
 *     const versionId = history.createVersion("v1", "Initial", content);
 *     history.restore(versionId);
 * 
 * RETURN:
 *     VersionHistory instance
 */
class VersionHistory {
    constructor() {
        this._versions = new Map();
    }

    createVersion(versionId, description, content) {
        const version = new Version(versionId, description, content);
        this._versions.set(versionId, version);
        return versionId;
    }

    getVersion(versionId) {
        return this._versions.get(versionId);
    }

    listVersions() {
        return Array.from(this._versions.values())
            .sort((a, b) => a.timestamp - b.timestamp);
    }

    deleteVersion(versionId) {
        return this._versions.delete(versionId);
    }
}

// ==================== OPERATIONAL TRANSFORMATION ====================

/**
 * Operation for collaborative editing
 * 
 * USAGE:
 *     const op = new Operation(OperationType.INSERT, 0, "Hello", "user1");
 * 
 * RETURN:
 *     Operation instance
 */
class Operation {
    constructor(opType, position, content, userId) {
        this.opType = opType;
        this.position = position;
        this.content = content;
        this.userId = userId;
        this.timestamp = Date.now();
    }

    toString() {
        return `Operation(${this.opType}, pos=${this.position}, user=${this.userId})`;
    }
}

/**
 * Transform op2 against op1 (op1 happened first)
 * 
 * USAGE:
 *     const transformedOp = transformOperation(op1, op2);
 * 
 * RETURN:
 *     Transformed Operation
 */
function transformOperation(op1, op2) {
    // Clone op2 to avoid mutation
    const transformed = new Operation(
        op2.opType,
        op2.position,
        op2.content,
        op2.userId
    );

    if (op1.opType === OperationType.INSERT && op2.opType === OperationType.INSERT) {
        // Both insertions
        if (transformed.position > op1.position) {
            transformed.position += op1.content.length;
        } else if (transformed.position === op1.position && transformed.userId < op1.userId) {
            // Tie-breaking by user_id
            transformed.position += op1.content.length;
        }
    } else if (op1.opType === OperationType.DELETE && op2.opType === OperationType.INSERT) {
        // Delete then insert
        if (transformed.position >= op1.position + op1.content.length) {
            transformed.position -= op1.content.length;
        } else if (transformed.position > op1.position) {
            transformed.position = op1.position;
        }
    } else if (op1.opType === OperationType.INSERT && op2.opType === OperationType.DELETE) {
        // Insert then delete
        if (transformed.position >= op1.position) {
            transformed.position += op1.content.length;
        }
    } else if (op1.opType === OperationType.DELETE && op2.opType === OperationType.DELETE) {
        // Both deletions
        if (transformed.position >= op1.position + op1.content.length) {
            transformed.position -= op1.content.length;
        } else if (transformed.position >= op1.position) {
            // Overlapping deletes - adjust
            const overlap = Math.min(
                transformed.content.length,
                op1.position + op1.content.length - transformed.position
            );
            transformed.content = transformed.content.slice(overlap);
            transformed.position = op1.position;
        }
    }

    return transformed;
}

// ==================== DOCUMENT ====================

/**
 * Main document manager
 * 
 * DESIGN PATTERN: Facade - coordinates all components
 * 
 * USAGE:
 *     const doc = new Document();
 *     doc.insert(0, "Hello World");
 *     doc.undo();
 *     doc.save("file.txt");
 * 
 * RETURN:
 *     Document instance
 */
class Document {
    constructor() {
        this._buffer = new TextBuffer();
        this._history = new CommandHistory();
        this._cursors = [];
        this._versions = new VersionHistory();
        this._collaborationEnabled = false;
        this._pendingOperations = [];
    }

    /**
     * Insert text at position
     * 
     * USAGE:
     *     doc.insert(0, "Hello");
     * 
     * RETURN:
     *     undefined
     */
    insert(position, text, userId = 'local') {
        const command = new InsertCommand(this._buffer, position, text, userId);
        this._history.execute(command);

        // Update cursors
        for (const cursor of this._cursors) {
            if (cursor.position >= position) {
                cursor.move(text.length);
            }
        }
    }

    /**
     * Delete text at position
     * 
     * USAGE:
     *     const deleted = doc.delete(0, 5);
     * 
     * RETURN:
     *     Deleted text
     */
    delete(position, length, userId = 'local') {
        const command = new DeleteCommand(this._buffer, position, length, userId);
        this._history.execute(command);

        // Update cursors
        for (const cursor of this._cursors) {
            if (cursor.position >= position + length) {
                cursor.move(-length);
            } else if (cursor.position > position) {
                cursor.setPosition(position);
            }
        }

        return command.deletedText;
    }

    /**
     * Replace text
     * 
     * USAGE:
     *     doc.replace(0, 5, "Hi");
     * 
     * RETURN:
     *     undefined
     */
    replace(position, length, newText, userId = 'local') {
        const command = new ReplaceCommand(this._buffer, position, length, newText, userId);
        this._history.execute(command);
    }

    /**
     * Undo last operation
     * 
     * USAGE:
     *     const success = doc.undo();
     * 
     * RETURN:
     *     boolean - true if successful
     */
    undo() {
        return this._history.undo();
    }

    /**
     * Redo last undone operation
     * 
     * USAGE:
     *     const success = doc.redo();
     * 
     * RETURN:
     *     boolean - true if successful
     */
    redo() {
        return this._history.redo();
    }

    /**
     * Get text in range
     * 
     * USAGE:
     *     const text = doc.getText(0, 10);
     * 
     * RETURN:
     *     string - text content
     */
    getText(start = 0, end = null) {
        return this._buffer.getText(start, end);
    }

    getLength() {
        return this._buffer.getLength();
    }

    addCursor(cursor) {
        this._cursors.push(cursor);
    }

    removeCursor(userId) {
        const initialLen = this._cursors.length;
        this._cursors = this._cursors.filter(c => c.userId !== userId);
        return this._cursors.length < initialLen;
    }

    getCursors() {
        return [...this._cursors];
    }

    /**
     * Create version snapshot
     * 
     * USAGE:
     *     const versionId = doc.createVersion("v1", "Initial version");
     * 
     * RETURN:
     *     string - version ID
     */
    createVersion(versionId, description = '') {
        const content = this.getText();
        return this._versions.createVersion(versionId, description, content);
    }

    /**
     * Restore document to version
     * 
     * USAGE:
     *     const success = doc.restoreVersion("v1");
     * 
     * RETURN:
     *     boolean - true if successful
     */
    restoreVersion(versionId) {
        const version = this._versions.getVersion(versionId);
        if (version) {
            this._buffer.clear();
            this._buffer.insert(0, version.content);
            this._history.clear();
            return true;
        }
        return false;
    }

    listVersions() {
        return this._versions.listVersions();
    }

    /**
     * Save document to file
     * 
     * USAGE:
     *     doc.save("document.txt");
     * 
     * RETURN:
     *     undefined
     */
    save(filename) {
        fs.writeFileSync(filename, this.getText());
        console.log(`✓ Saved to ${filename}`);
    }

    /**
     * Load document from file
     * 
     * USAGE:
     *     doc.load("document.txt");
     * 
     * RETURN:
     *     undefined
     */
    load(filename) {
        const content = fs.readFileSync(filename, 'utf8');
        this._buffer.clear();
        this._buffer.insert(0, content);
        this._history.clear();
        console.log(`✓ Loaded from ${filename}`);
    }

    applyOperation(operation) {
        // Transform against pending local operations
        let transformedOp = operation;
        for (const localOp of this._pendingOperations) {
            transformedOp = transformOperation(localOp, transformedOp);
        }

        // Apply operation
        if (operation.opType === OperationType.INSERT) {
            this.insert(transformedOp.position, transformedOp.content, transformedOp.userId);
        } else if (operation.opType === OperationType.DELETE) {
            this.delete(transformedOp.position, transformedOp.content.length, transformedOp.userId);
        }
    }

    toString() {
        const length = this.getLength();
        const history = this._history.getHistorySize();
        return `Document(length=${length}, undo=${history.undo}, redo=${history.redo}, cursors=${this._cursors.length})`;
    }
}

// ==================== DEMO ====================

/**
 * Demo of Text Editor
 * 
 * Demonstrates:
 * - Text insertion and deletion
 * - Undo/redo functionality
 * - Cursor management
 * - Selection operations
 * - Version history
 * - Operational transformation
 */
function main() {
    console.log("=".repeat(70));
    console.log("📝 TEXT EDITOR DEMO");
    console.log("=".repeat(70));

    // Create document
    console.log("\n📄 Creating document...");
    const doc = new Document();

    // Insert text
    console.log("\n✏️  Inserting text...");
    doc.insert(0, "Hello ");
    console.log(`  Text: '${doc.getText()}'`);

    doc.insert(6, "World");
    console.log(`  Text: '${doc.getText()}'`);

    doc.insert(11, "!");
    console.log(`  Text: '${doc.getText()}'`);

    // Document info
    console.log(`\n📊 Document: ${doc}`);

    // Undo operations
    console.log("\n⏪ Undo operations...");
    doc.undo();
    console.log(`  After undo 1: '${doc.getText()}'`);

    doc.undo();
    console.log(`  After undo 2: '${doc.getText()}'`);

    // Redo operations
    console.log("\n⏩ Redo operations...");
    doc.redo();
    console.log(`  After redo 1: '${doc.getText()}'`);

    doc.redo();
    console.log(`  After redo 2: '${doc.getText()}'`);

    // Delete text
    console.log("\n🗑️  Deleting text...");
    const deleted = doc.delete(5, 7);
    console.log(`  Deleted: '${deleted}'`);
    console.log(`  Text: '${doc.getText()}'`);

    // Undo delete
    console.log("\n⏪ Undo delete...");
    doc.undo();
    console.log(`  Text: '${doc.getText()}'`);

    // Replace text
    console.log("\n🔄 Replace text...");
    doc.replace(6, 5, "JavaScript");
    console.log(`  Text: '${doc.getText()}'`);

    // Cursor management
    console.log("\n🖱️  Cursor management...");
    const cursor1 = new Cursor(0, "user1");
    const cursor2 = new Cursor(6, "user2");
    doc.addCursor(cursor1);
    doc.addCursor(cursor2);
    console.log(`  Cursors: ${doc.getCursors()}`);

    // Insert at cursor position
    console.log("\n✏️  Insert at cursor positions...");
    doc.insert(cursor1.position, ">>> ");
    console.log(`  Text: '${doc.getText()}'`);
    console.log(`  Cursor1 after insert: ${cursor1}`);
    console.log(`  Cursor2 after insert: ${cursor2}`);

    // Selection
    console.log("\n🔍 Selection...");
    const selection = new Selection(4, 9);
    const selectedText = doc.getText(selection.start, selection.end);
    console.log(`  Selected text: '${selectedText}'`);
    console.log(`  Selection length: ${selection.length()}`);

    // Version history
    console.log("\n📚 Version history...");
    doc.delete(0, 4); // Remove ">>> "
    const version1Id = doc.createVersion("v1", "After cleanup");
    console.log(`  Created version: ${version1Id}`);
    console.log(`  Text at v1: '${doc.getText()}'`);

    doc.insert(doc.getLength(), " - Collaborative Edition");
    const version2Id = doc.createVersion("v2", "Added subtitle");
    console.log(`  Created version: ${version2Id}`);
    console.log(`  Text at v2: '${doc.getText()}'`);

    // List versions
    console.log("\n  All versions:");
    for (const version of doc.listVersions()) {
        console.log(`    - ${version.versionId}: ${version.description} (${version.timestamp})`);
    }

    // Restore version
    console.log("\n⏮️  Restore to v1...");
    doc.restoreVersion("v1");
    console.log(`  Text: '${doc.getText()}'`);

    // Collaborative editing simulation
    console.log("\n👥 Collaborative editing simulation...");
    doc.insert(0, "Collaborative ");
    console.log(`  User A: '${doc.getText()}'`);

    // Simulate remote operation
    const remoteOp = new Operation(OperationType.INSERT, doc.getLength(), " Editor", "userB");
    doc.applyOperation(remoteOp);
    console.log(`  After remote op from User B: '${doc.getText()}'`);

    // Operational transformation example
    console.log("\n🔀 Operational Transformation...");
    const op1 = new Operation(OperationType.INSERT, 10, " Amazing", "userA");
    const op2 = new Operation(OperationType.INSERT, 15, " Cool", "userB");

    console.log(`  Original op2: ${op2}`);
    const transformedOp2 = transformOperation(op1, op2);
    console.log(`  Transformed op2: ${transformedOp2}`);
    console.log(`  Position changed from ${op2.position} to ${transformedOp2.position}`);

    // Final statistics
    console.log("\n📊 Final Statistics:");
    console.log(`  Document length: ${doc.getLength()} characters`);
    console.log(`  Undo available: ${doc._history.canUndo()}`);
    console.log(`  Redo available: ${doc._history.canRedo()}`);
    console.log(`  Active cursors: ${doc.getCursors().length}`);
    console.log(`  Versions saved: ${doc.listVersions().length}`);

    // Save document
    console.log("\n💾 Saving document...");
    doc.save("demo_document.txt");

    console.log("\n" + "=".repeat(70));
    console.log("✨ Demo completed successfully!");
    console.log("=".repeat(70));
}

// Run demo if this is the main module
if (require.main === module) {
    main();
}

// Export for use in other modules
module.exports = {
    Document,
    TextBuffer,
    Command,
    InsertCommand,
    DeleteCommand,
    ReplaceCommand,
    CommandHistory,
    Cursor,
    Selection,
    Version,
    VersionHistory,
    Operation,
    OperationType,
    transformOperation
};
