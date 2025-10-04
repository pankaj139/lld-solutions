/**
 * Trello / Kanban Board System - Low Level Design Implementation in JavaScript
 * 
 * This file implements a comprehensive Kanban board system like Trello for task and project management.
 * It supports boards, lists, and cards hierarchy with drag-and-drop, labels, attachments, and real-time collaboration.
 * 
 * DESIGN PATTERNS USED:
 * 1. Composite Pattern: Board contains Lists, List contains Cards (tree structure)
 * 2. Command Pattern: All operations as commands for undo/redo functionality
 * 3. Observer Pattern: Real-time updates when board state changes
 * 4. Memento Pattern: Save and restore board states for undo
 * 5. Chain of Responsibility: Permission checking chain
 * 6. Decorator Pattern: Add features to cards (labels, attachments, comments)
 * 
 * OOP CONCEPTS DEMONSTRATED:
 * - ENCAPSULATION: Private fields using # syntax
 * - ABSTRACTION: Abstract classes and interfaces
 * - INHERITANCE: Concrete commands extend Command base class
 * - POLYMORPHISM: Different commands implement same interface differently
 * 
 * SOLID PRINCIPLES:
 * - SRP: Each class has single responsibility (Board, List, Card, Command)
 * - OCP: Open for extension (new commands, decorators) closed for modification
 * - LSP: Any Command can be used interchangeably
 * - ISP: Focused interfaces (Observer, Command, PermissionChecker)
 * - DIP: BoardService depends on abstractions
 * 
 * BUSINESS FEATURES:
 * - Hierarchical board structure (Board → List → Card)
 * - Drag-and-drop with fractional indexing
 * - Undo/redo functionality
 * - Real-time collaboration with observers
 * - Role-based permission system
 * - Activity tracking and audit log
 * 
 * ARCHITECTURAL NOTES:
 * - Fractional indexing for O(1) reordering
 * - Command pattern enables complete undo/redo history
 * - Observer pattern for real-time WebSocket updates
 * - Chain of Responsibility for flexible permission system
 */

const { v4: uuidv4 } = require('uuid') || { v4: () => Math.random().toString(36).substring(7) };

// ============================================================================
// ENUMS - Domain Definitions
// ============================================================================

/**
 * Board visibility levels.
 */
const BoardVisibility = {
    PRIVATE: 'PRIVATE',
    TEAM: 'TEAM',
    PUBLIC: 'PUBLIC'
};

/**
 * User roles with different permission levels.
 */
const Role = {
    OWNER: 'OWNER',
    ADMIN: 'ADMIN',
    MEMBER: 'MEMBER',
    OBSERVER: 'OBSERVER'
};

/**
 * Types of activities for audit log.
 */
const ActivityType = {
    BOARD_CREATED: 'BOARD_CREATED',
    LIST_ADDED: 'LIST_ADDED',
    LIST_MOVED: 'LIST_MOVED',
    LIST_ARCHIVED: 'LIST_ARCHIVED',
    CARD_CREATED: 'CARD_CREATED',
    CARD_MOVED: 'CARD_MOVED',
    CARD_UPDATED: 'CARD_UPDATED',
    CARD_ARCHIVED: 'CARD_ARCHIVED',
    MEMBER_ADDED: 'MEMBER_ADDED',
    MEMBER_REMOVED: 'MEMBER_REMOVED',
    COMMENT_ADDED: 'COMMENT_ADDED',
    LABEL_ADDED: 'LABEL_ADDED'
};

// ============================================================================
// CORE DOMAIN MODELS
// ============================================================================

/**
 * Represents a user in the Kanban system.
 * 
 * OOP CONCEPTS: Encapsulation - private fields with getters
 * 
 * @example
 * const user = new User("Alice", "alice@example.com");
 * console.log(user.getName());
 */
class User {
    #id;
    #name;
    #email;
    #avatarUrl;

    /**
     * Create a new user.
     * @param {string} name - User's name
     * @param {string} email - User's email
     * @param {string} avatarUrl - User's avatar URL
     */
    constructor(name, email, avatarUrl = '') {
        this.#id = uuidv4();
        this.#name = name;
        this.#email = email;
        this.#avatarUrl = avatarUrl;
    }

    getId() { return this.#id; }
    getName() { return this.#name; }
    getEmail() { return this.#email; }
    getAvatarUrl() { return this.#avatarUrl; }

    toString() {
        return `User(${this.#name})`;
    }
}

/**
 * Label for categorizing cards.
 * 
 * OOP CONCEPTS: Value Object pattern
 */
class Label {
    #id;
    #name;
    #color;
    #board;

    constructor(name, color, board) {
        this.#id = uuidv4();
        this.#name = name;
        this.#color = color;
        this.#board = board;
    }

    getId() { return this.#id; }
    getName() { return this.#name; }
    getColor() { return this.#color; }

    toString() {
        return `Label(${this.#name}, ${this.#color})`;
    }
}

/**
 * File attachment for cards.
 */
class Attachment {
    #id;
    #filename;
    #url;
    #size;
    #uploadedBy;
    #uploadedAt;

    constructor(filename, url, size, uploadedBy) {
        this.#id = uuidv4();
        this.#filename = filename;
        this.#url = url;
        this.#size = size;
        this.#uploadedBy = uploadedBy;
        this.#uploadedAt = new Date();
    }

    getId() { return this.#id; }
    getFilename() { return this.#filename; }
    getUrl() { return this.#url; }
    getSize() { return this.#size; }

    toString() {
        return `Attachment(${this.#filename})`;
    }
}

/**
 * Comment on a card for discussions.
 */
class Comment {
    #id;
    #text;
    #author;
    #card;
    #createdAt;
    #updatedAt;

    constructor(text, author, card) {
        this.#id = uuidv4();
        this.#text = text;
        this.#author = author;
        this.#card = card;
        this.#createdAt = new Date();
        this.#updatedAt = new Date();
    }

    getId() { return this.#id; }
    getText() { return this.#text; }
    getAuthor() { return this.#author; }

    updateText(text) {
        this.#text = text;
        this.#updatedAt = new Date();
    }

    toString() {
        return `Comment by ${this.#author.getName()}: ${this.#text.substring(0, 50)}`;
    }
}

/**
 * Activity log entry for audit trail.
 * 
 * OOP CONCEPTS: Value Object - immutable activity record
 */
class Activity {
    #id;
    #type;
    #user;
    #entityId;
    #description;
    #timestamp;
    #metadata;

    constructor(activityType, user, entityId, description, metadata = {}) {
        this.#id = uuidv4();
        this.#type = activityType;
        this.#user = user;
        this.#entityId = entityId;
        this.#description = description;
        this.#timestamp = new Date();
        this.#metadata = metadata;
    }

    getDescription() { return this.#description; }
    getTimestamp() { return this.#timestamp; }
    getUser() { return this.#user; }

    toString() {
        return `${this.#timestamp.toISOString()} - ${this.#user.getName()}: ${this.#description}`;
    }
}

// ============================================================================
// COMPOSITE PATTERN - Board, List, Card Hierarchy
// ============================================================================

/**
 * Individual task card in a list.
 * 
 * DESIGN PATTERN: Composite Pattern - leaf node in tree
 * OOP CONCEPTS: Encapsulation - manages card data
 * 
 * @example
 * const card = new Card("Implement feature", "Add OAuth authentication", listObj);
 * card.setDueDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
 * card.addLabel(label);
 */
class Card {
    #id;
    #title;
    #description;
    #list;
    #position;
    #dueDate;
    #labels;
    #assignedMembers;
    #attachments;
    #comments;
    #createdAt;
    #updatedAt;
    #archived;

    constructor(title, description, boardList) {
        this.#id = uuidv4();
        this.#title = title;
        this.#description = description;
        this.#list = boardList;
        this.#position = 0.0;
        this.#dueDate = null;
        this.#labels = [];
        this.#assignedMembers = [];
        this.#attachments = [];
        this.#comments = [];
        this.#createdAt = new Date();
        this.#updatedAt = new Date();
        this.#archived = false;
    }

    getId() { return this.#id; }
    getTitle() { return this.#title; }
    getDescription() { return this.#description; }
    getList() { return this.#list; }
    getPosition() { return this.#position; }
    getDueDate() { return this.#dueDate; }
    getLabels() { return [...this.#labels]; }
    getAssignedMembers() { return [...this.#assignedMembers]; }
    getAttachments() { return [...this.#attachments]; }
    getComments() { return [...this.#comments]; }
    isArchived() { return this.#archived; }

    setTitle(title) {
        this.#title = title;
        this.#updatedAt = new Date();
    }

    setDescription(description) {
        this.#description = description;
        this.#updatedAt = new Date();
    }

    setList(boardList) {
        this.#list = boardList;
    }

    /**
     * Set card position for ordering.
     * 
     * ALGORITHM: Fractional indexing for efficient reordering
     */
    setPosition(position) {
        this.#position = position;
    }

    setDueDate(dueDate) {
        this.#dueDate = dueDate;
        this.#updatedAt = new Date();
    }

    /**
     * Add label to card.
     * 
     * DESIGN PATTERN: Decorator Pattern - adding features to card
     */
    addLabel(label) {
        if (!this.#labels.includes(label)) {
            this.#labels.push(label);
            this.#updatedAt = new Date();
        }
    }

    removeLabel(label) {
        const index = this.#labels.indexOf(label);
        if (index > -1) {
            this.#labels.splice(index, 1);
            this.#updatedAt = new Date();
        }
    }

    assignMember(user) {
        if (!this.#assignedMembers.includes(user)) {
            this.#assignedMembers.push(user);
            this.#updatedAt = new Date();
        }
    }

    unassignMember(user) {
        const index = this.#assignedMembers.indexOf(user);
        if (index > -1) {
            this.#assignedMembers.splice(index, 1);
            this.#updatedAt = new Date();
        }
    }

    /**
     * Add attachment to card.
     * 
     * DESIGN PATTERN: Decorator Pattern - enriching card with attachments
     */
    addAttachment(attachment) {
        this.#attachments.push(attachment);
        this.#updatedAt = new Date();
    }

    /**
     * Add comment to card.
     * 
     * DESIGN PATTERN: Decorator Pattern - enriching card with comments
     */
    addComment(comment) {
        this.#comments.push(comment);
        this.#updatedAt = new Date();
    }

    archive() {
        this.#archived = true;
    }

    restore() {
        this.#archived = false;
    }

    toString() {
        return `Card(${this.#title})`;
    }
}

/**
 * List containing cards (workflow stage like "To Do", "In Progress").
 * 
 * DESIGN PATTERN: Composite Pattern - composite node containing cards
 * OOP CONCEPTS: Composition - list has-a collection of cards
 * 
 * @example
 * const listObj = new BoardList("To Do", board);
 * listObj.addCard(card);
 * listObj.moveCard(cardId, 1.5);
 */
class BoardList {
    #id;
    #name;
    #board;
    #cards;
    #position;
    #createdAt;
    #archived;

    constructor(name, board) {
        this.#id = uuidv4();
        this.#name = name;
        this.#board = board;
        this.#cards = [];
        this.#position = 0.0;
        this.#createdAt = new Date();
        this.#archived = false;
    }

    getId() { return this.#id; }
    getName() { return this.#name; }
    getBoard() { return this.#board; }
    getPosition() { return this.#position; }
    isArchived() { return this.#archived; }

    setName(name) {
        this.#name = name;
    }

    /**
     * Set list position for ordering.
     * 
     * ALGORITHM: Fractional indexing for O(1) reordering
     */
    setPosition(position) {
        this.#position = position;
    }

    /**
     * Add card to list.
     * 
     * DESIGN PATTERN: Composite Pattern - adding child component
     */
    addCard(card) {
        if (!this.#cards.includes(card)) {
            this.#cards.push(card);
            card.setList(this);
        }
    }

    /**
     * Remove card from list.
     * 
     * DESIGN PATTERN: Composite Pattern - removing child component
     */
    removeCard(cardId) {
        const index = this.#cards.findIndex(c => c.getId() === cardId);
        if (index > -1) {
            const card = this.#cards[index];
            this.#cards.splice(index, 1);
            return card;
        }
        return null;
    }

    getCard(cardId) {
        return this.#cards.find(c => c.getId() === cardId) || null;
    }

    /**
     * Get all cards sorted by position.
     * 
     * ALGORITHM: Sort by position for display order
     */
    getCards() {
        return this.#cards
            .filter(c => !c.isArchived())
            .sort((a, b) => a.getPosition() - b.getPosition());
    }

    getCardCount() {
        return this.#cards.filter(c => !c.isArchived()).length;
    }

    /**
     * Move card to new position within list.
     * 
     * BUSINESS RULE: Use fractional indexing for efficient reordering
     */
    moveCard(cardId, newPosition) {
        const card = this.getCard(cardId);
        if (card) {
            card.setPosition(newPosition);
            return true;
        }
        return false;
    }

    archive() {
        this.#archived = true;
        this.#cards.forEach(card => card.archive());
    }

    restore() {
        this.#archived = false;
        this.#cards.forEach(card => card.restore());
    }

    toString() {
        return `List(${this.#name}, ${this.getCardCount()} cards)`;
    }
}

/**
 * Top-level board containing lists.
 * 
 * DESIGN PATTERN: Composite Pattern - root composite containing lists
 * OOP CONCEPTS: Composition - board has-a collection of lists
 * 
 * @example
 * const board = new Board("Project Alpha", owner, BoardVisibility.TEAM);
 * board.addList(listObj);
 * board.addMember(user, Role.MEMBER);
 */
class Board {
    #id;
    #name;
    #description;
    #owner;
    #lists;
    #members;
    #labels;
    #activities;
    #visibility;
    #createdAt;
    #updatedAt;

    constructor(name, owner, visibility = BoardVisibility.PRIVATE) {
        this.#id = uuidv4();
        this.#name = name;
        this.#description = '';
        this.#owner = owner;
        this.#lists = [];
        this.#members = new Map([[owner.getId(), Role.OWNER]]);
        this.#labels = [];
        this.#activities = [];
        this.#visibility = visibility;
        this.#createdAt = new Date();
        this.#updatedAt = new Date();
    }

    getId() { return this.#id; }
    getName() { return this.#name; }
    getDescription() { return this.#description; }
    getOwner() { return this.#owner; }
    getVisibility() { return this.#visibility; }

    setName(name) {
        this.#name = name;
        this.#updatedAt = new Date();
    }

    setDescription(description) {
        this.#description = description;
        this.#updatedAt = new Date();
    }

    /**
     * Add list to board.
     * 
     * DESIGN PATTERN: Composite Pattern - adding child composite
     */
    addList(boardList) {
        if (!this.#lists.includes(boardList)) {
            this.#lists.push(boardList);
        }
    }

    /**
     * Remove list from board.
     * 
     * DESIGN PATTERN: Composite Pattern - removing child composite
     */
    removeList(listId) {
        const index = this.#lists.findIndex(l => l.getId() === listId);
        if (index > -1) {
            const list = this.#lists[index];
            this.#lists.splice(index, 1);
            return list;
        }
        return null;
    }

    getList(listId) {
        return this.#lists.find(l => l.getId() === listId) || null;
    }

    getLists() {
        return this.#lists
            .filter(l => !l.isArchived())
            .sort((a, b) => a.getPosition() - b.getPosition());
    }

    moveList(listId, newPosition) {
        const list = this.getList(listId);
        if (list) {
            list.setPosition(newPosition);
            return true;
        }
        return false;
    }

    addMember(user, role) {
        this.#members.set(user.getId(), role);
    }

    removeMember(userId) {
        if (userId !== this.#owner.getId()) {
            return this.#members.delete(userId);
        }
        return false;
    }

    getMemberRole(userId) {
        return this.#members.get(userId) || null;
    }

    isMember(userId) {
        return this.#members.has(userId);
    }

    addLabel(label) {
        if (!this.#labels.includes(label)) {
            this.#labels.push(label);
        }
    }

    getLabels() {
        return [...this.#labels];
    }

    /**
     * Log activity to board.
     * 
     * BUSINESS RULE: Maintain audit trail of all operations
     */
    addActivity(activity) {
        this.#activities.push(activity);
    }

    getActivities(limit = 50) {
        return this.#activities
            .sort((a, b) => b.getTimestamp() - a.getTimestamp())
            .slice(0, limit);
    }

    toString() {
        return `Board(${this.#name}, ${this.#lists.length} lists)`;
    }
}

// ============================================================================
// MEMENTO PATTERN - State Saving for Undo
// ============================================================================

/**
 * Memento storing card state for undo functionality.
 * 
 * DESIGN PATTERN: Memento Pattern - stores object state
 * OOP CONCEPTS: Encapsulation - state hidden from external access
 * 
 * @example
 * const memento = CardMemento.createFrom(card);
 * // ... modify card ...
 * memento.restore(card);
 */
class CardMemento {
    #title;
    #description;
    #dueDate;
    #labels;
    #assignedMembers;

    constructor(title, description, dueDate, labels, assignedMembers) {
        this.#title = title;
        this.#description = description;
        this.#dueDate = dueDate;
        this.#labels = [...labels];
        this.#assignedMembers = [...assignedMembers];
    }

    /**
     * Create memento from card current state.
     * 
     * DESIGN PATTERN: Memento Pattern - snapshot creation
     */
    static createFrom(card) {
        return new CardMemento(
            card.getTitle(),
            card.getDescription(),
            card.getDueDate(),
            card.getLabels(),
            card.getAssignedMembers()
        );
    }

    /**
     * Restore card to saved state.
     * 
     * DESIGN PATTERN: Memento Pattern - state restoration
     */
    restore(card) {
        card.setTitle(this.#title);
        card.setDescription(this.#description);
        if (this.#dueDate) {
            card.setDueDate(this.#dueDate);
        }
    }
}

// ============================================================================
// COMMAND PATTERN - Operations with Undo/Redo
// ============================================================================

/**
 * Abstract command for operations.
 * 
 * DESIGN PATTERN: Command Pattern - encapsulates operations
 * SOLID: SRP - each command has single responsibility
 */
class Command {
    execute() {
        throw new Error('execute() must be implemented');
    }

    undo() {
        throw new Error('undo() must be implemented');
    }

    getDescription() {
        throw new Error('getDescription() must be implemented');
    }
}

/**
 * Command to create a new card.
 * 
 * DESIGN PATTERN: Command Pattern - concrete command
 * OOP CONCEPTS: Encapsulation - encapsulates card creation
 */
class CreateCardCommand extends Command {
    #list;
    #card;
    #executed;

    constructor(boardList, card) {
        super();
        this.#list = boardList;
        this.#card = card;
        this.#executed = false;
    }

    execute() {
        if (!this.#executed) {
            this.#list.addCard(this.#card);
            this.#executed = true;
        }
    }

    undo() {
        if (this.#executed) {
            this.#list.removeCard(this.#card.getId());
            this.#executed = false;
        }
    }

    getDescription() {
        return `Create card '${this.#card.getTitle()}' in list '${this.#list.getName()}'`;
    }
}

/**
 * Command to move card between lists.
 * 
 * DESIGN PATTERN: Command Pattern - concrete command
 * BUSINESS RULE: Store old state for undo
 */
class MoveCardCommand extends Command {
    #card;
    #fromList;
    #toList;
    #oldPosition;
    #newPosition;
    #executed;

    constructor(card, fromList, toList, oldPosition, newPosition) {
        super();
        this.#card = card;
        this.#fromList = fromList;
        this.#toList = toList;
        this.#oldPosition = oldPosition;
        this.#newPosition = newPosition;
        this.#executed = false;
    }

    execute() {
        if (!this.#executed) {
            this.#fromList.removeCard(this.#card.getId());
            this.#toList.addCard(this.#card);
            this.#card.setPosition(this.#newPosition);
            this.#executed = true;
        }
    }

    undo() {
        if (this.#executed) {
            this.#toList.removeCard(this.#card.getId());
            this.#fromList.addCard(this.#card);
            this.#card.setPosition(this.#oldPosition);
            this.#executed = false;
        }
    }

    getDescription() {
        return `Move card '${this.#card.getTitle()}' from '${this.#fromList.getName()}' to '${this.#toList.getName()}'`;
    }
}

/**
 * Command to update card details.
 * 
 * DESIGN PATTERN: Command Pattern + Memento Pattern
 * Uses memento to store old state for undo
 */
class UpdateCardCommand extends Command {
    #card;
    #oldState;
    #newTitle;
    #newDescription;
    #executed;

    constructor(card, oldState, newTitle = null, newDescription = null) {
        super();
        this.#card = card;
        this.#oldState = oldState;
        this.#newTitle = newTitle;
        this.#newDescription = newDescription;
        this.#executed = false;
    }

    execute() {
        if (!this.#executed) {
            if (this.#newTitle) {
                this.#card.setTitle(this.#newTitle);
            }
            if (this.#newDescription) {
                this.#card.setDescription(this.#newDescription);
            }
            this.#executed = true;
        }
    }

    undo() {
        if (this.#executed) {
            this.#oldState.restore(this.#card);
            this.#executed = false;
        }
    }

    getDescription() {
        return `Update card '${this.#card.getTitle()}'`;
    }
}

/**
 * Command to delete (archive) a card.
 * 
 * DESIGN PATTERN: Command Pattern
 * BUSINESS RULE: Archive instead of permanent delete
 */
class DeleteCardCommand extends Command {
    #card;
    #executed;

    constructor(card) {
        super();
        this.#card = card;
        this.#executed = false;
    }

    execute() {
        if (!this.#executed) {
            this.#card.archive();
            this.#executed = true;
        }
    }

    undo() {
        if (this.#executed) {
            this.#card.restore();
            this.#executed = false;
        }
    }

    getDescription() {
        return `Archive card '${this.#card.getTitle()}'`;
    }
}

/**
 * Manages command history for undo/redo.
 * 
 * DESIGN PATTERN: Command Pattern - command manager
 * DATA STRUCTURE: Two stacks for undo/redo
 * 
 * @example
 * const history = new CommandHistory();
 * history.executeCommand(command);
 * history.undo();
 * history.redo();
 */
class CommandHistory {
    #undoStack;
    #redoStack;
    #maxSize;

    constructor(maxSize = 50) {
        this.#undoStack = [];
        this.#redoStack = [];
        this.#maxSize = maxSize;
    }

    /**
     * Execute command and add to undo stack.
     * 
     * BUSINESS RULE: Clear redo stack on new command
     * TIME COMPLEXITY: O(1)
     */
    executeCommand(command) {
        command.execute();
        this.#undoStack.push(command);
        this.#redoStack = [];

        // Limit stack size
        if (this.#undoStack.length > this.#maxSize) {
            this.#undoStack.shift();
        }
    }

    /**
     * Undo last command.
     * 
     * TIME COMPLEXITY: O(1)
     * @returns {boolean} True if undo successful
     */
    undo() {
        if (this.#undoStack.length > 0) {
            const command = this.#undoStack.pop();
            command.undo();
            this.#redoStack.push(command);
            return true;
        }
        return false;
    }

    /**
     * Redo last undone command.
     * 
     * TIME COMPLEXITY: O(1)
     * @returns {boolean} True if redo successful
     */
    redo() {
        if (this.#redoStack.length > 0) {
            const command = this.#redoStack.pop();
            command.execute();
            this.#undoStack.push(command);
            return true;
        }
        return false;
    }

    canUndo() {
        return this.#undoStack.length > 0;
    }

    canRedo() {
        return this.#redoStack.length > 0;
    }
}

// ============================================================================
// OBSERVER PATTERN - Real-time Updates
// ============================================================================

/**
 * Observer interface for board events.
 * 
 * DESIGN PATTERN: Observer Pattern - defines observer interface
 * SOLID: ISP - focused interface
 */
class BoardObserver {
    onBoardUpdated(board) {
        throw new Error('onBoardUpdated() must be implemented');
    }

    onListAdded(boardList) {
        throw new Error('onListAdded() must be implemented');
    }

    onCardMoved(card, fromList, toList) {
        throw new Error('onCardMoved() must be implemented');
    }
}

/**
 * Concrete observer that sends WebSocket notifications.
 * 
 * DESIGN PATTERN: Observer Pattern - concrete observer
 * OOP CONCEPTS: Polymorphism - implements BoardObserver interface
 */
class WebSocketNotifier extends BoardObserver {
    #connections;

    constructor() {
        super();
        this.#connections = new Map(); // Simulated WebSocket connections
    }

    onBoardUpdated(board) {
        const message = `🔔 Board '${board.getName()}' was updated`;
        console.log(`WebSocket: ${message}`);
    }

    onListAdded(boardList) {
        const message = `🔔 List '${boardList.getName()}' was added`;
        console.log(`WebSocket: ${message}`);
    }

    onCardMoved(card, fromList, toList) {
        const message = `🔔 Card '${card.getTitle()}' moved from '${fromList.getName()}' to '${toList.getName()}'`;
        console.log(`WebSocket: ${message}`);
    }
}

/**
 * Observer that logs all activities.
 * 
 * DESIGN PATTERN: Observer Pattern - concrete observer
 */
class ActivityLogger extends BoardObserver {
    onBoardUpdated(board) {
        const activity = new Activity(
            ActivityType.BOARD_CREATED,
            board.getOwner(),
            board.getId(),
            `Board '${board.getName()}' was updated`,
            {}
        );
        board.addActivity(activity);
    }

    onListAdded(boardList) {
        const activity = new Activity(
            ActivityType.LIST_ADDED,
            boardList.getBoard().getOwner(),
            boardList.getId(),
            `List '${boardList.getName()}' was added`,
            {}
        );
        boardList.getBoard().addActivity(activity);
    }

    onCardMoved(card, fromList, toList) {
        const activity = new Activity(
            ActivityType.CARD_MOVED,
            card.getList().getBoard().getOwner(),
            card.getId(),
            `Card '${card.getTitle()}' moved from '${fromList.getName()}' to '${toList.getName()}'`,
            { fromList: fromList.getId(), toList: toList.getId() }
        );
        card.getList().getBoard().addActivity(activity);
    }
}

// ============================================================================
// CHAIN OF RESPONSIBILITY - Permission Checking
// ============================================================================

/**
 * Abstract permission checker.
 * 
 * DESIGN PATTERN: Chain of Responsibility - defines chain interface
 * SOLID: SRP - each checker handles one level
 */
class PermissionChecker {
    #next;

    constructor() {
        this.#next = null;
    }

    setNext(checker) {
        this.#next = checker;
        return checker;
    }

    checkPermission(user, resource, action) {
        throw new Error('checkPermission() must be implemented');
    }

    getNext() {
        return this.#next;
    }
}

/**
 * Checks board-level permissions.
 * 
 * DESIGN PATTERN: Chain of Responsibility - concrete handler
 */
class BoardPermissionChecker extends PermissionChecker {
    /**
     * Check board permissions.
     * 
     * BUSINESS RULE: OBSERVER role can only view
     */
    checkPermission(user, resource, action) {
        if (resource instanceof Board) {
            const role = resource.getMemberRole(user.getId());
            if (!role) {
                return false; // Not a member
            }

            if (role === Role.OBSERVER && (action === 'edit' || action === 'delete')) {
                return false;
            }

            if (role === Role.OWNER || role === Role.ADMIN) {
                return true; // Full access
            }

            if (role === Role.MEMBER && (action === 'view' || action === 'edit')) {
                return true;
            }
        }

        // Pass to next checker
        const next = this.getNext();
        if (next) {
            return next.checkPermission(user, resource, action);
        }

        return true; // Default allow
    }
}

/**
 * Checks list-level permissions.
 * 
 * DESIGN PATTERN: Chain of Responsibility - concrete handler
 */
class ListPermissionChecker extends PermissionChecker {
    checkPermission(user, resource, action) {
        if (resource instanceof BoardList) {
            // Check board permissions first
            const board = resource.getBoard();
            const boardRole = board.getMemberRole(user.getId());
            if (!boardRole || boardRole === Role.OBSERVER) {
                return action === 'view';
            }
        }

        // Pass to next checker
        const next = this.getNext();
        if (next) {
            return next.checkPermission(user, resource, action);
        }

        return true;
    }
}

/**
 * Checks card-level permissions.
 * 
 * DESIGN PATTERN: Chain of Responsibility - concrete handler
 */
class CardPermissionChecker extends PermissionChecker {
    checkPermission(user, resource, action) {
        if (resource instanceof Card) {
            // Check board permissions
            const board = resource.getList().getBoard();
            const boardRole = board.getMemberRole(user.getId());
            if (!boardRole || boardRole === Role.OBSERVER) {
                return action === 'view';
            }
        }

        // Pass to next checker
        const next = this.getNext();
        if (next) {
            return next.checkPermission(user, resource, action);
        }

        return true;
    }
}

// ============================================================================
// BOARD SERVICE - Main Facade
// ============================================================================

/**
 * Main service managing boards with all patterns.
 * 
 * DESIGN PATTERN: Facade Pattern - unified interface
 * OOP CONCEPTS: Encapsulation - manages system complexity
 * 
 * @example
 * const service = new BoardService();
 * const board = service.createBoard("Project", owner);
 * const listObj = service.createList(board.getId(), "To Do");
 * const card = service.createCard(listObj.getId(), "Task");
 * service.undo();  // Undo last operation
 */
class BoardService {
    #boards;
    #commandHistory;
    #observers;
    #permissionChain;

    constructor() {
        this.#boards = new Map();
        this.#commandHistory = new CommandHistory();
        this.#observers = [];

        // Setup permission chain
        this.#permissionChain = new BoardPermissionChecker();
        this.#permissionChain
            .setNext(new ListPermissionChecker())
            .setNext(new CardPermissionChecker());
    }

    /**
     * Register observer for board events.
     * 
     * DESIGN PATTERN: Observer Pattern - register observers
     */
    addObserver(observer) {
        this.#observers.push(observer);
    }

    createBoard(name, owner, visibility = BoardVisibility.PRIVATE) {
        const board = new Board(name, owner, visibility);
        this.#boards.set(board.getId(), board);
        this.#notifyBoardUpdated(board);
        return board;
    }

    createList(boardId, name) {
        const board = this.#boards.get(boardId);
        if (!board) {
            return null;
        }

        const boardList = new BoardList(name, board);
        const position = board.getLists().length + 1.0;
        boardList.setPosition(position);
        board.addList(boardList);

        this.#notifyListAdded(boardList);
        return boardList;
    }

    createCard(listId, title, description = '') {
        const boardList = this.#findList(listId);
        if (!boardList) {
            return null;
        }

        const card = new Card(title, description, boardList);
        const position = boardList.getCardCount() + 1.0;
        card.setPosition(position);

        const command = new CreateCardCommand(boardList, card);
        this.#commandHistory.executeCommand(command);

        return card;
    }

    moveCard(cardId, toListId, position) {
        const card = this.#findCard(cardId);
        const toList = this.#findList(toListId);

        if (!card || !toList) {
            return false;
        }

        const fromList = card.getList();
        const oldPosition = card.getPosition();

        const command = new MoveCardCommand(card, fromList, toList, oldPosition, position);
        this.#commandHistory.executeCommand(command);

        this.#notifyCardMoved(card, fromList, toList);
        return true;
    }

    updateCard(cardId, newTitle = null, newDescription = null) {
        const card = this.#findCard(cardId);
        if (!card) {
            return false;
        }

        const oldState = CardMemento.createFrom(card);
        const command = new UpdateCardCommand(card, oldState, newTitle, newDescription);
        this.#commandHistory.executeCommand(command);

        return true;
    }

    deleteCard(cardId) {
        const card = this.#findCard(cardId);
        if (!card) {
            return false;
        }

        const command = new DeleteCardCommand(card);
        this.#commandHistory.executeCommand(command);

        return true;
    }

    addLabelToCard(cardId, label) {
        const card = this.#findCard(cardId);
        if (!card) {
            return false;
        }

        card.addLabel(label);
        return true;
    }

    assignMemberToCard(cardId, user) {
        const card = this.#findCard(cardId);
        if (!card) {
            return false;
        }

        card.assignMember(user);
        return true;
    }

    addComment(cardId, comment) {
        const card = this.#findCard(cardId);
        if (!card) {
            return false;
        }

        card.addComment(comment);
        return true;
    }

    /**
     * Undo last operation.
     * 
     * DESIGN PATTERN: Command Pattern - undo functionality
     */
    undo() {
        return this.#commandHistory.undo();
    }

    /**
     * Redo last undone operation.
     * 
     * DESIGN PATTERN: Command Pattern - redo functionality
     */
    redo() {
        return this.#commandHistory.redo();
    }

    canUndo() {
        return this.#commandHistory.canUndo();
    }

    canRedo() {
        return this.#commandHistory.canRedo();
    }

    /**
     * Check if user has permission for action.
     * 
     * DESIGN PATTERN: Chain of Responsibility - permission check
     */
    checkPermission(user, resource, action) {
        return this.#permissionChain.checkPermission(user, resource, action);
    }

    #findList(listId) {
        for (const board of this.#boards.values()) {
            const list = board.getList(listId);
            if (list) {
                return list;
            }
        }
        return null;
    }

    #findCard(cardId) {
        for (const board of this.#boards.values()) {
            for (const list of board.getLists()) {
                const card = list.getCard(cardId);
                if (card) {
                    return card;
                }
            }
        }
        return null;
    }

    #notifyBoardUpdated(board) {
        this.#observers.forEach(observer => observer.onBoardUpdated(board));
    }

    #notifyListAdded(boardList) {
        this.#observers.forEach(observer => observer.onListAdded(boardList));
    }

    #notifyCardMoved(card, fromList, toList) {
        this.#observers.forEach(observer => observer.onCardMoved(card, fromList, toList));
    }
}

// ============================================================================
// DEMO / MAIN FUNCTION
// ============================================================================

/**
 * Demonstrate the Trello/Kanban board system.
 */
function main() {
    console.log('='.repeat(80));
    console.log('TRELLO / KANBAN BOARD SYSTEM - COMPREHENSIVE DEMO');
    console.log('='.repeat(80));
    console.log();

    // Step 1: Create service and users
    console.log('📝 Step 1: Creating Board Service and Users');
    console.log('-'.repeat(80));
    const service = new BoardService();

    // Add observers
    const wsNotifier = new WebSocketNotifier();
    const activityLogger = new ActivityLogger();
    service.addObserver(wsNotifier);
    service.addObserver(activityLogger);

    const alice = new User('Alice', 'alice@example.com');
    const bob = new User('Bob', 'bob@example.com');
    const charlie = new User('Charlie', 'charlie@example.com');
    console.log(`✅ Created users: ${alice.getName()}, ${bob.getName()}, ${charlie.getName()}`);
    console.log();

    // Step 2: Create board
    console.log('📝 Step 2: Creating Board');
    console.log('-'.repeat(80));
    const board = service.createBoard('Project Alpha', alice, BoardVisibility.TEAM);
    console.log(`✅ Created board: ${board.getName()}`);
    console.log();

    // Step 3: Add members
    console.log('📝 Step 3: Adding Team Members');
    console.log('-'.repeat(80));
    board.addMember(bob, Role.MEMBER);
    board.addMember(charlie, Role.OBSERVER);
    console.log(`✅ Added ${bob.getName()} as MEMBER`);
    console.log(`✅ Added ${charlie.getName()} as OBSERVER`);
    console.log();

    // Step 4: Create lists
    console.log('📝 Step 4: Creating Workflow Lists');
    console.log('-'.repeat(80));
    const todoList = service.createList(board.getId(), 'To Do');
    const inProgressList = service.createList(board.getId(), 'In Progress');
    const doneList = service.createList(board.getId(), 'Done');
    console.log('✅ Created lists: To Do, In Progress, Done');
    console.log();

    // Step 5: Create cards
    console.log('📝 Step 5: Creating Task Cards');
    console.log('-'.repeat(80));
    const card1 = service.createCard(todoList.getId(), 'Implement authentication', 'Add OAuth 2.0 authentication');
    const card2 = service.createCard(todoList.getId(), 'Design database schema', 'Design tables for users and posts');
    const card3 = service.createCard(todoList.getId(), 'Write API documentation', 'Document REST API endpoints');
    console.log('✅ Created 3 cards in "To Do"');
    console.log();

    // Step 6: Add labels (Decorator Pattern)
    console.log('📝 Step 6: Adding Labels to Cards (Decorator Pattern)');
    console.log('-'.repeat(80));
    const labelUrgent = new Label('Urgent', '#FF0000', board);
    const labelBackend = new Label('Backend', '#0000FF', board);
    board.addLabel(labelUrgent);
    board.addLabel(labelBackend);

    service.addLabelToCard(card1.getId(), labelUrgent);
    service.addLabelToCard(card1.getId(), labelBackend);
    console.log(`✅ Added labels to '${card1.getTitle()}'`);
    console.log();

    // Step 7: Assign members
    console.log('📝 Step 7: Assigning Team Members to Cards');
    console.log('-'.repeat(80));
    service.assignMemberToCard(card1.getId(), bob);
    console.log(`✅ Assigned ${bob.getName()} to '${card1.getTitle()}'`);
    console.log();

    // Step 8: Add comments (Decorator Pattern)
    console.log('📝 Step 8: Adding Comments (Decorator Pattern)');
    console.log('-'.repeat(80));
    const comment = new Comment("Let's use Auth0 for OAuth implementation", alice, card1);
    service.addComment(card1.getId(), comment);
    console.log(`✅ Added comment to '${card1.getTitle()}'`);
    console.log();

    // Step 9: Move cards (Command Pattern)
    console.log('📝 Step 9: Moving Cards Between Lists (Command Pattern)');
    console.log('-'.repeat(80));
    service.moveCard(card1.getId(), inProgressList.getId(), 1.0);
    console.log(`✅ Moved '${card1.getTitle()}' to 'In Progress'`);
    console.log();

    // Step 10: Update card (Command Pattern + Memento Pattern)
    console.log('📝 Step 10: Updating Card (Command + Memento Pattern)');
    console.log('-'.repeat(80));
    service.updateCard(card2.getId(), 'Design complete database schema');
    console.log('✅ Updated card title');
    console.log();

    // Step 11: Demonstrate undo/redo
    console.log('📝 Step 11: Demonstrating Undo/Redo (Command Pattern)');
    console.log('-'.repeat(80));
    console.log(`Can undo: ${service.canUndo()}`);
    console.log(`Can redo: ${service.canRedo()}`);
    console.log();
    console.log('Undoing last update...');
    service.undo();
    console.log(`Card title after undo: '${card2.getTitle()}'`);
    console.log();
    console.log('Redoing...');
    service.redo();
    console.log(`Card title after redo: '${card2.getTitle()}'`);
    console.log();

    // Step 12: Permission checking (Chain of Responsibility)
    console.log('📝 Step 12: Checking Permissions (Chain of Responsibility)');
    console.log('-'.repeat(80));
    const canEditAlice = service.checkPermission(alice, board, 'edit');
    const canEditBob = service.checkPermission(bob, board, 'edit');
    const canEditCharlie = service.checkPermission(charlie, board, 'edit');
    console.log(`Alice (OWNER) can edit board: ${canEditAlice}`);
    console.log(`Bob (MEMBER) can edit board: ${canEditBob}`);
    console.log(`Charlie (OBSERVER) can edit board: ${canEditCharlie}`);
    console.log();

    // Step 13: Show board structure (Composite Pattern)
    console.log('📝 Step 13: Board Structure (Composite Pattern)');
    console.log('-'.repeat(80));
    console.log(`Board: ${board.getName()}`);
    for (const list of board.getLists()) {
        console.log(`  └─ List: ${list.getName()} (${list.getCardCount()} cards)`);
        for (const card of list.getCards()) {
            console.log(`      └─ Card: ${card.getTitle()}`);
            if (card.getLabels().length > 0) {
                const labelsStr = card.getLabels().map(l => l.getName()).join(', ');
                console.log(`          Labels: ${labelsStr}`);
            }
            if (card.getAssignedMembers().length > 0) {
                const membersStr = card.getAssignedMembers().map(m => m.getName()).join(', ');
                console.log(`          Assigned: ${membersStr}`);
            }
        }
    }
    console.log();

    // Step 14: Activity log (Observer Pattern)
    console.log('📝 Step 14: Activity Log (Observer Pattern)');
    console.log('-'.repeat(80));
    const activities = board.getActivities(10);
    console.log('Recent activities:');
    for (const activity of activities) {
        console.log(`  • ${activity}`);
    }
    console.log();

    console.log('='.repeat(80));
    console.log('DEMO COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(80));
    console.log();
    console.log('Design Patterns Demonstrated:');
    console.log('  1. ✅ Composite Pattern - Board/List/Card hierarchy');
    console.log('  2. ✅ Command Pattern - Undo/Redo functionality');
    console.log('  3. ✅ Observer Pattern - Real-time notifications');
    console.log('  4. ✅ Memento Pattern - State saving for undo');
    console.log('  5. ✅ Chain of Responsibility - Permission checking');
    console.log('  6. ✅ Decorator Pattern - Labels, comments, attachments');
}

// Run demo if executed directly
if (require.main === module) {
    main();
}

// Export for use as module
module.exports = {
    BoardVisibility,
    Role,
    ActivityType,
    User,
    Label,
    Attachment,
    Comment,
    Activity,
    Card,
    BoardList,
    Board,
    CardMemento,
    Command,
    CreateCardCommand,
    MoveCardCommand,
    UpdateCardCommand,
    DeleteCardCommand,
    CommandHistory,
    BoardObserver,
    WebSocketNotifier,
    ActivityLogger,
    PermissionChecker,
    BoardPermissionChecker,
    ListPermissionChecker,
    CardPermissionChecker,
    BoardService
};

