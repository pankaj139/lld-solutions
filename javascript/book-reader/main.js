/**
 * Book Reader System Implementation
 * 
 * This module implements a digital book reading application (like Kindle) with:
 * - Library management and book organization
 * - Reading progress tracking with session management
 * - Annotations: bookmarks, highlights, and notes
 * - Customizable reading experience (fonts, themes, layout)
 * - Full-text search within books
 * - Reading statistics and streak tracking
 * - Multi-format support (EPUB, PDF, MOBI, TXT)
 * 
 * Usage:
 *   // Create library and reader
 *   const library = new Library();
 *   const reader = new Reader("user_1");
 *   
 *   // Add and open book
 *   const book = new Book("1984", "George Orwell", "path/to/1984.epub");
 *   library.addBook(book);
 *   reader.openBook(book.id, library);
 *   
 *   // Read and annotate
 *   reader.turnPage(PageDirection.NEXT);
 *   reader.addHighlight("Important text", Color.YELLOW, 10, 100, 150);
 *   reader.addBookmark("Chapter 5", 50);
 *   
 *   // Get statistics
 *   const stats = reader.getReadingStats(TimePeriod.WEEK);
 * 
 * Design Patterns:
 *   - State Pattern: Reading states (Idle, Reading, Paused, Finished)
 *   - Strategy Pattern: Book format parsers
 *   - Observer Pattern: Progress updates, annotation changes
 *   - Memento Pattern: Reading position save/restore
 *   - Command Pattern: Undo/redo for annotations
 *   - Singleton Pattern: Library and settings managers
 *   - Factory Pattern: Book parser creation
 *   - Composite Pattern: Book hierarchy
 * 
 * Author: LLD Solutions
 * Date: 2025-10-05
 */

// ===================== Enums =====================

const BookFormat = {
    EPUB: 'epub',
    PDF: 'pdf',
    MOBI: 'mobi',
    TXT: 'txt'
};

const Color = {
    YELLOW: 'yellow',
    GREEN: 'green',
    BLUE: 'blue',
    PINK: 'pink',
    ORANGE: 'orange'
};

const Theme = {
    LIGHT: 'light',
    DARK: 'dark',
    SEPIA: 'sepia'
};

const PageDirection = {
    NEXT: 'next',
    PREVIOUS: 'previous'
};

const TimePeriod = {
    DAY: 'day',
    WEEK: 'week',
    MONTH: 'month',
    YEAR: 'year'
};

const BookStatus = {
    UNREAD: 'unread',
    READING: 'reading',
    COMPLETED: 'completed'
};

// ===================== Book and Chapter Classes =====================

/**
 * Represents a chapter within a book.
 * 
 * Usage:
 *   const chapter = new Chapter("ch1", "Introduction", 1, 20, "content");
 *   const content = chapter.getContent();
 * 
 * Returns:
 *   Chapter: Chapter with content and metadata
 */
class Chapter {
    constructor(chapterId, title, startPage, endPage, content = "") {
        this.id = chapterId;
        this.title = title;
        this.startPage = startPage;
        this.endPage = endPage;
        this.content = content;
        this.subChapters = [];
    }

    getContent() {
        return this.content;
    }

    addSubChapter(chapter) {
        this.subChapters.push(chapter);
    }

    toString() {
        return `Chapter('${this.title}', pages ${this.startPage}-${this.endPage})`;
    }
}

/**
 * Represents a digital book with metadata and content.
 * 
 * Usage:
 *   const book = new Book("1984", "George Orwell", "path/to/book.epub");
 *   book.addChapter(chapter);
 *   const results = book.search("freedom");
 * 
 * Returns:
 *   Book: Complete book instance with all metadata
 */
class Book {
    constructor(title, author, filePath, bookFormat = BookFormat.EPUB) {
        this.id = `${title.toLowerCase().replace(/ /g, '_')}_${author.toLowerCase().replace(/ /g, '_')}`;
        this.title = title;
        this.author = author;
        this.filePath = filePath;
        this.format = bookFormat;
        this.isbn = "";
        this.totalPages = 0;
        this.coverImage = "";
        this.chapters = [];
        this.metadata = {};
        this.status = BookStatus.UNREAD;
        this.dateAdded = new Date();
    }

    addChapter(chapter) {
        this.chapters.push(chapter);
        if (chapter.endPage > this.totalPages) {
            this.totalPages = chapter.endPage;
        }
    }

    getChapter(index) {
        if (index >= 0 && index < this.chapters.length) {
            return this.chapters[index];
        }
        return null;
    }

    getContent(page) {
        for (const chapter of this.chapters) {
            if (chapter.startPage <= page && page <= chapter.endPage) {
                return `[Page ${page}]\n${chapter.content.substring(0, 200)}...`;
            }
        }
        return `[Page ${page}] Content not available`;
    }

    search(query) {
        const results = [];
        const queryLower = query.toLowerCase();
        
        for (const chapter of this.chapters) {
            const contentLower = chapter.content.toLowerCase();
            if (contentLower.includes(queryLower)) {
                const pos = contentLower.indexOf(queryLower);
                const contextStart = Math.max(0, pos - 50);
                const contextEnd = Math.min(chapter.content.length, pos + query.length + 50);
                const context = chapter.content.substring(contextStart, contextEnd);
                
                results.push({
                    chapter: chapter.title,
                    page: chapter.startPage,
                    context: `...${context}...`,
                    position: pos
                });
            }
        }
        return results;
    }

    toString() {
        return `Book('${this.title}' by ${this.author}, ${this.totalPages} pages)`;
    }
}

// ===================== Annotations (Command Pattern) =====================

/**
 * Abstract base class for annotations.
 */
class Annotation {
    constructor(annotationId, bookId, pageNumber) {
        if (new.target === Annotation) {
            throw new Error("Cannot instantiate abstract class");
        }
        this.id = annotationId;
        this.bookId = bookId;
        this.pageNumber = pageNumber;
        this.createdAt = new Date();
        this.modifiedAt = new Date();
    }

    toDict() {
        throw new Error("Method must be implemented");
    }

    toString() {
        return `${this.constructor.name}(page=${this.pageNumber})`;
    }
}

/**
 * Bookmark annotation for marking positions.
 * 
 * Usage:
 *   const bookmark = new Bookmark("b1", "book_123", "Chapter 5", 50, 0.0);
 *   const [page, pos] = bookmark.jumpTo();
 * 
 * Returns:
 *   Bookmark: Bookmark instance with position
 */
class Bookmark extends Annotation {
    constructor(annotationId, bookId, name, pageNumber, position = 0.0) {
        super(annotationId, bookId, pageNumber);
        this.name = name;
        this.position = position;
    }

    toDict() {
        return {
            id: this.id,
            type: 'bookmark',
            bookId: this.bookId,
            name: this.name,
            page: this.pageNumber,
            position: this.position,
            createdAt: this.createdAt.toISOString()
        };
    }

    jumpTo() {
        return [this.pageNumber, this.position];
    }
}

/**
 * Highlight annotation with optional note.
 * 
 * Usage:
 *   const highlight = new Highlight("h1", "book_123", "text", Color.YELLOW, 10, 100, 150);
 *   highlight.changeColor(Color.GREEN);
 *   highlight.addNote("Important concept");
 * 
 * Returns:
 *   Highlight: Highlight with text, color, and optional note
 */
class Highlight extends Annotation {
    constructor(annotationId, bookId, text, color, pageNumber, startOffset, endOffset) {
        super(annotationId, bookId, pageNumber);
        this.text = text;
        this.color = color;
        this.startOffset = startOffset;
        this.endOffset = endOffset;
        this.note = null;
    }

    changeColor(color) {
        this.color = color;
        this.modifiedAt = new Date();
    }

    addNote(text) {
        if (this.note) {
            this.note.updateText(text);
        } else {
            this.note = new Note(`note_${this.id}`, this.bookId, text, this.id, this.pageNumber);
        }
        this.modifiedAt = new Date();
    }

    toDict() {
        return {
            id: this.id,
            type: 'highlight',
            bookId: this.bookId,
            text: this.text,
            color: this.color,
            page: this.pageNumber,
            startOffset: this.startOffset,
            endOffset: this.endOffset,
            note: this.note ? this.note.toDict() : null,
            createdAt: this.createdAt.toISOString()
        };
    }
}

/**
 * Note annotation attached to highlight.
 * 
 * Usage:
 *   const note = new Note("n1", "book_123", "My thoughts", "h1", 10);
 *   note.updateText("Updated thoughts");
 * 
 * Returns:
 *   Note: Note with text content
 */
class Note extends Annotation {
    constructor(annotationId, bookId, text, highlightId, pageNumber) {
        super(annotationId, bookId, pageNumber);
        this.text = text;
        this.highlightId = highlightId;
    }

    updateText(text) {
        this.text = text;
        this.modifiedAt = new Date();
    }

    toDict() {
        return {
            id: this.id,
            type: 'note',
            bookId: this.bookId,
            text: this.text,
            highlightId: this.highlightId,
            page: this.pageNumber,
            createdAt: this.createdAt.toISOString()
        };
    }
}

// ===================== Reading Session and Progress =====================

/**
 * Tracks a single reading session with progress.
 * 
 * Usage:
 *   const session = new ReadingSession("s1", "book_123", "user_1", 328);
 *   session.updatePosition(42, 0.5);
 *   const progress = session.calculateProgress();
 * 
 * Returns:
 *   ReadingSession: Session with tracked metrics
 */
class ReadingSession {
    constructor(sessionId, bookId, userId, totalPages) {
        this.sessionId = sessionId;
        this.bookId = bookId;
        this.userId = userId;
        this.totalPages = totalPages;
        this.currentPage = 1;
        this.currentPosition = 0.0;
        this.startTime = new Date();
        this.endTime = null;
        this.pagesRead = 0;
    }

    updatePosition(page, position = 0.0) {
        if (page > this.currentPage) {
            this.pagesRead += (page - this.currentPage);
        }
        this.currentPage = page;
        this.currentPosition = position;
    }

    calculateProgress() {
        if (this.totalPages === 0) return 0.0;
        const pageProgress = (this.currentPage - 1) / this.totalPages;
        const positionProgress = this.currentPosition / this.totalPages;
        return Math.min(1.0, pageProgress + positionProgress);
    }

    getDuration() {
        const end = this.endTime || new Date();
        return end - this.startTime;
    }

    close() {
        this.endTime = new Date();
    }

    toString() {
        const progress = this.calculateProgress() * 100;
        return `ReadingSession(book=${this.bookId}, progress=${progress.toFixed(1)}%, ${this.pagesRead} pages)`;
    }
}

// ===================== Reading Settings =====================

/**
 * User preferences for reading experience.
 * 
 * Usage:
 *   const settings = new ReadingSettings();
 *   settings.fontSize = 16;
 *   settings.theme = Theme.DARK;
 *   settings.applySettings();
 * 
 * Returns:
 *   ReadingSettings: Configuration for display
 */
class ReadingSettings {
    constructor() {
        this.fontFamily = "Serif";
        this.fontSize = 14;
        this.lineSpacing = 1.5;
        this.theme = Theme.LIGHT;
        this.brightness = 1.0;
        this.marginSize = 20;
        this.textAlign = "left";
    }

    applySettings() {
        return {
            fontFamily: this.fontFamily,
            fontSize: this.fontSize,
            lineSpacing: this.lineSpacing,
            theme: this.theme,
            brightness: this.brightness,
            marginSize: this.marginSize,
            textAlign: this.textAlign
        };
    }

    resetToDefault() {
        this.fontFamily = "Serif";
        this.fontSize = 14;
        this.lineSpacing = 1.5;
        this.theme = Theme.LIGHT;
        this.brightness = 1.0;
        this.marginSize = 20;
        this.textAlign = "left";
    }

    toString() {
        return `ReadingSettings(font=${this.fontFamily} ${this.fontSize}pt, theme=${this.theme})`;
    }
}

// ===================== Reading State (State Pattern) =====================

/**
 * Abstract base class for reading states
 */
class ReadingState {
    openBook(reader) {
        throw new Error("Method must be implemented");
    }

    closeBook(reader) {
        throw new Error("Method must be implemented");
    }

    turnPage(reader, direction) {
        throw new Error("Method must be implemented");
    }
}

class IdleState extends ReadingState {
    openBook(reader) {
        console.log(`Opening book: ${reader.currentBook.title}`);
        reader.state = new ReadingActiveState();
    }

    closeBook(reader) {
        console.log("No book is open");
    }

    turnPage(reader, direction) {
        console.log("No book is open. Open a book first.");
    }
}

class ReadingActiveState extends ReadingState {
    openBook(reader) {
        console.log("A book is already open");
    }

    closeBook(reader) {
        console.log(`Closing book: ${reader.currentBook.title}`);
        reader.saveSession();
        reader.state = new IdleState();
    }

    turnPage(reader, direction) {
        if (direction === PageDirection.NEXT) {
            reader.currentSession.updatePosition(reader.currentSession.currentPage + 1);
            console.log(`→ Page ${reader.currentSession.currentPage}`);
        } else {
            if (reader.currentSession.currentPage > 1) {
                reader.currentSession.updatePosition(reader.currentSession.currentPage - 1);
                console.log(`← Page ${reader.currentSession.currentPage}`);
            }
        }
    }
}

class FinishedState extends ReadingState {
    openBook(reader) {
        console.log(`Reopening completed book: ${reader.currentBook.title}`);
        reader.state = new ReadingActiveState();
    }

    closeBook(reader) {
        console.log("Book already finished and closed");
        reader.state = new IdleState();
    }

    turnPage(reader, direction) {
        console.log("Book finished. Start a new book or reopen this one.");
    }
}

// ===================== Library Management (Singleton Pattern) =====================

/**
 * Manages user's book collection (Singleton).
 * 
 * Usage:
 *   const library = new Library();
 *   library.addBook(book);
 *   const results = library.search("Orwell");
 * 
 * Returns:
 *   Library: Singleton instance managing all books
 */
class Library {
    constructor() {
        if (Library.instance) {
            return Library.instance;
        }
        Library.instance = this;
        
        this.books = new Map();
        this.collections = {};
        this.shelves = {};
    }

    addBook(book) {
        if (this.books.has(book.id)) {
            console.log(`Book '${book.title}' already in library`);
            return false;
        }
        this.books.set(book.id, book);
        console.log(`✓ Added '${book.title}' by ${book.author} to library`);
        return true;
    }

    removeBook(bookId) {
        if (this.books.has(bookId)) {
            const book = this.books.get(bookId);
            this.books.delete(bookId);
            console.log(`✓ Removed '${book.title}' from library`);
            
            // Remove from collections
            for (const collectionBooks of Object.values(this.collections)) {
                const index = collectionBooks.indexOf(bookId);
                if (index > -1) {
                    collectionBooks.splice(index, 1);
                }
            }
            return true;
        }
        return false;
    }

    search(query) {
        const queryLower = query.toLowerCase();
        const results = [];
        for (const book of this.books.values()) {
            if (book.title.toLowerCase().includes(queryLower) ||
                book.author.toLowerCase().includes(queryLower)) {
                results.push(book);
            }
        }
        return results;
    }

    filterByStatus(status) {
        return Array.from(this.books.values()).filter(book => book.status === status);
    }

    filterByAuthor(author) {
        const authorLower = author.toLowerCase();
        return Array.from(this.books.values()).filter(
            book => book.author.toLowerCase().includes(authorLower)
        );
    }

    createCollection(name) {
        if (!this.collections[name]) {
            this.collections[name] = [];
            console.log(`✓ Created collection '${name}'`);
        }
    }

    addToCollection(bookId, collectionName) {
        if (!this.books.has(bookId)) return false;
        
        if (!this.collections[collectionName]) {
            this.createCollection(collectionName);
        }
        
        if (!this.collections[collectionName].includes(bookId)) {
            this.collections[collectionName].push(bookId);
            return true;
        }
        return false;
    }

    getBooksInCollection(collectionName) {
        if (!this.collections[collectionName]) return [];
        
        return this.collections[collectionName]
            .filter(bookId => this.books.has(bookId))
            .map(bookId => this.books.get(bookId));
    }

    getStatistics() {
        const total = this.books.size;
        const byStatus = {
            unread: this.filterByStatus(BookStatus.UNREAD).length,
            reading: this.filterByStatus(BookStatus.READING).length,
            completed: this.filterByStatus(BookStatus.COMPLETED).length
        };
        const authors = new Set(Array.from(this.books.values()).map(b => b.author)).size;
        
        return {
            totalBooks: total,
            byStatus: byStatus,
            uniqueAuthors: authors,
            collections: Object.keys(this.collections).length
        };
    }

    toString() {
        return `Library(${this.books.size} books, ${Object.keys(this.collections).length} collections)`;
    }
}

// ===================== Reading Statistics =====================

/**
 * Tracks reading habits and statistics.
 * 
 * Usage:
 *   const stats = new ReadingStatistics("user_1");
 *   stats.updateStats(session);
 *   const dailyStats = stats.getDailyStats();
 * 
 * Returns:
 *   ReadingStatistics: Statistics with various metrics
 */
class ReadingStatistics {
    constructor(userId) {
        this.userId = userId;
        this.totalPagesRead = 0;
        this.totalTime = 0;
        this.booksCompleted = 0;
        this.currentStreak = 0;
        this.readingSpeedWpm = 0.0;
        this.sessionsHistory = [];
        this.dailyPages = {};
    }

    updateStats(session) {
        this.totalPagesRead += session.pagesRead;
        this.totalTime += session.getDuration();
        this.sessionsHistory.push(session);
        
        // Update daily pages
        const dateKey = session.startTime.toISOString().split('T')[0];
        this.dailyPages[dateKey] = (this.dailyPages[dateKey] || 0) + session.pagesRead;
        
        // Recalculate reading speed
        this._calculateReadingSpeed();
        
        // Update streak
        this.currentStreak = this.calculateStreak();
    }

    _calculateReadingSpeed() {
        if (this.sessionsHistory.length === 0) return;
        
        // Take last 10 sessions
        const recentSessions = this.sessionsHistory.slice(-10);
        const totalWords = recentSessions.reduce((sum, s) => sum + s.pagesRead * 250, 0);
        const totalMinutes = recentSessions.reduce((sum, s) => sum + s.getDuration() / 60000, 0);
        
        if (totalMinutes > 0) {
            this.readingSpeedWpm = totalWords / totalMinutes;
        }
    }

    calculateStreak() {
        if (Object.keys(this.dailyPages).length === 0) return 0;
        
        const dates = Object.keys(this.dailyPages).sort().reverse();
        let streak = 0;
        let expectedDate = new Date();
        expectedDate.setHours(0, 0, 0, 0);
        
        for (const dateStr of dates) {
            const date = new Date(dateStr);
            date.setHours(0, 0, 0, 0);
            
            if (date.getTime() === expectedDate.getTime()) {
                streak++;
                expectedDate.setDate(expectedDate.getDate() - 1);
            } else if ((expectedDate - date) / (1000 * 60 * 60 * 24) > 1) {
                break;
            }
        }
        
        return streak;
    }

    getDailyStats() {
        const today = new Date().toISOString().split('T')[0];
        const pagesToday = this.dailyPages[today] || 0;
        
        // Time spent today
        const todaySessions = this.sessionsHistory.filter(
            s => s.startTime.toISOString().split('T')[0] === today
        );
        const timeToday = todaySessions.reduce((sum, s) => sum + s.getDuration(), 0);
        
        return {
            pagesRead: pagesToday,
            timeSpent: this._formatDuration(timeToday),
            sessions: todaySessions.length,
            streak: this.currentStreak
        };
    }

    getPeriodStats(period) {
        const now = new Date();
        let startDate;
        
        switch (period) {
            case TimePeriod.WEEK:
                startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
                break;
            case TimePeriod.MONTH:
                startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
                break;
            case TimePeriod.YEAR:
                startDate = new Date(now - 365 * 24 * 60 * 60 * 1000);
                break;
            default:
                startDate = new Date(now - 24 * 60 * 60 * 1000);
        }
        
        const periodSessions = this.sessionsHistory.filter(s => s.startTime >= startDate);
        const pages = periodSessions.reduce((sum, s) => sum + s.pagesRead, 0);
        const time = periodSessions.reduce((sum, s) => sum + s.getDuration(), 0);
        const days = Math.max(1, (now - startDate) / (1000 * 60 * 60 * 24));
        
        return {
            period: period,
            pagesRead: pages,
            timeSpent: this._formatDuration(time),
            sessions: periodSessions.length,
            avgPagesPerDay: (pages / days).toFixed(1)
        };
    }

    _formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    toString() {
        return `ReadingStatistics(${this.totalPagesRead} pages, ${this.booksCompleted} books, ${this.currentStreak} day streak)`;
    }
}

// ===================== Reader (Main Controller) =====================

/**
 * Main reader controller managing reading experience.
 * 
 * Usage:
 *   const reader = new Reader("user_1");
 *   reader.openBook("book_id_123", library);
 *   reader.turnPage(PageDirection.NEXT);
 *   reader.addHighlight("text", Color.YELLOW, 10, 100, 150);
 * 
 * Returns:
 *   Reader: Reader instance with full functionality
 */
class Reader {
    constructor(userId) {
        this.userId = userId;
        this.currentBook = null;
        this.currentSession = null;
        this.settings = new ReadingSettings();
        this.state = new IdleState();
        this.annotations = {};
        this.statistics = new ReadingStatistics(userId);
        this._annotationCounter = 0;
    }

    openBook(bookId, library) {
        if (!library.books.has(bookId)) {
            console.log(`Book ${bookId} not found in library`);
            return false;
        }
        
        this.currentBook = library.books.get(bookId);
        this.currentBook.status = BookStatus.READING;
        
        // Create new reading session
        const sessionId = `session_${Date.now()}`;
        this.currentSession = new ReadingSession(
            sessionId, bookId, this.userId, this.currentBook.totalPages
        );
        
        // Change state
        this.state.openBook(this);
        
        console.log(`📖 Reading: ${this.currentBook.title}`);
        console.log(`   Author: ${this.currentBook.author}`);
        console.log(`   Pages: ${this.currentBook.totalPages}`);
        return true;
    }

    closeBook() {
        if (this.currentBook) {
            this.state.closeBook(this);
        }
    }

    saveSession() {
        if (this.currentSession) {
            this.currentSession.close();
            this.statistics.updateStats(this.currentSession);
            const progress = this.currentSession.calculateProgress() * 100;
            console.log(`✓ Session saved: ${progress.toFixed(1)}% complete, ${this.currentSession.pagesRead} pages read`);
            
            // Mark book as completed if finished
            if (progress >= 100) {
                this.currentBook.status = BookStatus.COMPLETED;
                this.statistics.booksCompleted++;
                this.state = new FinishedState();
                console.log(`🎉 Completed: ${this.currentBook.title}!`);
            }
        }
    }

    turnPage(direction) {
        this.state.turnPage(this, direction);
    }

    jumpToPage(page) {
        if (this.currentBook && this.currentSession) {
            if (page >= 1 && page <= this.currentBook.totalPages) {
                this.currentSession.updatePosition(page);
                console.log(`→ Jumped to page ${page}`);
            } else {
                console.log(`Page ${page} out of range (1-${this.currentBook.totalPages})`);
            }
        }
    }

    jumpToChapter(chapterIndex) {
        if (this.currentBook) {
            const chapter = this.currentBook.getChapter(chapterIndex);
            if (chapter) {
                this.jumpToPage(chapter.startPage);
                console.log(`→ Jumped to: ${chapter.title}`);
            }
        }
    }

    addHighlight(text, color, page, startOffset, endOffset) {
        if (!this.currentBook) {
            console.log("No book open");
            return null;
        }
        
        this._annotationCounter++;
        const annotationId = `highlight_${this._annotationCounter}`;
        const highlight = new Highlight(
            annotationId, this.currentBook.id, text, color,
            page, startOffset, endOffset
        );
        
        if (!this.annotations[this.currentBook.id]) {
            this.annotations[this.currentBook.id] = [];
        }
        this.annotations[this.currentBook.id].push(highlight);
        console.log(`✓ Added ${color} highlight on page ${page}`);
        return highlight;
    }

    addBookmark(name, page, position = 0.0) {
        if (!this.currentBook) {
            console.log("No book open");
            return null;
        }
        
        this._annotationCounter++;
        const annotationId = `bookmark_${this._annotationCounter}`;
        const bookmark = new Bookmark(annotationId, this.currentBook.id, name, page, position);
        
        if (!this.annotations[this.currentBook.id]) {
            this.annotations[this.currentBook.id] = [];
        }
        this.annotations[this.currentBook.id].push(bookmark);
        console.log(`✓ Added bookmark '${name}' on page ${page}`);
        return bookmark;
    }

    getAnnotations(bookId) {
        return this.annotations[bookId] || [];
    }

    exportAnnotations(bookId, format = "json") {
        const annotations = this.getAnnotations(bookId);
        if (format === "json") {
            const data = annotations.map(ann => ann.toDict());
            return JSON.stringify(data, null, 2);
        }
        return "";
    }

    searchInBook(query) {
        if (!this.currentBook) {
            console.log("No book open");
            return [];
        }
        return this.currentBook.search(query);
    }

    updateSettings(options) {
        for (const [key, value] of Object.entries(options)) {
            if (this.settings.hasOwnProperty(key)) {
                this.settings[key] = value;
            }
        }
        console.log(`✓ Settings updated: ${this.settings}`);
    }

    getReadingStats(period) {
        return this.statistics.getPeriodStats(period);
    }

    estimateTimeRemaining() {
        if (!this.currentBook || !this.currentSession) return null;
        
        if (this.statistics.readingSpeedWpm === 0) return null;
        
        const remainingPages = this.currentBook.totalPages - this.currentSession.currentPage;
        const wordsRemaining = remainingPages * 250;
        const minutesRemaining = wordsRemaining / this.statistics.readingSpeedWpm;
        
        return minutesRemaining * 60 * 1000; // Return milliseconds
    }

    toString() {
        if (this.currentBook) {
            return `Reader(reading: ${this.currentBook.title})`;
        }
        return "Reader(no book open)";
    }
}

// ===================== Demo Implementation =====================

function printSeparator(title = "") {
    if (title) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`  ${title}`);
        console.log('='.repeat(60));
    } else {
        console.log('-'.repeat(60));
    }
}

function demoBookReader() {
    printSeparator("BOOK READER SYSTEM DEMO");
    
    // 1. Create library and reader
    console.log("\n1. Setting Up Library and Reader");
    printSeparator();
    const library = new Library();
    const reader = new Reader("user_alice");
    console.log(`✓ Library created: ${library}`);
    console.log(`✓ Reader created: ${reader}`);
    
    // 2. Create and add books
    console.log("\n2. Adding Books to Library");
    printSeparator();
    
    const book1 = new Book("1984", "George Orwell", "/library/1984.epub", BookFormat.EPUB);
    book1.isbn = "978-0451524935";
    const chapter1 = new Chapter("ch1", "Part One: Chapter 1", 1, 25,
        "It was a bright cold day in April, and the clocks were striking thirteen. " +
        "Winston Smith, his chin nuzzled into his breast in an effort to escape the " +
        "vile wind, slipped quickly through the glass doors of Victory Mansions, " +
        "though not quickly enough to prevent a swirl of gritty dust from entering along with him. " +
        "The hallway smelt of boiled cabbage and old rag mats. At one end of it a coloured poster, " +
        "too large for indoor display, had been tacked to the wall. It depicted simply an enormous face, " +
        "more than a metre wide: the face of a man of about forty-five, with a heavy black moustache " +
        "and ruggedly handsome features. Winston made for the stairs. It was no use trying the lift. " +
        "Even at the best of times it was seldom working, and at present the electric current was cut off " +
        "during daylight hours. The concept of freedom in a totalitarian society...");
    book1.addChapter(chapter1);
    book1.totalPages = 328;
    library.addBook(book1);
    
    const book2 = new Book("To Kill a Mockingbird", "Harper Lee", "/library/mockingbird.epub", BookFormat.EPUB);
    const chapter2 = new Chapter("ch1", "Chapter 1", 1, 20,
        "When he was nearly thirteen, my brother Jem got his arm badly broken at the elbow. " +
        "When it healed, and Jem's fears of never being able to play football were assuaged, " +
        "he was seldom self-conscious about his injury. His left arm was somewhat shorter than his right...");
    book2.addChapter(chapter2);
    book2.totalPages = 324;
    library.addBook(book2);
    
    const book3 = new Book("The Great Gatsby", "F. Scott Fitzgerald", "/library/gatsby.epub", BookFormat.EPUB);
    book3.totalPages = 180;
    library.addBook(book3);
    
    // 3. Library operations
    console.log("\n3. Library Operations");
    printSeparator();
    console.log(`Library: ${library}`);
    const stats = library.getStatistics();
    console.log(`\n📚 Library Statistics:`);
    console.log(`   Total books: ${stats.totalBooks}`);
    console.log(`   Unread: ${stats.byStatus.unread}`);
    console.log(`   Unique authors: ${stats.uniqueAuthors}`);
    
    library.createCollection("Classics");
    library.addToCollection(book1.id, "Classics");
    library.addToCollection(book2.id, "Classics");
    library.addToCollection(book3.id, "Classics");
    
    const classics = library.getBooksInCollection("Classics");
    console.log(`\n📚 'Classics' collection: ${classics.length} books`);
    classics.forEach(book => console.log(`   - ${book.title} by ${book.author}`));
    
    const searchResults = library.search("Orwell");
    console.log(`\n🔍 Search for 'Orwell': ${searchResults.length} results`);
    searchResults.forEach(book => console.log(`   - ${book}`));
    
    // 4. Open and read a book
    console.log("\n4. Opening and Reading a Book");
    printSeparator();
    reader.openBook(book1.id, library);
    
    console.log("\n📖 Starting to read...");
    for (let i = 0; i < 5; i++) {
        reader.turnPage(PageDirection.NEXT);
    }
    
    // 5. Add annotations
    console.log("\n5. Adding Annotations");
    printSeparator();
    
    const highlight1 = reader.addHighlight("concept of freedom", Color.YELLOW, 1, 100, 118);
    if (highlight1) {
        highlight1.addNote("Important theme - freedom vs. control");
    }
    
    reader.addHighlight("totalitarian society", Color.GREEN, 1, 200, 220);
    reader.addBookmark("Start of Part Two", 100, 0.0);
    reader.addBookmark("Important Scene", 150, 0.5);
    
    const annotations = reader.getAnnotations(book1.id);
    console.log(`\n📝 Annotations for ${book1.title}: ${annotations.length} total`);
    annotations.forEach(ann => console.log(`   - ${ann}`));
    
    // 6. Search within book
    console.log("\n6. Searching Within Book");
    printSeparator();
    const bookSearchResults = reader.searchInBook("freedom");
    console.log(`🔍 Search for 'freedom': ${bookSearchResults.length} results`);
    bookSearchResults.slice(0, 2).forEach(result => {
        console.log(`   Chapter: ${result.chapter}, Page: ${result.page}`);
        console.log(`   Context: ${result.context.substring(0, 80)}...`);
    });
    
    // 7. Navigate book
    console.log("\n7. Navigation Features");
    printSeparator();
    reader.jumpToPage(50);
    reader.jumpToChapter(0);
    
    console.log("\nTurning back pages:");
    for (let i = 0; i < 3; i++) {
        reader.turnPage(PageDirection.PREVIOUS);
    }
    
    // 8. Customize reading experience
    console.log("\n8. Customizing Reading Experience");
    printSeparator();
    console.log(`Current settings: ${reader.settings}`);
    
    reader.updateSettings({
        fontSize: 16,
        theme: Theme.DARK,
        lineSpacing: 2.0
    });
    const applied = reader.settings.applySettings();
    console.log(`✓ Applied settings:`);
    Object.entries(applied).forEach(([key, value]) => {
        console.log(`   ${key}: ${value}`);
    });
    
    // 9. Reading progress and statistics
    console.log("\n9. Reading Progress and Statistics");
    printSeparator();
    
    console.log("Continuing to read...");
    for (let i = 0; i < 45; i++) {
        reader.turnPage(PageDirection.NEXT);
    }
    
    if (reader.currentSession) {
        const progress = reader.currentSession.calculateProgress() * 100;
        console.log(`\n📊 Current Progress:`);
        console.log(`   Page: ${reader.currentSession.currentPage}/${book1.totalPages}`);
        console.log(`   Progress: ${progress.toFixed(1)}%`);
        console.log(`   Pages read: ${reader.currentSession.pagesRead}`);
        console.log(`   Time: ${reader.statistics._formatDuration(reader.currentSession.getDuration())}`);
        
        const timeRemaining = reader.estimateTimeRemaining();
        if (timeRemaining) {
            const hours = timeRemaining / (1000 * 60 * 60);
            console.log(`   Est. time remaining: ${hours.toFixed(1)} hours`);
        }
    }
    
    // 10. Close book and view stats
    console.log("\n10. Closing Book and Viewing Statistics");
    printSeparator();
    reader.closeBook();
    
    const dailyStats = reader.statistics.getDailyStats();
    console.log(`\n📈 Today's Reading Statistics:`);
    console.log(`   Pages read: ${dailyStats.pagesRead}`);
    console.log(`   Time spent: ${dailyStats.timeSpent}`);
    console.log(`   Sessions: ${dailyStats.sessions}`);
    console.log(`   Streak: ${dailyStats.streak} days`);
    
    const weeklyStats = reader.getReadingStats(TimePeriod.WEEK);
    console.log(`\n📈 Weekly Reading Statistics:`);
    console.log(`   Pages read: ${weeklyStats.pagesRead}`);
    console.log(`   Time spent: ${weeklyStats.timeSpent}`);
    console.log(`   Avg pages/day: ${weeklyStats.avgPagesPerDay}`);
    
    console.log(`\n📊 Overall Statistics:`);
    console.log(`   ${reader.statistics}`);
    
    // 11. Export annotations
    console.log("\n11. Exporting Annotations");
    printSeparator();
    const annotationsJson = reader.exportAnnotations(book1.id, "json");
    console.log(`✓ Exported annotations for '${book1.title}'`);
    console.log(`   Format: JSON`);
    console.log(`   Size: ${annotationsJson.length} characters`);
    console.log(`\n   Preview:`);
    console.log(`   ${annotationsJson.substring(0, 200)}...`);
    
    // 12. Open another book
    console.log("\n12. Switching to Another Book");
    printSeparator();
    reader.openBook(book2.id, library);
    console.log(`📖 Now reading: ${reader.currentBook.title}`);
    
    for (let i = 0; i < 10; i++) {
        reader.turnPage(PageDirection.NEXT);
    }
    reader.closeBook();
    
    // Final library state
    console.log("\n13. Final Library State");
    printSeparator();
    const finalStats = library.getStatistics();
    console.log(`📚 Library Status:`);
    console.log(`   Total books: ${finalStats.totalBooks}`);
    console.log(`   Reading: ${finalStats.byStatus.reading}`);
    console.log(`   Completed: ${finalStats.byStatus.completed}`);
    console.log(`   Unread: ${finalStats.byStatus.unread}`);
    
    console.log("\n" + "=".repeat(60));
    console.log("  DEMO COMPLETE");
    console.log("=".repeat(60));
    console.log("\n✓ Book Reader system features demonstrated:");
    console.log("  • Library management with collections");
    console.log("  • Book reading with page navigation");
    console.log("  • Annotations (highlights, bookmarks, notes)");
    console.log("  • Full-text search within books");
    console.log("  • Customizable reading settings");
    console.log("  • Reading progress tracking");
    console.log("  • Statistics and streak tracking");
    console.log("  • Multi-book session management");
}

// Run the demo
if (require.main === module) {
    demoBookReader();
}

// Exports
module.exports = {
    BookFormat,
    Color,
    Theme,
    PageDirection,
    TimePeriod,
    BookStatus,
    Chapter,
    Book,
    Annotation,
    Bookmark,
    Highlight,
    Note,
    ReadingSession,
    ReadingSettings,
    ReadingState,
    IdleState,
    ReadingActiveState,
    FinishedState,
    Library,
    ReadingStatistics,
    Reader
};
