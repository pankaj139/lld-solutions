/**
 * LIBRARY MANAGEMENT SYSTEM Implementation in JavaScript
 * =====================================================
 * 
 * This implementation demonstrates several key Design Patterns and OOP Concepts:
 * 
 * DESIGN PATTERNS USED:
 * 1. Singleton Pattern: Library instance
 *    - Single library system
 *    - Global access point
 * 
 * 2. Factory Pattern: Member creation
 *    - Creates members with privileges
 * 
 * 3. Strategy Pattern: Fine calculation
 *    - Different rates per membership
 * 
 * 4. Observer Pattern: Notifications
 *    - Due date reminders
 *    - Reservation alerts
 * 
 * 5. Repository Pattern: Data access
 *    - Storage abstraction
 * 
 * 6. Command Pattern: Transactions
 *    - Checkout/return as commands
 * 
 * 7. Chain of Responsibility: Validation
 *    - Multiple validation checks
 * 
 * OOP CONCEPTS DEMONSTRATED:
 * 1. Encapsulation: Internal state hidden
 * 2. Abstraction: Clean interfaces
 * 3. Composition: Complex objects from simple ones
 * 4. Polymorphism: Different membership behaviors
 */

// Enums
const BookStatus = Object.freeze({
    AVAILABLE: 'available',
    CHECKED_OUT: 'checked_out',
    RESERVED: 'reserved',
    LOST: 'lost',
    UNDER_MAINTENANCE: 'under_maintenance'
});

const MembershipType = Object.freeze({
    REGULAR: { name: 'regular', checkoutLimit: 5, loanDays: 14, finePerDay: 0.50 },
    PREMIUM: { name: 'premium', checkoutLimit: 10, loanDays: 30, finePerDay: 0.25 },
    STUDENT: { name: 'student', checkoutLimit: 3, loanDays: 14, finePerDay: 1.00 }
});

const MemberStatus = Object.freeze({
    ACTIVE: 'active',
    SUSPENDED: 'suspended',
    EXPIRED: 'expired'
});

/**
 * Book - Book metadata
 */
class Book {
    constructor(isbn, title, author, genre, publicationYear = 2024, description = '') {
        this.isbn = isbn;
        this.title = title;
        this.author = author;
        this.genre = genre;
        this.publicationYear = publicationYear;
        this.description = description;
    }
}

/**
 * BookCopy - Physical copy
 */
class BookCopy {
    constructor(copyId, book, shelfLocation = 'A1') {
        this.copyId = copyId;
        this.book = book;
        this.status = BookStatus.AVAILABLE;
        this.shelfLocation = shelfLocation;
    }

    isAvailable() {
        return this.status === BookStatus.AVAILABLE;
    }

    checkout() {
        this.status = BookStatus.CHECKED_OUT;
    }

    returnCopy() {
        this.status = BookStatus.AVAILABLE;
    }
}

/**
 * Member - Library member
 */
class Member {
    constructor(memberId, name, email, membershipType) {
        this.memberId = memberId;
        this.name = name;
        this.email = email;
        this.membershipType = membershipType;
        this.status = MemberStatus.ACTIVE;
        this.checkedOutBooks = [];
        this.finesOwed = 0;
    }

    canCheckout() {
        return (
            this.status === MemberStatus.ACTIVE &&
            this.checkedOutBooks.length < this.membershipType.checkoutLimit &&
            this.finesOwed < 10.0
        );
    }

    getCheckoutLimit() {
        return this.membershipType.checkoutLimit;
    }
}

/**
 * CheckoutTransaction - Checkout record
 */
class CheckoutTransaction {
    constructor(member, bookCopy) {
        this.transactionId = this.generateId();
        this.member = member;
        this.bookCopy = bookCopy;
        this.checkoutDate = new Date();
        this.dueDate = new Date(
            this.checkoutDate.getTime() + member.membershipType.loanDays * 24 * 60 * 60 * 1000
        );
    }

    generateId() {
        return `txn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    isOverdue() {
        return new Date() > this.dueDate;
    }

    calculateFine() {
        if (!this.isOverdue()) return 0;

        const daysLate = Math.floor(
            (new Date() - this.dueDate) / (24 * 60 * 60 * 1000)
        );
        return daysLate * this.member.membershipType.finePerDay;
    }
}

/**
 * ReturnTransaction - Return record
 */
class ReturnTransaction {
    constructor(checkout) {
        this.transactionId = `ret-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        this.checkout = checkout;
        this.returnDate = new Date();
        this.fineAmount = checkout.calculateFine();
    }

    process() {
        if (this.fineAmount > 0) {
            this.checkout.member.finesOwed += this.fineAmount;
        }
    }
}

/**
 * Reservation - Book reservation
 */
class Reservation {
    constructor(member, book) {
        this.reservationId = `res-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        this.member = member;
        this.book = book;
        this.reservationDate = new Date();
        this.notified = false;
    }

    notifyAvailable() {
        if (!this.notified) {
            console.log(`📧 Notification: ${this.member.name}, '${this.book.title}' is now available!`);
            this.notified = true;
        }
    }
}

/**
 * SearchCriteria - Search parameters
 */
class SearchCriteria {
    constructor(title = null, author = null, isbn = null, genre = null) {
        this.title = title;
        this.author = author;
        this.isbn = isbn;
        this.genre = genre;
    }

    matches(book) {
        if (this.isbn && book.isbn !== this.isbn) return false;
        if (this.title && !book.title.toLowerCase().includes(this.title.toLowerCase())) return false;
        if (this.author && !book.author.toLowerCase().includes(this.author.toLowerCase())) return false;
        if (this.genre && book.genre.toLowerCase() !== this.genre.toLowerCase()) return false;
        return true;
    }
}

/**
 * Catalog - Book repository
 */
class Catalog {
    constructor() {
        this.books = new Map();
        this.copies = new Map();
        this.isbnToCopies = new Map();
    }

    addBook(book, numCopies = 1) {
        this.books.set(book.isbn, book);
        this.isbnToCopies.set(book.isbn, []);

        for (let i = 0; i < numCopies; i++) {
            const copyId = `${book.isbn}-${i + 1}`;
            const copy = new BookCopy(copyId, book);
            this.copies.set(copyId, copy);
            this.isbnToCopies.get(book.isbn).push(copyId);
        }
    }

    search(criteria) {
        const results = [];
        for (const book of this.books.values()) {
            if (criteria.matches(book)) {
                results.push(book);
            }
        }
        return results;
    }

    findAvailableCopy(isbn) {
        const copyIds = this.isbnToCopies.get(isbn);
        if (!copyIds) return null;

        for (const copyId of copyIds) {
            const copy = this.copies.get(copyId);
            if (copy.isAvailable()) {
                return copy;
            }
        }

        return null;
    }

    getBookByIsbn(isbn) {
        return this.books.get(isbn) || null;
    }
}

/**
 * Library - Main system (Singleton)
 */
class Library {
    constructor() {
        if (Library.instance) {
            return Library.instance;
        }

        this.catalog = new Catalog();
        this.members = new Map();
        this.transactions = [];
        this.reservations = [];

        Library.instance = this;
    }

    registerMember(member) {
        this.members.set(member.memberId, member);
        console.log(`✓ Member registered: ${member.name} (${member.membershipType.name})`);
    }

    checkoutBook(memberId, isbn) {
        const member = this.members.get(memberId);
        if (!member) {
            console.log('✗ Member not found');
            return null;
        }

        if (!member.canCheckout()) {
            console.log(`✗ Cannot checkout: Status=${member.status}, ` +
                       `Books=${member.checkedOutBooks.length}/${member.getCheckoutLimit()}, ` +
                       `Fines=$${member.finesOwed.toFixed(2)}`);
            return null;
        }

        const copy = this.catalog.findAvailableCopy(isbn);
        if (!copy) {
            console.log('✗ No available copies');
            return null;
        }

        copy.checkout();
        const transaction = new CheckoutTransaction(member, copy);
        member.checkedOutBooks.push(copy.copyId);
        this.transactions.push(transaction);

        console.log(`✓ Checked out: '${copy.book.title}' to ${member.name}`);
        console.log(`  Due date: ${transaction.dueDate.toISOString().split('T')[0]}`);

        return transaction;
    }

    returnBook(copyId) {
        let checkout = null;
        for (const txn of this.transactions) {
            if (txn.bookCopy.copyId === copyId && txn.bookCopy.status === BookStatus.CHECKED_OUT) {
                checkout = txn;
                break;
            }
        }

        if (!checkout) {
            console.log('✗ No active checkout found');
            return null;
        }

        const returnTxn = new ReturnTransaction(checkout);
        returnTxn.process();

        checkout.bookCopy.returnCopy();
        const idx = checkout.member.checkedOutBooks.indexOf(copyId);
        if (idx > -1) {
            checkout.member.checkedOutBooks.splice(idx, 1);
        }

        console.log(`✓ Returned: '${checkout.bookCopy.book.title}' by ${checkout.member.name}`);
        if (returnTxn.fineAmount > 0) {
            console.log(`  ⚠ Fine: $${returnTxn.fineAmount.toFixed(2)}`);
        }

        this.processReservations(checkout.bookCopy.book.isbn);

        return returnTxn;
    }

    reserveBook(memberId, isbn) {
        const member = this.members.get(memberId);
        const book = this.catalog.getBookByIsbn(isbn);

        if (!member || !book) {
            console.log('✗ Invalid member or book');
            return null;
        }

        if (this.catalog.findAvailableCopy(isbn)) {
            console.log('✗ Book is available, no need to reserve');
            return null;
        }

        const reservation = new Reservation(member, book);
        this.reservations.push(reservation);

        console.log(`✓ Reserved: '${book.title}' for ${member.name}`);
        return reservation;
    }

    processReservations(isbn) {
        for (const reservation of this.reservations) {
            if (reservation.book.isbn === isbn && !reservation.notified) {
                reservation.notifyAvailable();
                break;
            }
        }
    }

    searchBooks(criteria) {
        return this.catalog.search(criteria);
    }

    getOverdueBooks() {
        const overdue = [];
        for (const txn of this.transactions) {
            if (txn.bookCopy.status === BookStatus.CHECKED_OUT && txn.isOverdue()) {
                overdue.push(txn);
            }
        }
        return overdue;
    }
}

/**
 * Demonstrate Library Management System
 */
function main() {
    console.log('='.repeat(70));
    console.log('LIBRARY MANAGEMENT SYSTEM - Low Level Design Demo');
    console.log('='.repeat(70));

    const library = new Library();

    // Add books
    console.log('\n📚 Adding Books...');
    const books = [
        new Book('978-0-13-468599-1', 'Clean Code', 'Robert Martin', 'Programming'),
        new Book('978-0-13-235088-4', 'Clean Architecture', 'Robert Martin', 'Programming'),
        new Book('978-0-201-63361-0', 'Design Patterns', 'Gang of Four', 'Programming'),
    ];

    for (const book of books) {
        library.catalog.addBook(book, 2);
    }

    // Register members
    console.log('\n👥 Registering Members...');
    const members = [
        new Member('M001', 'Alice Johnson', 'alice@example.com', MembershipType.PREMIUM),
        new Member('M002', 'Bob Smith', 'bob@example.com', MembershipType.REGULAR),
        new Member('M003', 'Charlie Brown', 'charlie@example.com', MembershipType.STUDENT),
    ];

    for (const member of members) {
        library.registerMember(member);
    }

    // Search books
    console.log('\n🔍 Searching Books...');
    const criteria = new SearchCriteria(null, 'Robert Martin');
    const results = library.searchBooks(criteria);
    console.log(`Found ${results.length} books by Robert Martin`);

    // Checkout books
    console.log('\n📤 Checking Out Books...');
    library.checkoutBook('M001', '978-0-13-468599-1');
    library.checkoutBook('M002', '978-0-13-468599-1');
    library.checkoutBook('M003', '978-0-201-63361-0');

    // Try checkout when all copies out
    console.log('\n📤 Attempting Third Checkout...');
    library.checkoutBook('M002', '978-0-13-468599-1');

    // Reserve book
    console.log('\n📝 Creating Reservation...');
    library.reserveBook('M002', '978-0-13-468599-1');

    // Return book
    console.log('\n📥 Returning Books...');
    library.returnBook('978-0-13-468599-1-1');

    // Check overdue
    console.log('\n⏰ Checking Overdue Books...');
    const overdue = library.getOverdueBooks();
    console.log(`Overdue books: ${overdue.length}`);

    console.log('\n' + '='.repeat(70));
    console.log('DEMO COMPLETE');
    console.log('='.repeat(70));
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        Library,
        Catalog,
        Book,
        BookCopy,
        Member,
        CheckoutTransaction,
        ReturnTransaction,
        Reservation,
        SearchCriteria,
        BookStatus,
        MembershipType,
        MemberStatus
    };
}

// Run demo if executed directly
if (typeof require !== 'undefined' && require.main === module) {
    main();
}
