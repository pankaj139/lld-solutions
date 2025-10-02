# Library Management System

## 🔗 Implementation Links
- **Python Implementation**: [python/library-management/main.py](python/library-management/main.py)
- **JavaScript Implementation**: [javascript/library-management/main.js](javascript/library-management/main.js)

## Problem Statement

Design a library management system that can:

1. **Manage books and book items** in the library catalog
2. **Handle user types** (members, librarians, admins) with different privileges
3. **Issue and return books** with due date tracking
4. **Manage reservations** for books that are currently unavailable
5. **Calculate and track fines** for overdue books
6. **Search functionality** by title, author, or ISBN
7. **Track book availability** and library statistics

## Requirements

### Functional Requirements
- Add/remove books and book items to/from the catalog
- Register different types of users (members, librarians, admins)
- Issue books to members with automatic due date calculation
- Accept book returns and calculate overdue fines
- Allow members to reserve books that are currently unavailable
- Search books by various criteria (title, author, ISBN)
- Track member borrowing history and current loans
- Manage fines and payments
- Generate reports on library usage

### Non-Functional Requirements
- System should be scalable for large book collections
- Fast search and retrieval operations
- Support for multiple copies of the same book
- Proper access control based on user types
- Data consistency for book availability

## Design Decisions

### Key Classes

1. **User Hierarchy**
   - Abstract `User` base class
   - Concrete classes: `Member`, `Librarian`, `Admin`
   - Different privileges and borrowing limits

2. **Book Management**
   - `Book`: Represents book metadata (title, authors, ISBN)
   - `BookItem`: Individual physical copies with unique barcodes
   - `Author`: Author information and biography

3. **Transaction Management**
   - `BookLending`: Tracks book borrowing sessions
   - `BookReservation`: Manages book reservations
   - `Fine`: Handles overdue penalties

4. **System Components**
   - `Library`: Main system coordinator
   - `Catalog`: Book and inventory management
   - `Search`: Search functionality implementation

### Design Patterns Used

1. **Strategy Pattern**: Different search strategies (by title, author, ISBN)
2. **Template Method**: User class hierarchy with common interface
3. **Factory Method**: Could be extended for creating different user types
4. **State Pattern**: Book item status management
5. **Observer Pattern**: Could be added for notifications

### Key Features

- **Multi-user Support**: Different user types with varying privileges
- **Fine Management**: Automatic calculation of overdue fines
- **Reservation System**: Queue management for popular books
- **Search Capabilities**: Multiple search criteria support
- **Inventory Tracking**: Real-time availability status

## Class Diagram

```
User (Abstract)
├── Member (max_books: 5, max_reservation_days: 10)
├── Librarian
└── Admin

Book
├── isbn: str
├── title: str
├── authors: List[Author]
├── publisher: str
├── publication_date: datetime
└── pages: int

BookItem
├── barcode: str
├── book: Book
├── rack_location: str
├── status: BookStatus
└── due_date: datetime

BookLending
├── lending_id: str
├── member: Member
├── book_item: BookItem
├── issue_date: datetime
├── due_date: datetime
└── return_date: datetime

Library
├── catalog: Catalog
├── members: dict
├── active_lendings: dict
├── reservations: dict
└── fines: dict
```

## Usage Example

```python
# Create library and setup
library = Library("City Central Library", "123 Main St")
author = Author("J.K. Rowling", "British author")
book = Book("978-0-7475-3269-9", "Harry Potter", [author], "Bloomsbury", datetime(1997, 6, 26), 223)
library.catalog.add_book(book)

# Add book items
item = BookItem("HP001", book, "A-1-1")
library.catalog.add_book_item(item)

# Register members
member = Member("M001", "Alice Johnson", "alice@example.com")
library.add_member(member)

# Issue a book
lending = library.issue_book("M001", "HP001")

# Return a book
library.return_book("HP001")
```

## Business Rules

1. **Borrowing Limits**
   - Members can borrow up to 5 books simultaneously
   - Loan period is 14 days by default
   - Members with unpaid fines cannot borrow new books

2. **Reservations**
   - Books can be reserved when not available
   - Reservations expire after 10 days
   - Reserved books are held for 24 hours after becoming available

3. **Fines**
   - $1 per day for overdue books
   - Fines must be paid before new books can be borrowed
   - Librarians can waive fines in special circumstances

## Extension Points

1. **Digital Books**: Support for e-books and digital lending
2. **Inter-library Loans**: Integration with other library systems
3. **Mobile App**: Mobile interface for members
4. **Analytics**: Usage patterns and popular books tracking
5. **Notification System**: Email/SMS reminders for due dates
6. **Payment Integration**: Online fine payment system

## Time Complexity

- **Search Operations**: O(n) for title/author search, O(1) for ISBN
- **Book Issue/Return**: O(1) with proper indexing
- **Member Validation**: O(1) with hash-based member lookup
- **Fine Calculation**: O(1) for individual books

## Space Complexity

- O(n) where n is the total number of books and book items
- Additional O(m) for active lendings and reservations
- O(u) for user management where u is number of users