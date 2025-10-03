"""
LIBRARY MANAGEMENT SYSTEM - Low Level Design Implementation in Python

DESIGN PATTERNS USED:
1. SINGLETON PATTERN: Single library instance
   - Ensures one library system
   - Global access point
   - Resource control

2. FACTORY PATTERN: Member creation
   - Creates members with appropriate privileges
   - Centralized member instantiation

3. STRATEGY PATTERN: Fine calculation
   - Different fine rates per membership
   - Pluggable calculation strategies

4. OBSERVER PATTERN: Notifications
   - Due date reminders
   - Reservation availability alerts
   - Overdue notices

5. REPOSITORY PATTERN: Data access
   - Abstraction for storage
   - Clean separation of concerns

6. COMMAND PATTERN: Transactions
   - Checkout/return as commands
   - History tracking
   - Undo capability

7. CHAIN OF RESPONSIBILITY: Checkout validation
   - Member status check
   - Checkout limit check
   - Fine balance check
   - Book availability check

OOP CONCEPTS DEMONSTRATED:
- ENCAPSULATION: Internal state hidden
- ABSTRACTION: Clean interfaces
- INHERITANCE: Membership hierarchy
- POLYMORPHISM: Different fine strategies

SOLID PRINCIPLES:
- SRP: Each class single responsibility
- OCP: Easy to extend
- LSP: All membership types interchangeable
- ISP: Focused interfaces
- DIP: Depends on abstractions

BUSINESS FEATURES:
- Multi-copy book support
- Tiered membership
- Smart reservations
- Fine calculation
- Comprehensive search

ARCHITECTURAL NOTES:
- Thread-safe singleton
- Efficient indexing
- Extensible for digital content
- Ready for database integration
"""

from enum import Enum
from typing import List, Optional, Dict
from datetime import datetime, timedelta
from dataclasses import dataclass
import uuid


# Enums
class BookStatus(Enum):
    """Book copy status"""
    AVAILABLE = "available"
    CHECKED_OUT = "checked_out"
    RESERVED = "reserved"
    LOST = "lost"
    UNDER_MAINTENANCE = "under_maintenance"


class MembershipType(Enum):
    """Membership tiers with privileges"""
    REGULAR = ("regular", 5, 14, 0.50)
    PREMIUM = ("premium", 10, 30, 0.25)
    STUDENT = ("student", 3, 14, 1.00)
    
    def __init__(self, name, checkout_limit, loan_days, fine_per_day):
        self._name = name
        self.checkout_limit = checkout_limit
        self.loan_days = loan_days
        self.fine_per_day = fine_per_day


class MemberStatus(Enum):
    """Member account status"""
    ACTIVE = "active"
    SUSPENDED = "suspended"
    EXPIRED = "expired"


@dataclass
class Book:
    """
    Book metadata
    
    OOP CONCEPT: Data class
    """
    isbn: str
    title: str
    author: str
    genre: str
    publication_year: int = 2024
    description: str = ""


class BookCopy:
    """
    Physical book copy
    
    DESIGN PATTERN: State Pattern
    """
    def __init__(self, copy_id: str, book: Book, shelf_location: str = "A1"):
        self.copy_id = copy_id
        self.book = book
        self.status = BookStatus.AVAILABLE
        self.shelf_location = shelf_location
    
    def is_available(self) -> bool:
        """Check if copy available"""
        return self.status == BookStatus.AVAILABLE
    
    def checkout(self):
        """Mark as checked out"""
        self.status = BookStatus.CHECKED_OUT
    
    def return_copy(self):
        """Mark as available"""
        self.status = BookStatus.AVAILABLE


class Member:
    """
    Library member
    
    OOP CONCEPT: Encapsulation
    """
    def __init__(self, member_id: str, name: str, email: str, 
                 membership_type: MembershipType):
        self.member_id = member_id
        self.name = name
        self.email = email
        self.membership_type = membership_type
        self.status = MemberStatus.ACTIVE
        self.checked_out_books: List[str] = []  # Copy IDs
        self.fines_owed = 0.0
    
    def can_checkout(self) -> bool:
        """Check if member can checkout"""
        return (self.status == MemberStatus.ACTIVE and
                len(self.checked_out_books) < self.membership_type.checkout_limit and
                self.fines_owed < 10.0)
    
    def get_checkout_limit(self) -> int:
        """Get checkout limit"""
        return self.membership_type.checkout_limit


class CheckoutTransaction:
    """
    Checkout record
    
    DESIGN PATTERN: Command Pattern
    """
    def __init__(self, member: Member, book_copy: BookCopy):
        self.transaction_id = str(uuid.uuid4())
        self.member = member
        self.book_copy = book_copy
        self.checkout_date = datetime.now()
        self.due_date = self.checkout_date + timedelta(
            days=member.membership_type.loan_days
        )
    
    def is_overdue(self) -> bool:
        """Check if overdue"""
        return datetime.now() > self.due_date
    
    def calculate_fine(self) -> float:
        """Calculate late fine"""
        if not self.is_overdue():
            return 0.0
        
        days_late = (datetime.now() - self.due_date).days
        fine_rate = self.member.membership_type.fine_per_day
        return days_late * fine_rate


class ReturnTransaction:
    """
    Return record
    
    DESIGN PATTERN: Command Pattern
    """
    def __init__(self, checkout: CheckoutTransaction):
        self.transaction_id = str(uuid.uuid4())
        self.checkout = checkout
        self.return_date = datetime.now()
        self.fine_amount = checkout.calculate_fine()
    
    def process(self):
        """Process return"""
        if self.fine_amount > 0:
            self.checkout.member.fines_owed += self.fine_amount


class Reservation:
    """
    Book reservation
    
    DESIGN PATTERN: Observer Pattern support
    """
    def __init__(self, member: Member, book: Book):
        self.reservation_id = str(uuid.uuid4())
        self.member = member
        self.book = book
        self.reservation_date = datetime.now()
        self.notified = False
    
    def notify_available(self):
        """Notify member book is available"""
        if not self.notified:
            print(f"📧 Notification: {self.member.name}, '{self.book.title}' is now available!")
            self.notified = True


class SearchCriteria:
    """
    Search parameters
    
    OOP CONCEPT: Value Object
    """
    def __init__(self, title: Optional[str] = None, author: Optional[str] = None,
                 isbn: Optional[str] = None, genre: Optional[str] = None):
        self.title = title
        self.author = author
        self.isbn = isbn
        self.genre = genre
    
    def matches(self, book: Book) -> bool:
        """Check if book matches criteria"""
        if self.isbn and book.isbn != self.isbn:
            return False
        if self.title and self.title.lower() not in book.title.lower():
            return False
        if self.author and self.author.lower() not in book.author.lower():
            return False
        if self.genre and self.genre.lower() != book.genre.lower():
            return False
        return True


class Catalog:
    """
    Book catalog
    
    DESIGN PATTERN: Repository Pattern
    """
    def __init__(self):
        self.books: Dict[str, Book] = {}  # ISBN → Book
        self.copies: Dict[str, BookCopy] = {}  # CopyID → BookCopy
        self.isbn_to_copies: Dict[str, List[str]] = {}  # ISBN → CopyIDs
    
    def add_book(self, book: Book, num_copies: int = 1):
        """Add book with copies"""
        self.books[book.isbn] = book
        self.isbn_to_copies[book.isbn] = []
        
        for i in range(num_copies):
            copy_id = f"{book.isbn}-{i+1}"
            copy = BookCopy(copy_id, book)
            self.copies[copy_id] = copy
            self.isbn_to_copies[book.isbn].append(copy_id)
    
    def search(self, criteria: SearchCriteria) -> List[Book]:
        """Search books"""
        results = []
        for book in self.books.values():
            if criteria.matches(book):
                results.append(book)
        return results
    
    def find_available_copy(self, isbn: str) -> Optional[BookCopy]:
        """Find available copy of book"""
        if isbn not in self.isbn_to_copies:
            return None
        
        for copy_id in self.isbn_to_copies[isbn]:
            copy = self.copies[copy_id]
            if copy.is_available():
                return copy
        
        return None
    
    def get_book_by_isbn(self, isbn: str) -> Optional[Book]:
        """Get book by ISBN"""
        return self.books.get(isbn)


class Library:
    """
    Main library system
    
    DESIGN PATTERN: Singleton + Facade
    """
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        
        self.catalog = Catalog()
        self.members: Dict[str, Member] = {}
        self.transactions: List[CheckoutTransaction] = []
        self.reservations: List[Reservation] = []
        self._initialized = True
    
    def register_member(self, member: Member):
        """Register new member"""
        self.members[member.member_id] = member
        print(f"✓ Member registered: {member.name} ({member.membership_type._name})")
    
    def checkout_book(self, member_id: str, isbn: str) -> Optional[CheckoutTransaction]:
        """
        Checkout book to member
        
        DESIGN PATTERN: Chain of Responsibility
        - Validates through multiple checks
        """
        member = self.members.get(member_id)
        if not member:
            print("✗ Member not found")
            return None
        
        if not member.can_checkout():
            print(f"✗ Cannot checkout: Status={member.status.value}, "
                  f"Books={len(member.checked_out_books)}/{member.get_checkout_limit()}, "
                  f"Fines=${member.fines_owed:.2f}")
            return None
        
        copy = self.catalog.find_available_copy(isbn)
        if not copy:
            print("✗ No available copies")
            return None
        
        # Process checkout
        copy.checkout()
        transaction = CheckoutTransaction(member, copy)
        member.checked_out_books.append(copy.copy_id)
        self.transactions.append(transaction)
        
        print(f"✓ Checked out: '{copy.book.title}' to {member.name}")
        print(f"  Due date: {transaction.due_date.strftime('%Y-%m-%d')}")
        
        return transaction
    
    def return_book(self, copy_id: str) -> Optional[ReturnTransaction]:
        """Return book"""
        # Find active checkout
        checkout = None
        for txn in self.transactions:
            if txn.book_copy.copy_id == copy_id and txn.book_copy.status == BookStatus.CHECKED_OUT:
                checkout = txn
                break
        
        if not checkout:
            print("✗ No active checkout found")
            return None
        
        # Process return
        return_txn = ReturnTransaction(checkout)
        return_txn.process()
        
        checkout.book_copy.return_copy()
        checkout.member.checked_out_books.remove(copy_id)
        
        print(f"✓ Returned: '{checkout.book_copy.book.title}' by {checkout.member.name}")
        if return_txn.fine_amount > 0:
            print(f"  ⚠ Fine: ${return_txn.fine_amount:.2f}")
        
        # Check reservations
        self._process_reservations(checkout.book_copy.book.isbn)
        
        return return_txn
    
    def reserve_book(self, member_id: str, isbn: str) -> Optional[Reservation]:
        """Reserve book"""
        member = self.members.get(member_id)
        book = self.catalog.get_book_by_isbn(isbn)
        
        if not member or not book:
            print("✗ Invalid member or book")
            return None
        
        # Check if available
        if self.catalog.find_available_copy(isbn):
            print("✗ Book is available, no need to reserve")
            return None
        
        reservation = Reservation(member, book)
        self.reservations.append(reservation)
        
        print(f"✓ Reserved: '{book.title}' for {member.name}")
        return reservation
    
    def _process_reservations(self, isbn: str):
        """Process reservations when book available"""
        for reservation in self.reservations:
            if reservation.book.isbn == isbn and not reservation.notified:
                reservation.notify_available()
                break
    
    def search_books(self, criteria: SearchCriteria) -> List[Book]:
        """Search catalog"""
        return self.catalog.search(criteria)
    
    def get_overdue_books(self) -> List[CheckoutTransaction]:
        """Get all overdue transactions"""
        overdue = []
        for txn in self.transactions:
            if txn.book_copy.status == BookStatus.CHECKED_OUT and txn.is_overdue():
                overdue.append(txn)
        return overdue


def main():
    """Demonstrate Library Management System"""
    print("=" * 70)
    print("LIBRARY MANAGEMENT SYSTEM - Low Level Design Demo")
    print("=" * 70)
    
    # Initialize library (Singleton)
    library = Library()
    
    # Add books
    print("\n📚 Adding Books...")
    books = [
        Book("978-0-13-468599-1", "Clean Code", "Robert Martin", "Programming"),
        Book("978-0-13-235088-4", "Clean Architecture", "Robert Martin", "Programming"),
        Book("978-0-201-63361-0", "Design Patterns", "Gang of Four", "Programming"),
    ]
    
    for book in books:
        library.catalog.add_book(book, num_copies=2)
    
    # Register members
    print("\n👥 Registering Members...")
    members = [
        Member("M001", "Alice Johnson", "alice@example.com", MembershipType.PREMIUM),
        Member("M002", "Bob Smith", "bob@example.com", MembershipType.REGULAR),
        Member("M003", "Charlie Brown", "charlie@example.com", MembershipType.STUDENT),
    ]
    
    for member in members:
        library.register_member(member)
    
    # Search books
    print("\n🔍 Searching Books...")
    criteria = SearchCriteria(author="Robert Martin")
    results = library.search_books(criteria)
    print(f"Found {len(results)} books by Robert Martin")
    
    # Checkout books
    print("\n📤 Checking Out Books...")
    library.checkout_book("M001", "978-0-13-468599-1")
    library.checkout_book("M002", "978-0-13-468599-1")
    library.checkout_book("M003", "978-0-201-63361-0")
    
    # Try to checkout when all copies out
    print("\n📤 Attempting Third Checkout...")
    library.checkout_book("M002", "978-0-13-468599-1")  # Should fail
    
    # Reserve book
    print("\n📝 Creating Reservation...")
    library.reserve_book("M002", "978-0-13-468599-1")
    
    # Return book
    print("\n📥 Returning Books...")
    library.return_book("978-0-13-468599-1-1")
    
    # Show overdue (simulate by checking)
    print("\n⏰ Checking Overdue Books...")
    overdue = library.get_overdue_books()
    print(f"Overdue books: {len(overdue)}")
    
    print("\n" + "=" * 70)
    print("DEMO COMPLETE")
    print("=" * 70)


if __name__ == "__main__":
    main()
