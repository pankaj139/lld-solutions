# Library Management System

## 🔗 Implementation Links

- **Python Implementation**: [python/library-management/main.py](python/library-management/main.py)
- **JavaScript Implementation**: [javascript/library-management/main.js](javascript/library-management/main.js)

## Problem Statement

Design a comprehensive Library Management System that can:

1. **Manage book catalog** with search, add, update, and remove operations
2. **Handle member registration** with different membership tiers
3. **Process book checkouts** with due date tracking
4. **Manage returns** with late fee calculation
5. **Track reservations** for checked-out books
6. **Support multiple copies** of the same book
7. **Implement fine system** for overdue books
8. **Generate reports** for inventory and member activity

## Requirements

### Functional Requirements

- Add, update, and remove books from catalog with ISBN, title, author, genre
- Register members with different membership types (Regular, Premium, Student)
- Checkout books to members with due date (14 days standard, 30 days premium)
- Return books and calculate late fees if overdue
- Reserve books that are currently checked out
- Search books by title, author, ISBN, or genre
- Track book availability and location (shelf number)
- Support multiple copies of same book with unique copy IDs
- Send notifications for due dates and reservations
- Generate reports for most borrowed books, active members, overdue items

### Non-Functional Requirements

- Book search should execute in O(log n) time with indexing
- Support catalog of 100,000+ books
- Handle 10,000+ active members
- Checkout/return operations should be atomic
- System should be thread-safe for concurrent operations
- Data should persist across sessions
- Extensible for digital books and magazines

## Design Decisions

### Key Classes

1. **Book Management**
   - `Book`: Book metadata (ISBN, title, author, genre)
   - `BookCopy`: Physical copy with unique ID and status
   - `BookStatus`: Enum (Available, CheckedOut, Reserved, Lost, UnderMaintenance)
   - `Catalog`: Book collection with search and indexing

2. **Member Management**
   - `Member`: Library member with membership type
   - `MembershipType`: Enum (Regular, Premium, Student) with different privileges
   - `MemberStatus`: Enum (Active, Suspended, Expired)

3. **Transaction Management**
   - `CheckoutTransaction`: Book borrowing record
   - `ReturnTransaction`: Book return with fine calculation
   - `Reservation`: Queue for checked-out books
   - `Fine`: Late fee tracking

4. **Search & Indexing**
   - `SearchCriteria`: Search parameters (title, author, ISBN, genre)
   - `Index`: Fast lookup data structures
   - `SearchEngine`: Query processing

5. **System Management**
   - `Library`: Main facade managing all operations
   - `Notification`: Member alerts for due dates, reservations
   - `Report`: Analytics and statistics

### Design Patterns Used

1. **Singleton Pattern**: Library instance (single library system)
2. **Factory Pattern**: Create members with appropriate privileges
3. **Strategy Pattern**: Different fine calculation strategies per membership
4. **Observer Pattern**: Notify members of due dates, reservation availability
5. **Repository Pattern**: Data access abstraction for books and members
6. **Command Pattern**: Checkout/return as reversible operations
7. **Chain of Responsibility**: Process checkout validation (availability, limit, dues)

### Key Features

- **Multi-Copy Support**: Same book, multiple physical copies
- **Smart Reservations**: Automatic notification when reserved book available
- **Tiered Membership**: Different privileges and checkout limits
- **Fine Calculation**: Progressive fines for overdue books
- **Comprehensive Search**: Multi-criteria book search

## State Diagram

```text
BOOK COPY STATES:

AVAILABLE
  ↓ (checkout)
CHECKED_OUT
  ├─→ (return on-time) → AVAILABLE
  ├─→ (return late) → [calculate_fine] → AVAILABLE
  ├─→ (reserve while checked out) → CHECKED_OUT (reservation queued)
  └─→ (mark lost) → LOST

RESERVED
  ↓ (cancel reservation)
AVAILABLE

MEMBER STATES:

ACTIVE
  ├─→ (checkout book) → [validate limits] → ACTIVE
  ├─→ (accumulate fines > threshold) → SUSPENDED
  └─→ (membership expires) → EXPIRED

SUSPENDED
  ↓ (pay fines)
ACTIVE

EXPIRED
  ↓ (renew membership)
ACTIVE
```

## Class Diagram

```text
BookStatus (Enum)
├── AVAILABLE
├── CHECKED_OUT
├── RESERVED
├── LOST
└── UNDER_MAINTENANCE

MembershipType (Enum)
├── REGULAR (checkout_limit: 5, loan_period: 14 days)
├── PREMIUM (checkout_limit: 10, loan_period: 30 days)
└── STUDENT (checkout_limit: 3, loan_period: 14 days)

MemberStatus (Enum)
├── ACTIVE
├── SUSPENDED
└── EXPIRED

Book
├── isbn: str
├── title: str
├── author: str
├── genre: str
├── publication_year: int
└── description: str

BookCopy
├── copy_id: str
├── book: Book
├── status: BookStatus
├── shelf_location: str
├── is_available() → bool
└── checkout() → None

Member
├── member_id: str
├── name: str
├── email: str
├── membership_type: MembershipType
├── status: MemberStatus
├── checked_out_books: List[BookCopy]
├── fines_owed: float
├── can_checkout() → bool
└── get_checkout_limit() → int

CheckoutTransaction
├── transaction_id: str
├── member: Member
├── book_copy: BookCopy
├── checkout_date: datetime
├── due_date: datetime
├── is_overdue() → bool
└── calculate_fine() → float

ReturnTransaction
├── transaction_id: str
├── checkout: CheckoutTransaction
├── return_date: datetime
├── fine_amount: float
└── process() → None

Reservation
├── reservation_id: str
├── member: Member
├── book: Book
├── reservation_date: datetime
├── status: ReservationStatus
└── notify_available() → None

Fine
├── fine_id: str
├── member: Member
├── amount: float
├── reason: str
├── paid: bool
└── pay() → None

SearchCriteria
├── title: Optional[str]
├── author: Optional[str]
├── isbn: Optional[str]
├── genre: Optional[str]
└── matches(book) → bool

Catalog
├── books: Dict[str, Book]  # ISBN → Book
├── copies: Dict[str, BookCopy]  # CopyID → BookCopy
├── add_book(book, copies) → None
├── search(criteria) → List[Book]
├── find_available_copy(isbn) → Optional[BookCopy]
└── get_book_by_isbn(isbn) → Optional[Book]

Library (Singleton)
├── catalog: Catalog
├── members: Dict[str, Member]
├── transactions: List[CheckoutTransaction]
├── reservations: List[Reservation]
├── checkout_book(member_id, isbn) → CheckoutTransaction
├── return_book(copy_id) → ReturnTransaction
├── reserve_book(member_id, isbn) → Reservation
├── search_books(criteria) → List[Book]
├── register_member(member) → None
└── get_overdue_books() → List[CheckoutTransaction]
```

## Usage Example

```python
# Initialize library
library = Library()

# Add books to catalog
book = Book(
    isbn="978-0-13-468599-1",
    title="Clean Code",
    author="Robert Martin",
    genre="Programming"
)
library.catalog.add_book(book, num_copies=3)

# Register member
member = Member(
    member_id="M001",
    name="Alice Johnson",
    email="alice@example.com",
    membership_type=MembershipType.PREMIUM
)
library.register_member(member)

# Search for books
criteria = SearchCriteria(author="Robert Martin")
results = library.search_books(criteria)

# Checkout book
checkout = library.checkout_book(
    member_id="M001",
    isbn="978-0-13-468599-1"
)
print(f"Due date: {checkout.due_date}")

# Return book
return_txn = library.return_book(checkout.book_copy.copy_id)
if return_txn.fine_amount > 0:
    print(f"Fine: ${return_txn.fine_amount}")

# Reserve book if all copies checked out
reservation = library.reserve_book("M001", "978-0-13-468599-1")
```

## Business Rules

1. **Checkout Rules**
   - Member must be ACTIVE status
   - Member cannot exceed checkout limit for their tier
   - Member must have no unpaid fines
   - Book copy must be AVAILABLE
   - Due date based on membership type (14 or 30 days)

2. **Fine Calculation**
   - $0.50 per day for Regular members
   - $0.25 per day for Premium members
   - $1.00 per day for Students (higher to encourage returns)
   - Maximum fine capped at book replacement cost
   - Fines over $10 result in account suspension

3. **Reservation Rules**
   - Can only reserve books currently checked out
   - Max 3 active reservations per member
   - First-come-first-served queue
   - Reservation expires if not claimed within 48 hours
   - Automatic notification when book becomes available

4. **Membership Limits**
   - Regular: 5 books, 14 days, $0.50/day fine
   - Premium: 10 books, 30 days, $0.25/day fine
   - Student: 3 books, 14 days, $1.00/day fine

5. **Book Copy Management**
   - Each physical book has unique copy ID
   - Lost books charged at replacement cost
   - Under maintenance books unavailable for checkout
   - Damaged books flagged for review

## Extension Points

1. **Digital Content**: Add e-books, audiobooks with concurrent license limits
2. **Renewals**: Allow extending due date if no reservations
3. **Inter-Library Loans**: Borrow from partner libraries
4. **Reading Rooms**: Reserve study spaces
5. **Events**: Manage author talks, book clubs
6. **Recommendation Engine**: Suggest books based on history
7. **Mobile App**: Check availability, renew online
8. **Payment Integration**: Online fine payment

## Security Considerations

- **Authentication**: Secure member login with password
- **Authorization**: Role-based access (Member, Librarian, Admin)
- **Data Privacy**: Protect member borrowing history
- **Audit Trail**: Log all transactions for accountability
- **Rate Limiting**: Prevent system abuse

## Time Complexity

- **Book Search (Indexed)**: O(log n) with ISBN, O(k) where k is results
- **Checkout**: O(1) - Direct lookup and update
- **Return**: O(1) - Direct transaction lookup
- **Find Available Copy**: O(c) where c is copies of book (typically small)
- **Get Overdue Books**: O(t) where t is active transactions
- **Member Lookup**: O(1) with hash map

## Space Complexity

- O(b) where b is number of books in catalog
- O(c) where c is total book copies
- O(m) where m is number of members
- O(t) where t is transaction history
- O(r) where r is active reservations
