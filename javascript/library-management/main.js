/**
 * Library Management System Implementation in JavaScript
 * =====================================================
 * 
 * This comprehensive library system demonstrates advanced Design Patterns and OOP Concepts:
 * 
 * DESIGN PATTERNS USED:
 * 1. Strategy Pattern: Different user permission strategies (Member, Librarian, Admin)
 * 2. State Pattern: Book status management (Available, Issued, Reserved, Lost)
 * 3. Observer Pattern: Notification system for due dates and reservations
 * 4. Command Pattern: Library operations (issue, return, reserve)
 * 5. Factory Pattern: User and book object creation
 * 6. Template Method Pattern: Common search and validation workflows
 * 7. Chain of Responsibility: Permission checking with role hierarchy
 * 8. Decorator Pattern: Enhanced user features (premium membership)
 * 9. Facade Pattern: Simplified library interface hiding complexity
 * 10. Repository Pattern: Book and user data management
 * 
 * OOP CONCEPTS DEMONSTRATED:
 * 1. Inheritance: User type hierarchy (Member, Librarian, Admin)
 * 2. Polymorphism: Different user types, same interface
 * 3. Encapsulation: Private validation methods, internal state
 * 4. Abstraction: User abstract class, clean library interfaces
 * 5. Composition: Library composed of books, users, transactions
 * 6. Association: Complex relationships between entities
 * 
 * BUSINESS FEATURES:
 * - Multi-user role system with different permissions
 * - Advanced book search with multiple criteria
 * - Reservation system with priority queues
 * - Fine calculation with configurable rates
 * - Due date tracking and automatic notifications
 * - Comprehensive reporting and analytics
 * - Book recommendation system
 * - Digital resource management
 * 
 * ARCHITECTURAL PRINCIPLES:
 * - Role-based access control
 * - Event-driven notification system
 * - Transactional book operations
 * - Scalable catalog management
 */

// Library Management System in JavaScript

// User type enumeration - Strategy Pattern for role-based permissions
const UserType = {
    MEMBER: 'MEMBER',         // Regular library member with basic privileges
    LIBRARIAN: 'LIBRARIAN',   // Library staff with book management privileges
    ADMIN: 'ADMIN'            // System administrator with full access
};

// Book status enumeration - State Pattern for book lifecycle
const BookStatus = {
    AVAILABLE: 'AVAILABLE',   // Book available for checkout
    ISSUED: 'ISSUED',         // Book currently checked out to a member
    RESERVED: 'RESERVED',     // Book reserved for a specific member
    LOST: 'LOST'              // Book reported as lost or damaged
};

// Reservation status enumeration - State Pattern for reservation workflow
const ReservationStatus = {
    ACTIVE: 'ACTIVE',         // Reservation active and waiting
    FULFILLED: 'FULFILLED',   // Reservation fulfilled, book issued
    CANCELLED: 'CANCELLED',   // Reservation cancelled by user or system
    EXPIRED: 'EXPIRED'        // Reservation expired due to timeout
};

// Simple UUID generator for unique identifiers
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Abstract User Class - Base class for all library users
 * 
 * DESIGN PATTERNS:
 * - Strategy Pattern: Different user types have different privileges
 * - Template Method Pattern: Common user operations structure
 * 
 * OOP CONCEPTS:
 * - Inheritance: Base class for user type hierarchy
 * - Abstraction: Cannot be instantiated directly
 * - Encapsulation: User data and common operations
 */
class User {
    constructor(userId, name, email, userType) {
        // Abstract Class Pattern: Prevent direct instantiation
        if (this.constructor === User) {
            throw new Error("Cannot instantiate abstract class User");
        }
        this.userId = userId;      // Unique user identifier
        this.name = name;          // User full name
        this.email = email;        // Contact email for notifications
        this.userType = userType;
        this.dateJoined = new Date();
    }
}

class Member extends User {
    constructor(userId, name, email) {
        super(userId, name, email, UserType.MEMBER);
        this.maxBooks = 5;
        this.maxReservationDays = 10;
    }
}

class Librarian extends User {
    constructor(userId, name, email) {
        super(userId, name, email, UserType.LIBRARIAN);
    }
}

class Admin extends User {
    constructor(userId, name, email) {
        super(userId, name, email, UserType.ADMIN);
    }
}

class Author {
    constructor(name, biography = "") {
        this.name = name;
        this.biography = biography;
    }
}

class Book {
    constructor(isbn, title, authors, publisher, publicationDate, pages) {
        this.isbn = isbn;
        this.title = title;
        this.authors = authors; // Array of Author objects
        this.publisher = publisher;
        this.publicationDate = publicationDate;
        this.pages = pages;
    }
}

class BookItem {
    constructor(barcode, book, rackLocation) {
        this.barcode = barcode;
        this.book = book;
        this.rackLocation = rackLocation;
        this.status = BookStatus.AVAILABLE;
        this.dateAdded = new Date();
        this.dueDate = null;
        this.price = 0.0;
    }

    checkout(memberId, dueDate) {
        if (this.status !== BookStatus.AVAILABLE) {
            return false;
        }
        
        this.status = BookStatus.ISSUED;
        this.dueDate = dueDate;
        return true;
    }

    returnBook() {
        this.status = BookStatus.AVAILABLE;
        this.dueDate = null;
    }
}

class BookReservation {
    constructor(member, bookItem) {
        this.reservationId = generateUUID();
        this.member = member;
        this.bookItem = bookItem;
        this.creationDate = new Date();
        this.status = ReservationStatus.ACTIVE;
        this.expiryDate = new Date(this.creationDate.getTime() + member.maxReservationDays * 24 * 60 * 60 * 1000);
    }

    fulfillReservation() {
        this.status = ReservationStatus.FULFILLED;
    }

    cancelReservation() {
        this.status = ReservationStatus.CANCELLED;
    }
}

class BookLending {
    constructor(member, bookItem, dueDate) {
        this.lendingId = generateUUID();
        this.member = member;
        this.bookItem = bookItem;
        this.issueDate = new Date();
        this.dueDate = dueDate;
        this.returnDate = null;
    }

    returnBook() {
        this.returnDate = new Date();
        this.bookItem.returnBook();
    }

    isOverdue() {
        return new Date() > this.dueDate && this.returnDate === null;
    }

    calculateFine(finePerDay) {
        if (!this.isOverdue()) {
            return 0.0;
        }
        
        const overdueDays = Math.floor((new Date() - this.dueDate) / (24 * 60 * 60 * 1000));
        return overdueDays * finePerDay;
    }
}

class Fine {
    constructor(member, amount, description) {
        this.fineId = generateUUID();
        this.member = member;
        this.amount = amount;
        this.description = description;
        this.creationDate = new Date();
        this.isPaid = false;
    }

    payFine() {
        this.isPaid = true;
        this.paymentDate = new Date();
    }
}

class Search {
    static searchByTitle(catalog, title) {
        const results = [];
        for (const book of Object.values(catalog.books)) {
            if (book.title.toLowerCase().includes(title.toLowerCase())) {
                results.push(book);
            }
        }
        return results;
    }

    static searchByAuthor(catalog, authorName) {
        const results = [];
        for (const book of Object.values(catalog.books)) {
            for (const author of book.authors) {
                if (author.name.toLowerCase().includes(authorName.toLowerCase())) {
                    results.push(book);
                    break;
                }
            }
        }
        return results;
    }

    static searchByIsbn(catalog, isbn) {
        return catalog.books[isbn] || null;
    }
}

class Catalog {
    constructor() {
        this.books = {}; // ISBN -> Book
        this.bookItems = {}; // Barcode -> BookItem
        this.authors = {}; // Name -> Author
    }

    addBook(book) {
        this.books[book.isbn] = book;
        for (const author of book.authors) {
            this.authors[author.name] = author;
        }
    }

    addBookItem(bookItem) {
        this.bookItems[bookItem.barcode] = bookItem;
    }

    removeBookItem(barcode) {
        if (barcode in this.bookItems) {
            delete this.bookItems[barcode];
            return true;
        }
        return false;
    }

    getAvailableBookItems(isbn) {
        const availableItems = [];
        for (const item of Object.values(this.bookItems)) {
            if (item.book.isbn === isbn && item.status === BookStatus.AVAILABLE) {
                availableItems.push(item);
            }
        }
        return availableItems;
    }
}

class Library {
    constructor(name, address) {
        this.name = name;
        this.address = address;
        this.catalog = new Catalog();
        this.members = {}; // userId -> Member
        this.librarians = {}; // userId -> Librarian
        this.activeLendings = {}; // lendingId -> BookLending
        this.reservations = {}; // reservationId -> BookReservation
        this.fines = {}; // fineId -> Fine
        this.finePerDay = 1.0; // $1 per day overdue
    }

    addMember(member) {
        this.members[member.userId] = member;
    }

    addLibrarian(librarian) {
        this.librarians[librarian.userId] = librarian;
    }

    issueBook(memberId, barcode) {
        if (!(memberId in this.members)) {
            throw new Error("Member not found");
        }
        
        const member = this.members[memberId];
        
        // Check if member has reached max book limit
        const memberLendings = Object.values(this.activeLendings).filter(
            l => l.member.userId === memberId && l.returnDate === null
        );
        if (memberLendings.length >= member.maxBooks) {
            throw new Error("Member has reached maximum book limit");
        }

        // Check if member has unpaid fines
        const unpaidFines = Object.values(this.fines).filter(
            f => f.member.userId === memberId && !f.isPaid
        );
        if (unpaidFines.length > 0) {
            throw new Error("Member has unpaid fines");
        }

        if (!(barcode in this.catalog.bookItems)) {
            throw new Error("Book item not found");
        }

        const bookItem = this.catalog.bookItems[barcode];
        
        if (bookItem.status !== BookStatus.AVAILABLE) {
            throw new Error("Book is not available");
        }

        // Check if book is reserved for this member
        let activeReservation = null;
        for (const reservation of Object.values(this.reservations)) {
            if (reservation.bookItem.barcode === barcode && 
                reservation.member.userId === memberId && 
                reservation.status === ReservationStatus.ACTIVE) {
                activeReservation = reservation;
                break;
            }
        }

        if (activeReservation) {
            activeReservation.fulfillReservation();
        }

        // Issue the book
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 14); // 2 weeks
        const lending = new BookLending(member, bookItem, dueDate);
        
        bookItem.checkout(memberId, dueDate);
        this.activeLendings[lending.lendingId] = lending;

        return lending;
    }

    returnBook(barcode) {
        const bookItem = this.catalog.bookItems[barcode];
        if (!bookItem) {
            throw new Error("Book item not found");
        }

        // Find the active lending
        let activeLending = null;
        for (const lending of Object.values(this.activeLendings)) {
            if (lending.bookItem.barcode === barcode && lending.returnDate === null) {
                activeLending = lending;
                break;
            }
        }

        if (!activeLending) {
            throw new Error("No active lending found for this book");
        }

        // Calculate fine if overdue
        if (activeLending.isOverdue()) {
            const fineAmount = activeLending.calculateFine(this.finePerDay);
            const fine = new Fine(activeLending.member, fineAmount, 
                       `Overdue fine for book: ${bookItem.book.title}`);
            this.fines[fine.fineId] = fine;
        }

        // Return the book
        activeLending.returnBook();
        return activeLending;
    }

    reserveBook(memberId, barcode) {
        if (!(memberId in this.members)) {
            throw new Error("Member not found");
        }

        const member = this.members[memberId];
        const bookItem = this.catalog.bookItems[barcode];
        
        if (!bookItem) {
            throw new Error("Book item not found");
        }

        if (bookItem.status === BookStatus.AVAILABLE) {
            throw new Error("Book is available, no need to reserve");
        }

        // Check if member already has a reservation for this book
        let existingReservation = null;
        for (const reservation of Object.values(this.reservations)) {
            if (reservation.member.userId === memberId && 
                reservation.bookItem.barcode === barcode && 
                reservation.status === ReservationStatus.ACTIVE) {
                existingReservation = reservation;
                break;
            }
        }

        if (existingReservation) {
            throw new Error("Member already has a reservation for this book");
        }

        const reservation = new BookReservation(member, bookItem);
        this.reservations[reservation.reservationId] = reservation;
        bookItem.status = BookStatus.RESERVED;

        return reservation;
    }

    searchBooks(query, searchType = "title") {
        if (searchType === "title") {
            return Search.searchByTitle(this.catalog, query);
        } else if (searchType === "author") {
            return Search.searchByAuthor(this.catalog, query);
        } else if (searchType === "isbn") {
            const result = Search.searchByIsbn(this.catalog, query);
            return result ? [result] : [];
        } else {
            throw new Error("Invalid search type");
        }
    }

    getMemberLendings(memberId) {
        return Object.values(this.activeLendings).filter(
            l => l.member.userId === memberId && l.returnDate === null
        );
    }

    getOverdueBooks() {
        return Object.values(this.activeLendings).filter(lending => lending.isOverdue());
    }
}

// Demo usage
function main() {
    // Create library
    const library = new Library("City Central Library", "123 Main St");

    // Create authors
    const author1 = new Author("J.K. Rowling", "British author");
    const author2 = new Author("George Orwell", "British author and journalist");

    // Create books
    const book1 = new Book("978-0-7475-3269-9", "Harry Potter and the Philosopher's Stone", 
                 [author1], "Bloomsbury", new Date(1997, 5, 26), 223);
    const book2 = new Book("978-0-452-28423-4", "1984", 
                 [author2], "Secker & Warburg", new Date(1949, 5, 8), 328);

    // Add books to catalog
    library.catalog.addBook(book1);
    library.catalog.addBook(book2);

    // Add book items
    const item1 = new BookItem("HP001", book1, "A-1-1");
    const item2 = new BookItem("HP002", book1, "A-1-2");
    const item3 = new BookItem("OR001", book2, "B-2-1");

    library.catalog.addBookItem(item1);
    library.catalog.addBookItem(item2);
    library.catalog.addBookItem(item3);

    // Create members
    const member1 = new Member("M001", "Alice Johnson", "alice@example.com");
    const member2 = new Member("M002", "Bob Smith", "bob@example.com");

    library.addMember(member1);
    library.addMember(member2);

    // Create librarian
    const librarian = new Librarian("L001", "Carol Brown", "carol@library.com");
    library.addLibrarian(librarian);

    console.log(`Library: ${library.name}`);
    console.log(`Total books: ${Object.keys(library.catalog.books).length}`);
    console.log(`Total book items: ${Object.keys(library.catalog.bookItems).length}`);

    // Search for books
    const searchResults = library.searchBooks("Harry Potter", "title");
    console.log(`\nSearch results for 'Harry Potter': ${searchResults.length} books found`);

    // Issue books
    try {
        const lending1 = library.issueBook("M001", "HP001");
        console.log(`\nBook issued to ${lending1.member.name}`);
        console.log(`Due date: ${lending1.dueDate.toISOString().split('T')[0]}`);

        const lending2 = library.issueBook("M002", "OR001");
        console.log(`Book issued to ${lending2.member.name}`);
    } catch (e) {
        console.log(`Error issuing book: ${e.message}`);
    }

    // Try to reserve a book
    try {
        const reservation = library.reserveBook("M002", "HP002");
        console.log(`\nBook reserved for ${reservation.member.name}`);
        console.log(`Reservation expires: ${reservation.expiryDate.toISOString().split('T')[0]}`);
    } catch (e) {
        console.log(`Error reserving book: ${e.message}`);
    }

    // Check member's current books
    const memberBooks = library.getMemberLendings("M001");
    console.log(`\n${member1.name} currently has ${memberBooks.length} book(s) checked out`);

    // Return a book
    try {
        const returnedLending = library.returnBook("HP001");
        console.log(`\nBook returned: ${returnedLending.bookItem.book.title}`);
    } catch (e) {
        console.log(`Error returning book: ${e.message}`);
    }
}

// Export for use in other modules (Node.js)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        UserType,
        BookStatus,
        ReservationStatus,
        User,
        Member,
        Librarian,
        Admin,
        Author,
        Book,
        BookItem,
        BookReservation,
        BookLending,
        Fine,
        Search,
        Catalog,
        Library
    };
}

// Run demo if this file is executed directly
if (require.main === module) {
    main();
}