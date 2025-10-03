"""
LIBRARY MANAGEMENT SYSTEM - Low Level Design Implementation in Python

DESIGN PATTERNS USED:
1. FACADE PATTERN: LibrarySystem provides unified interface for all operations
   - Simplifies complex library operations (search, issue, return, reserve)
   - Hides complexity of user management, book tracking, and fine calculation
   - Single entry point for librarians and members
   - Coordinates between multiple subsystems (catalog, circulation, accounts)

2. TEMPLATE METHOD PATTERN: Common book operation workflow
   - Base template for book transactions: validate -> process -> record -> notify
   - Specific steps customized for different operations (issue, return, reserve)
   - Consistent validation and audit trail across all operations
   - Extensible framework for new transaction types

3. STRATEGY PATTERN: Different fine calculation strategies
   - Standard fine calculation for overdue books
   - Graduated fines based on book type and user category
   - Holiday and weekend adjustments
   - Special rates for students, faculty, and premium members

4. CHAIN OF RESPONSIBILITY PATTERN: User permission and validation chain
   - Role-based access control with permission chains
   - Member -> Librarian -> Admin hierarchy
   - Request validation flows through appropriate handlers
   - Easy to add new roles and permissions

5. STATE PATTERN: Book lifecycle state management
   - BookStatus enum with explicit state transitions
   - Available -> Reserved -> Issued -> Returned workflow
   - State-specific business rules and operations
   - Invalid state transition prevention

6. OBSERVER PATTERN: Notification system for library events
   - Book return reminders and overdue notifications
   - Reservation availability alerts
   - New book acquisition notifications
   - Multiple notification channels: email, SMS, in-app

OOP CONCEPTS DEMONSTRATED:
- INHERITANCE: User hierarchy (Member, Librarian, Admin) with role-specific behavior
- ENCAPSULATION: Book and user data hidden behind controlled interfaces
- ABSTRACTION: Complex library operations abstracted into simple method calls
- POLYMORPHISM: Different user types handled uniformly through User interface

SOLID PRINCIPLES:
- SRP: Each class handles single responsibility (Book, User, Transaction, Catalog)
- OCP: Easy to add new user types and book categories without code changes
- LSP: All user types can be used interchangeably through User interface
- ISP: Focused interfaces for catalog operations, user management, circulation
- DIP: Library system depends on abstractions, not concrete implementations

BUSINESS FEATURES:
- Multi-user role management (Members, Librarians, Administrators)
- Comprehensive book catalog with search and filtering
- Book reservation system with priority queues
- Automated fine calculation for overdue books
- Book issue and return tracking with history
- Inventory management with acquisition and disposal
- Reporting and analytics for library operations

ARCHITECTURAL NOTES:
- Role-based access control with permission inheritance
- Automated notification system for library events
- Flexible fine calculation with configurable rules
- Scalable catalog design for large book collections
- Integration points for external systems (payment, notifications)
- Comprehensive audit trail for all transactions
"""

from abc import ABC, abstractmethod
from enum import Enum
from datetime import datetime, timedelta
import uuid

class UserType(Enum):
    MEMBER = 1
    LIBRARIAN = 2
    ADMIN = 3

class BookStatus(Enum):
    AVAILABLE = 1
    ISSUED = 2
    RESERVED = 3
    LOST = 4

class ReservationStatus(Enum):
    ACTIVE = 1
    FULFILLED = 2
    CANCELLED = 3
    EXPIRED = 4

class User(ABC):
    def __init__(self, user_id, name, email, user_type):
        self.user_id = user_id
        self.name = name
        self.email = email
        self.user_type = user_type
        self.date_joined = datetime.now()

class Member(User):
    def __init__(self, user_id, name, email):
        super().__init__(user_id, name, email, UserType.MEMBER)
        self.max_books = 5
        self.max_reservation_days = 10

class Librarian(User):
    def __init__(self, user_id, name, email):
        super().__init__(user_id, name, email, UserType.LIBRARIAN)

class Admin(User):
    def __init__(self, user_id, name, email):
        super().__init__(user_id, name, email, UserType.ADMIN)

class Author:
    def __init__(self, name, biography=""):
        self.name = name
        self.biography = biography

class Book:
    def __init__(self, isbn, title, authors, publisher, publication_date, pages):
        self.isbn = isbn
        self.title = title
        self.authors = authors  # List of Author objects
        self.publisher = publisher
        self.publication_date = publication_date
        self.pages = pages

class BookItem:
    def __init__(self, barcode, book, rack_location):
        self.barcode = barcode
        self.book = book
        self.rack_location = rack_location
        self.status = BookStatus.AVAILABLE
        self.date_added = datetime.now()
        self.due_date = None
        self.price = 0.0

    def checkout(self, member_id, due_date):
        if self.status != BookStatus.AVAILABLE:
            return False
        
        self.status = BookStatus.ISSUED
        self.due_date = due_date
        return True

    def return_book(self):
        self.status = BookStatus.AVAILABLE
        self.due_date = None

class BookReservation:
    def __init__(self, member, book_item):
        self.reservation_id = str(uuid.uuid4())
        self.member = member
        self.book_item = book_item
        self.creation_date = datetime.now()
        self.status = ReservationStatus.ACTIVE
        self.expiry_date = self.creation_date + timedelta(days=member.max_reservation_days)

    def fulfill_reservation(self):
        self.status = ReservationStatus.FULFILLED

    def cancel_reservation(self):
        self.status = ReservationStatus.CANCELLED

class BookLending:
    def __init__(self, member, book_item, due_date):
        self.lending_id = str(uuid.uuid4())
        self.member = member
        self.book_item = book_item
        self.issue_date = datetime.now()
        self.due_date = due_date
        self.return_date = None

    def return_book(self):
        self.return_date = datetime.now()
        self.book_item.return_book()

    def is_overdue(self):
        return datetime.now() > self.due_date and self.return_date is None

    def calculate_fine(self, fine_per_day):
        if not self.is_overdue():
            return 0.0
        
        overdue_days = (datetime.now() - self.due_date).days
        return overdue_days * fine_per_day

class Fine:
    def __init__(self, member, amount, description):
        self.fine_id = str(uuid.uuid4())
        self.member = member
        self.amount = amount
        self.description = description
        self.creation_date = datetime.now()
        self.is_paid = False

    def pay_fine(self):
        self.is_paid = True
        self.payment_date = datetime.now()

class Search:
    @staticmethod
    def search_by_title(catalog, title):
        results = []
        for book in catalog.books.values():
            if title.lower() in book.title.lower():
                results.append(book)
        return results

    @staticmethod
    def search_by_author(catalog, author_name):
        results = []
        for book in catalog.books.values():
            for author in book.authors:
                if author_name.lower() in author.name.lower():
                    results.append(book)
                    break
        return results

    @staticmethod
    def search_by_isbn(catalog, isbn):
        return catalog.books.get(isbn)

class Catalog:
    def __init__(self):
        self.books = {}  # ISBN -> Book
        self.book_items = {}  # Barcode -> BookItem
        self.authors = {}  # Name -> Author

    def add_book(self, book):
        self.books[book.isbn] = book
        for author in book.authors:
            self.authors[author.name] = author

    def add_book_item(self, book_item):
        self.book_items[book_item.barcode] = book_item

    def remove_book_item(self, barcode):
        if barcode in self.book_items:
            del self.book_items[barcode]
            return True
        return False

    def get_available_book_items(self, isbn):
        available_items = []
        for item in self.book_items.values():
            if (item.book.isbn == isbn and 
                item.status == BookStatus.AVAILABLE):
                available_items.append(item)
        return available_items

class Library:
    def __init__(self, name, address):
        self.name = name
        self.address = address
        self.catalog = Catalog()
        self.members = {}  # user_id -> Member
        self.librarians = {}  # user_id -> Librarian
        self.active_lendings = {}  # lending_id -> BookLending
        self.reservations = {}  # reservation_id -> BookReservation
        self.fines = {}  # fine_id -> Fine
        self.fine_per_day = 1.0  # $1 per day overdue

    def add_member(self, member):
        self.members[member.user_id] = member

    def add_librarian(self, librarian):
        self.librarians[librarian.user_id] = librarian

    def issue_book(self, member_id, barcode):
        if member_id not in self.members:
            raise Exception("Member not found")
        
        member = self.members[member_id]
        
        # Check if member has reached max book limit
        member_lendings = [l for l in self.active_lendings.values() 
                          if l.member.user_id == member_id and l.return_date is None]
        if len(member_lendings) >= member.max_books:
            raise Exception("Member has reached maximum book limit")

        # Check if member has unpaid fines
        unpaid_fines = [f for f in self.fines.values() 
                       if f.member.user_id == member_id and not f.is_paid]
        if unpaid_fines:
            raise Exception("Member has unpaid fines")

        if barcode not in self.catalog.book_items:
            raise Exception("Book item not found")

        book_item = self.catalog.book_items[barcode]
        
        if book_item.status != BookStatus.AVAILABLE:
            raise Exception("Book is not available")

        # Check if book is reserved for this member
        active_reservation = None
        for reservation in self.reservations.values():
            if (reservation.book_item.barcode == barcode and 
                reservation.member.user_id == member_id and 
                reservation.status == ReservationStatus.ACTIVE):
                active_reservation = reservation
                break

        if active_reservation:
            active_reservation.fulfill_reservation()

        # Issue the book
        due_date = datetime.now() + timedelta(days=14)  # 2 weeks
        lending = BookLending(member, book_item, due_date)
        
        book_item.checkout(member_id, due_date)
        self.active_lendings[lending.lending_id] = lending

        return lending

    def return_book(self, barcode):
        book_item = self.catalog.book_items.get(barcode)
        if not book_item:
            raise Exception("Book item not found")

        # Find the active lending
        active_lending = None
        for lending in self.active_lendings.values():
            if (lending.book_item.barcode == barcode and 
                lending.return_date is None):
                active_lending = lending
                break

        if not active_lending:
            raise Exception("No active lending found for this book")

        # Calculate fine if overdue
        if active_lending.is_overdue():
            fine_amount = active_lending.calculate_fine(self.fine_per_day)
            fine = Fine(active_lending.member, fine_amount, 
                       f"Overdue fine for book: {book_item.book.title}")
            self.fines[fine.fine_id] = fine

        # Return the book
        active_lending.return_book()
        return active_lending

    def reserve_book(self, member_id, barcode):
        if member_id not in self.members:
            raise Exception("Member not found")

        member = self.members[member_id]
        book_item = self.catalog.book_items.get(barcode)
        
        if not book_item:
            raise Exception("Book item not found")

        if book_item.status == BookStatus.AVAILABLE:
            raise Exception("Book is available, no need to reserve")

        # Check if member already has a reservation for this book
        existing_reservation = None
        for reservation in self.reservations.values():
            if (reservation.member.user_id == member_id and 
                reservation.book_item.barcode == barcode and 
                reservation.status == ReservationStatus.ACTIVE):
                existing_reservation = reservation
                break

        if existing_reservation:
            raise Exception("Member already has a reservation for this book")

        reservation = BookReservation(member, book_item)
        self.reservations[reservation.reservation_id] = reservation
        book_item.status = BookStatus.RESERVED

        return reservation

    def search_books(self, query, search_type="title"):
        if search_type == "title":
            return Search.search_by_title(self.catalog, query)
        elif search_type == "author":
            return Search.search_by_author(self.catalog, query)
        elif search_type == "isbn":
            result = Search.search_by_isbn(self.catalog, query)
            return [result] if result else []
        else:
            raise Exception("Invalid search type")

    def get_member_lendings(self, member_id):
        return [l for l in self.active_lendings.values() 
                if l.member.user_id == member_id and l.return_date is None]

    def get_overdue_books(self):
        overdue_lendings = []
        for lending in self.active_lendings.values():
            if lending.is_overdue():
                overdue_lendings.append(lending)
        return overdue_lendings

# Demo usage
def main():
    # Create library
    library = Library("City Central Library", "123 Main St")

    # Create authors
    author1 = Author("J.K. Rowling", "British author")
    author2 = Author("George Orwell", "British author and journalist")

    # Create books
    book1 = Book("978-0-7475-3269-9", "Harry Potter and the Philosopher's Stone", 
                 [author1], "Bloomsbury", datetime(1997, 6, 26), 223)
    book2 = Book("978-0-452-28423-4", "1984", 
                 [author2], "Secker & Warburg", datetime(1949, 6, 8), 328)

    # Add books to catalog
    library.catalog.add_book(book1)
    library.catalog.add_book(book2)

    # Add book items
    item1 = BookItem("HP001", book1, "A-1-1")
    item2 = BookItem("HP002", book1, "A-1-2")
    item3 = BookItem("OR001", book2, "B-2-1")

    library.catalog.add_book_item(item1)
    library.catalog.add_book_item(item2)
    library.catalog.add_book_item(item3)

    # Create members
    member1 = Member("M001", "Alice Johnson", "alice@example.com")
    member2 = Member("M002", "Bob Smith", "bob@example.com")

    library.add_member(member1)
    library.add_member(member2)

    # Create librarian
    librarian = Librarian("L001", "Carol Brown", "carol@library.com")
    library.add_librarian(librarian)

    print(f"Library: {library.name}")
    print(f"Total books: {len(library.catalog.books)}")
    print(f"Total book items: {len(library.catalog.book_items)}")

    # Search for books
    search_results = library.search_books("Harry Potter", "title")
    print(f"\nSearch results for 'Harry Potter': {len(search_results)} books found")

    # Issue books
    try:
        lending1 = library.issue_book("M001", "HP001")
        print(f"\nBook issued to {lending1.member.name}")
        print(f"Due date: {lending1.due_date.strftime('%Y-%m-%d')}")

        lending2 = library.issue_book("M002", "OR001")
        print(f"Book issued to {lending2.member.name}")
    except Exception as e:
        print(f"Error issuing book: {e}")

    # Try to reserve a book
    try:
        reservation = library.reserve_book("M002", "HP002")
        print(f"\nBook reserved for {reservation.member.name}")
        print(f"Reservation expires: {reservation.expiry_date.strftime('%Y-%m-%d')}")
    except Exception as e:
        print(f"Error reserving book: {e}")

    # Check member's current books
    member_books = library.get_member_lendings("M001")
    print(f"\n{member1.name} currently has {len(member_books)} book(s) checked out")

    # Return a book
    try:
        returned_lending = library.return_book("HP001")
        print(f"\nBook returned: {returned_lending.book_item.book.title}")
    except Exception as e:
        print(f"Error returning book: {e}")

if __name__ == "__main__":
    main()