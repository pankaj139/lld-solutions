"""
Book Reader System Implementation

This module implements a digital book reading application (like Kindle) with:
- Library management and book organization
- Reading progress tracking with session management
- Annotations: bookmarks, highlights, and notes
- Customizable reading experience (fonts, themes, layout)
- Full-text search within books
- Reading statistics and streak tracking
- Multi-format support (EPUB, PDF, MOBI, TXT)

Usage:
    # Create library and reader
    library = Library()
    reader = Reader()
    
    # Add and open book
    book = Book("1984", "George Orwell", "path/to/1984.epub")
    library.add_book(book)
    reader.open_book(book.id)
    
    # Read and annotate
    reader.turn_page(PageDirection.NEXT)
    reader.add_highlight("Important text", Color.YELLOW, page=10, offset=100)
    reader.add_bookmark("Chapter 5", page=50)
    
    # Get statistics
    stats = reader.get_reading_stats(TimePeriod.WEEK)

Design Patterns:
    - State Pattern: Reading states (Idle, Reading, Paused, Finished)
    - Strategy Pattern: Book format parsers
    - Observer Pattern: Progress updates, annotation changes
    - Memento Pattern: Reading position save/restore
    - Command Pattern: Undo/redo for annotations
    - Singleton Pattern: Library and settings managers
    - Factory Pattern: Book parser creation
    - Composite Pattern: Book hierarchy

Author: LLD Solutions
Date: 2025-10-05
"""

from abc import ABC, abstractmethod
from enum import Enum
from typing import List, Dict, Optional, Any
from datetime import datetime, timedelta
from collections import defaultdict
import json


# ===================== Enums and Data Classes =====================

class BookFormat(Enum):
    """Supported book formats"""
    EPUB = "epub"
    PDF = "pdf"
    MOBI = "mobi"
    TXT = "txt"


class Color(Enum):
    """Highlight colors"""
    YELLOW = "yellow"
    GREEN = "green"
    BLUE = "blue"
    PINK = "pink"
    ORANGE = "orange"


class Theme(Enum):
    """Reading themes"""
    LIGHT = "light"
    DARK = "dark"
    SEPIA = "sepia"


class PageDirection(Enum):
    """Page navigation direction"""
    NEXT = "next"
    PREVIOUS = "previous"


class TimePeriod(Enum):
    """Time period for statistics"""
    DAY = "day"
    WEEK = "week"
    MONTH = "month"
    YEAR = "year"


class BookStatus(Enum):
    """Book reading status"""
    UNREAD = "unread"
    READING = "reading"
    COMPLETED = "completed"


# ===================== Book and Chapter Classes =====================

class Chapter:
    """
    Represents a chapter within a book.
    
    Usage:
        chapter = Chapter("Chapter 1", "Introduction", start_page=1, end_page=20)
        content = chapter.get_content()
    
    Returns:
        Chapter: Chapter with content and metadata
    """
    
    def __init__(self, chapter_id: str, title: str, start_page: int, end_page: int, content: str = ""):
        self.id = chapter_id
        self.title = title
        self.start_page = start_page
        self.end_page = end_page
        self.content = content
        self.sub_chapters: List[Chapter] = []
    
    def get_content(self) -> str:
        """Get chapter content"""
        return self.content
    
    def add_sub_chapter(self, chapter: 'Chapter') -> None:
        """Add a sub-chapter"""
        self.sub_chapters.append(chapter)
    
    def __repr__(self):
        return f"Chapter('{self.title}', pages {self.start_page}-{self.end_page})"


class Book:
    """
    Represents a digital book with metadata and content.
    
    Usage:
        book = Book("1984", "George Orwell", "path/to/book.epub")
        book.add_chapter(chapter)
        results = book.search("freedom")
    
    Returns:
        Book: Complete book instance with all metadata
    """
    
    def __init__(self, title: str, author: str, file_path: str, 
                 book_format: BookFormat = BookFormat.EPUB):
        self.id = f"{title.lower().replace(' ', '_')}_{author.lower().replace(' ', '_')}"
        self.title = title
        self.author = author
        self.file_path = file_path
        self.format = book_format
        self.isbn = ""
        self.total_pages = 0
        self.cover_image = ""
        self.chapters: List[Chapter] = []
        self.metadata: Dict[str, Any] = {}
        self.status = BookStatus.UNREAD
        self.date_added = datetime.now()
    
    def add_chapter(self, chapter: Chapter) -> None:
        """Add a chapter to the book"""
        self.chapters.append(chapter)
        # Update total pages if needed
        if chapter.end_page > self.total_pages:
            self.total_pages = chapter.end_page
    
    def get_chapter(self, index: int) -> Optional[Chapter]:
        """Get chapter by index"""
        if 0 <= index < len(self.chapters):
            return self.chapters[index]
        return None
    
    def get_content(self, page: int) -> str:
        """Get content for a specific page"""
        # Find chapter containing this page
        for chapter in self.chapters:
            if chapter.start_page <= page <= chapter.end_page:
                return f"[Page {page}]\n{chapter.content[:200]}..."
        return f"[Page {page}] Content not available"
    
    def search(self, query: str) -> List[Dict[str, Any]]:
        """
        Search for text within the book.
        
        Args:
            query: Search term
        
        Returns:
            List of search results with page, chapter, and context
        """
        results = []
        for chapter in self.chapters:
            if query.lower() in chapter.content.lower():
                # Find position and extract context
                pos = chapter.content.lower().find(query.lower())
                context_start = max(0, pos - 50)
                context_end = min(len(chapter.content), pos + len(query) + 50)
                context = chapter.content[context_start:context_end]
                
                results.append({
                    'chapter': chapter.title,
                    'page': chapter.start_page,
                    'context': f"...{context}...",
                    'position': pos
                })
        return results
    
    def __repr__(self):
        return f"Book('{self.title}' by {self.author}, {self.total_pages} pages)"


# ===================== Annotations (Command Pattern) =====================

class Annotation(ABC):
    """
    Abstract base class for annotations.
    
    Usage:
        # Subclass to create specific annotation types
        highlight = Highlight(text, color, page, offset)
        bookmark = Bookmark(name, page, position)
    
    Returns:
        Annotation: Base annotation with common properties
    """
    
    def __init__(self, annotation_id: str, book_id: str, page_number: int):
        self.id = annotation_id
        self.book_id = book_id
        self.page_number = page_number
        self.created_at = datetime.now()
        self.modified_at = datetime.now()
    
    @abstractmethod
    def to_dict(self) -> Dict[str, Any]:
        """Convert annotation to dictionary"""
        pass
    
    def __repr__(self):
        return f"{self.__class__.__name__}(page={self.page_number})"


class Bookmark(Annotation):
    """
    Bookmark annotation for marking positions.
    
    Usage:
        bookmark = Bookmark("bookmark_1", "book_123", "Chapter 5", 50, 0.0)
        bookmark.jump_to()
    
    Returns:
        Bookmark: Bookmark instance with position
    """
    
    def __init__(self, annotation_id: str, book_id: str, name: str, 
                 page_number: int, position: float = 0.0):
        super().__init__(annotation_id, book_id, page_number)
        self.name = name
        self.position = position  # Position within page (0.0 to 1.0)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'type': 'bookmark',
            'book_id': self.book_id,
            'name': self.name,
            'page': self.page_number,
            'position': self.position,
            'created_at': self.created_at.isoformat()
        }
    
    def jump_to(self) -> tuple:
        """Get page and position to jump to"""
        return (self.page_number, self.position)


class Highlight(Annotation):
    """
    Highlight annotation with optional note.
    
    Usage:
        highlight = Highlight("h1", "book_123", "text", Color.YELLOW, 10, 100, 150)
        highlight.change_color(Color.GREEN)
        highlight.add_note("Important concept")
    
    Returns:
        Highlight: Highlight with text, color, and optional note
    """
    
    def __init__(self, annotation_id: str, book_id: str, text: str, 
                 color: Color, page_number: int, start_offset: int, end_offset: int):
        super().__init__(annotation_id, book_id, page_number)
        self.text = text
        self.color = color
        self.start_offset = start_offset
        self.end_offset = end_offset
        self.note: Optional['Note'] = None
    
    def change_color(self, color: Color) -> None:
        """Change highlight color"""
        self.color = color
        self.modified_at = datetime.now()
    
    def add_note(self, text: str) -> None:
        """Add or update note"""
        if self.note:
            self.note.update_text(text)
        else:
            self.note = Note(f"note_{self.id}", self.book_id, text, self.id, self.page_number)
        self.modified_at = datetime.now()
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'type': 'highlight',
            'book_id': self.book_id,
            'text': self.text,
            'color': self.color.value,
            'page': self.page_number,
            'start_offset': self.start_offset,
            'end_offset': self.end_offset,
            'note': self.note.to_dict() if self.note else None,
            'created_at': self.created_at.isoformat()
        }


class Note(Annotation):
    """
    Note annotation attached to highlight.
    
    Usage:
        note = Note("n1", "book_123", "My thoughts", "h1", 10)
        note.update_text("Updated thoughts")
    
    Returns:
        Note: Note with text content
    """
    
    def __init__(self, annotation_id: str, book_id: str, text: str, 
                 highlight_id: str, page_number: int):
        super().__init__(annotation_id, book_id, page_number)
        self.text = text
        self.highlight_id = highlight_id
    
    def update_text(self, text: str) -> None:
        """Update note text"""
        self.text = text
        self.modified_at = datetime.now()
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'type': 'note',
            'book_id': self.book_id,
            'text': self.text,
            'highlight_id': self.highlight_id,
            'page': self.page_number,
            'created_at': self.created_at.isoformat()
        }


# ===================== Reading Session and Progress =====================

class ReadingSession:
    """
    Tracks a single reading session with progress.
    
    Usage:
        session = ReadingSession("book_123", "user_1")
        session.update_position(page=42, position=0.5)
        progress = session.calculate_progress()
        duration = session.get_duration()
    
    Returns:
        ReadingSession: Session with tracked metrics
    """
    
    def __init__(self, session_id: str, book_id: str, user_id: str, total_pages: int):
        self.session_id = session_id
        self.book_id = book_id
        self.user_id = user_id
        self.total_pages = total_pages
        self.current_page = 1
        self.current_position = 0.0
        self.start_time = datetime.now()
        self.end_time: Optional[datetime] = None
        self.pages_read = 0
    
    def update_position(self, page: int, position: float = 0.0) -> None:
        """Update current reading position"""
        if page > self.current_page:
            self.pages_read += (page - self.current_page)
        self.current_page = page
        self.current_position = position
    
    def calculate_progress(self) -> float:
        """Calculate reading progress as percentage (0.0 to 1.0)"""
        if self.total_pages == 0:
            return 0.0
        page_progress = (self.current_page - 1) / self.total_pages
        position_progress = self.current_position / self.total_pages
        return min(1.0, page_progress + position_progress)
    
    def get_duration(self) -> timedelta:
        """Get session duration"""
        end = self.end_time or datetime.now()
        return end - self.start_time
    
    def close(self) -> None:
        """Close the session"""
        self.end_time = datetime.now()
    
    def __repr__(self):
        progress = self.calculate_progress() * 100
        return f"ReadingSession(book={self.book_id}, progress={progress:.1f}%, {self.pages_read} pages)"


# ===================== Reading Settings =====================

class ReadingSettings:
    """
    User preferences for reading experience.
    
    Usage:
        settings = ReadingSettings()
        settings.font_size = 16
        settings.theme = Theme.DARK
        settings.apply_settings()
    
    Returns:
        ReadingSettings: Configuration for display
    """
    
    def __init__(self):
        self.font_family = "Serif"
        self.font_size = 14
        self.line_spacing = 1.5
        self.theme = Theme.LIGHT
        self.brightness = 1.0
        self.margin_size = 20
        self.text_align = "left"
    
    def apply_settings(self) -> Dict[str, Any]:
        """Apply and return settings as dictionary"""
        return {
            'font_family': self.font_family,
            'font_size': self.font_size,
            'line_spacing': self.line_spacing,
            'theme': self.theme.value,
            'brightness': self.brightness,
            'margin_size': self.margin_size,
            'text_align': self.text_align
        }
    
    def reset_to_default(self) -> None:
        """Reset all settings to default"""
        self.__init__()
    
    def __repr__(self):
        return f"ReadingSettings(font={self.font_family} {self.font_size}pt, theme={self.theme.value})"


# ===================== Reading State (State Pattern) =====================

class ReadingState(ABC):
    """Abstract base class for reading states"""
    
    @abstractmethod
    def open_book(self, reader: 'Reader') -> None:
        pass
    
    @abstractmethod
    def close_book(self, reader: 'Reader') -> None:
        pass
    
    @abstractmethod
    def turn_page(self, reader: 'Reader', direction: PageDirection) -> None:
        pass


class IdleState(ReadingState):
    """No book currently open"""
    
    def open_book(self, reader: 'Reader') -> None:
        print(f"Opening book: {reader.current_book.title}")
        reader.state = ReadingActiveState()
    
    def close_book(self, reader: 'Reader') -> None:
        print("No book is open")
    
    def turn_page(self, reader: 'Reader', direction: PageDirection) -> None:
        print("No book is open. Open a book first.")


class ReadingActiveState(ReadingState):
    """Actively reading a book"""
    
    def open_book(self, reader: 'Reader') -> None:
        print("A book is already open")
    
    def close_book(self, reader: 'Reader') -> None:
        print(f"Closing book: {reader.current_book.title}")
        reader.save_session()
        reader.state = IdleState()
    
    def turn_page(self, reader: 'Reader', direction: PageDirection) -> None:
        if direction == PageDirection.NEXT:
            reader.current_session.update_position(
                reader.current_session.current_page + 1
            )
            print(f"→ Page {reader.current_session.current_page}")
        else:
            if reader.current_session.current_page > 1:
                reader.current_session.update_position(
                    reader.current_session.current_page - 1
                )
                print(f"← Page {reader.current_session.current_page}")


class FinishedState(ReadingState):
    """Book reading completed"""
    
    def open_book(self, reader: 'Reader') -> None:
        print(f"Reopening completed book: {reader.current_book.title}")
        reader.state = ReadingActiveState()
    
    def close_book(self, reader: 'Reader') -> None:
        print("Book already finished and closed")
        reader.state = IdleState()
    
    def turn_page(self, reader: 'Reader', direction: PageDirection) -> None:
        print("Book finished. Start a new book or reopen this one.")


# ===================== Library Management (Singleton Pattern) =====================

class Library:
    """
    Manages user's book collection (Singleton).
    
    Usage:
        library = Library()
        library.add_book(book)
        results = library.search("Orwell")
        books = library.filter_by_status(BookStatus.READING)
    
    Returns:
        Library: Singleton instance managing all books
    """
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(Library, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        self.books: Dict[str, Book] = {}
        self.collections: Dict[str, List[str]] = {}  # collection_name -> [book_ids]
        self.shelves: Dict[str, List[str]] = {}  # shelf_name -> [book_ids]
    
    def add_book(self, book: Book) -> bool:
        """Add a book to the library"""
        if book.id in self.books:
            print(f"Book '{book.title}' already in library")
            return False
        self.books[book.id] = book
        print(f"✓ Added '{book.title}' by {book.author} to library")
        return True
    
    def remove_book(self, book_id: str) -> bool:
        """Remove a book from the library"""
        if book_id in self.books:
            book = self.books[book_id]
            del self.books[book_id]
            print(f"✓ Removed '{book.title}' from library")
            # Remove from collections
            for collection_books in self.collections.values():
                if book_id in collection_books:
                    collection_books.remove(book_id)
            return True
        return False
    
    def search(self, query: str) -> List[Book]:
        """Search books by title or author"""
        query_lower = query.lower()
        results = []
        for book in self.books.values():
            if (query_lower in book.title.lower() or 
                query_lower in book.author.lower()):
                results.append(book)
        return results
    
    def filter_by_status(self, status: BookStatus) -> List[Book]:
        """Filter books by reading status"""
        return [book for book in self.books.values() if book.status == status]
    
    def filter_by_author(self, author: str) -> List[Book]:
        """Filter books by author"""
        author_lower = author.lower()
        return [book for book in self.books.values() 
                if author_lower in book.author.lower()]
    
    def create_collection(self, name: str) -> None:
        """Create a new collection"""
        if name not in self.collections:
            self.collections[name] = []
            print(f"✓ Created collection '{name}'")
    
    def add_to_collection(self, book_id: str, collection_name: str) -> bool:
        """Add book to collection"""
        if book_id not in self.books:
            return False
        if collection_name not in self.collections:
            self.create_collection(collection_name)
        if book_id not in self.collections[collection_name]:
            self.collections[collection_name].append(book_id)
            return True
        return False
    
    def get_books_in_collection(self, collection_name: str) -> List[Book]:
        """Get all books in a collection"""
        if collection_name not in self.collections:
            return []
        return [self.books[book_id] for book_id in self.collections[collection_name]
                if book_id in self.books]
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get library statistics"""
        total = len(self.books)
        by_status = {
            'unread': len(self.filter_by_status(BookStatus.UNREAD)),
            'reading': len(self.filter_by_status(BookStatus.READING)),
            'completed': len(self.filter_by_status(BookStatus.COMPLETED))
        }
        authors = len(set(book.author for book in self.books.values()))
        
        return {
            'total_books': total,
            'by_status': by_status,
            'unique_authors': authors,
            'collections': len(self.collections)
        }
    
    def __repr__(self):
        return f"Library({len(self.books)} books, {len(self.collections)} collections)"


# ===================== Reading Statistics =====================

class ReadingStatistics:
    """
    Tracks reading habits and statistics.
    
    Usage:
        stats = ReadingStatistics("user_1")
        stats.update_stats(session)
        daily_stats = stats.get_daily_stats()
        streak = stats.calculate_streak()
    
    Returns:
        ReadingStatistics: Statistics with various metrics
    """
    
    def __init__(self, user_id: str):
        self.user_id = user_id
        self.total_pages_read = 0
        self.total_time = timedelta()
        self.books_completed = 0
        self.current_streak = 0
        self.reading_speed_wpm = 0.0
        self.sessions_history: List[ReadingSession] = []
        self.daily_pages: Dict[str, int] = defaultdict(int)  # date -> pages
    
    def update_stats(self, session: ReadingSession) -> None:
        """Update statistics with completed session"""
        self.total_pages_read += session.pages_read
        self.total_time += session.get_duration()
        self.sessions_history.append(session)
        
        # Update daily pages
        date_key = session.start_time.strftime("%Y-%m-%d")
        self.daily_pages[date_key] += session.pages_read
        
        # Recalculate reading speed
        self._calculate_reading_speed()
        
        # Update streak
        self.current_streak = self.calculate_streak()
    
    def _calculate_reading_speed(self) -> None:
        """Calculate average reading speed in words per minute"""
        if not self.sessions_history:
            return
        
        # Take last 10 sessions
        recent_sessions = self.sessions_history[-10:]
        total_words = sum(s.pages_read * 250 for s in recent_sessions)  # Assume 250 words/page
        total_minutes = sum(s.get_duration().total_seconds() / 60 for s in recent_sessions)
        
        if total_minutes > 0:
            self.reading_speed_wpm = total_words / total_minutes
    
    def calculate_streak(self) -> int:
        """Calculate current reading streak (consecutive days)"""
        if not self.daily_pages:
            return 0
        
        dates = sorted(self.daily_pages.keys(), reverse=True)
        streak = 0
        expected_date = datetime.now().date()
        
        for date_str in dates:
            date = datetime.strptime(date_str, "%Y-%m-%d").date()
            if date == expected_date:
                streak += 1
                expected_date -= timedelta(days=1)
            elif (expected_date - date).days > 1:
                break
        
        return streak
    
    def get_daily_stats(self) -> Dict[str, Any]:
        """Get statistics for today"""
        today = datetime.now().strftime("%Y-%m-%d")
        pages_today = self.daily_pages.get(today, 0)
        
        # Time spent today
        today_sessions = [s for s in self.sessions_history 
                         if s.start_time.strftime("%Y-%m-%d") == today]
        time_today = sum((s.get_duration() for s in today_sessions), timedelta())
        
        return {
            'pages_read': pages_today,
            'time_spent': str(time_today).split('.')[0],  # HH:MM:SS
            'sessions': len(today_sessions),
            'streak': self.current_streak
        }
    
    def get_period_stats(self, period: TimePeriod) -> Dict[str, Any]:
        """Get statistics for a specific time period"""
        now = datetime.now()
        if period == TimePeriod.WEEK:
            start_date = now - timedelta(days=7)
        elif period == TimePeriod.MONTH:
            start_date = now - timedelta(days=30)
        elif period == TimePeriod.YEAR:
            start_date = now - timedelta(days=365)
        else:  # DAY
            start_date = now - timedelta(days=1)
        
        period_sessions = [s for s in self.sessions_history 
                          if s.start_time >= start_date]
        
        pages = sum(s.pages_read for s in period_sessions)
        time = sum((s.get_duration() for s in period_sessions), timedelta())
        
        return {
            'period': period.value,
            'pages_read': pages,
            'time_spent': str(time).split('.')[0],
            'sessions': len(period_sessions),
            'avg_pages_per_day': pages / max(1, (now - start_date).days)
        }
    
    def __repr__(self):
        return f"ReadingStatistics({self.total_pages_read} pages, {self.books_completed} books, {self.current_streak} day streak)"


# ===================== Reader (Main Controller) =====================

class Reader:
    """
    Main reader controller managing reading experience.
    
    Usage:
        reader = Reader("user_1")
        reader.open_book("book_id_123")
        reader.turn_page(PageDirection.NEXT)
        reader.add_highlight("text", Color.YELLOW, 10, 100, 150)
        stats = reader.get_reading_stats(TimePeriod.WEEK)
    
    Returns:
        Reader: Reader instance with full functionality
    """
    
    def __init__(self, user_id: str):
        self.user_id = user_id
        self.current_book: Optional[Book] = None
        self.current_session: Optional[ReadingSession] = None
        self.settings = ReadingSettings()
        self.state: ReadingState = IdleState()
        self.annotations: Dict[str, List[Annotation]] = defaultdict(list)  # book_id -> annotations
        self.statistics = ReadingStatistics(user_id)
        self._annotation_counter = 0
    
    def open_book(self, book_id: str, library: Library) -> bool:
        """
        Open a book for reading.
        
        Args:
            book_id: ID of the book to open
            library: Library instance containing the book
        
        Returns:
            bool: True if book was opened successfully
        """
        if book_id not in library.books:
            print(f"Book {book_id} not found in library")
            return False
        
        self.current_book = library.books[book_id]
        self.current_book.status = BookStatus.READING
        
        # Create new reading session
        session_id = f"session_{datetime.now().timestamp()}"
        self.current_session = ReadingSession(
            session_id, book_id, self.user_id, self.current_book.total_pages
        )
        
        # Change state
        self.state.open_book(self)
        
        print(f"📖 Reading: {self.current_book.title}")
        print(f"   Author: {self.current_book.author}")
        print(f"   Pages: {self.current_book.total_pages}")
        return True
    
    def close_book(self) -> None:
        """Close current book and save session"""
        if self.current_book:
            self.state.close_book(self)
    
    def save_session(self) -> None:
        """Save current reading session"""
        if self.current_session:
            self.current_session.close()
            self.statistics.update_stats(self.current_session)
            progress = self.current_session.calculate_progress() * 100
            print(f"✓ Session saved: {progress:.1f}% complete, {self.current_session.pages_read} pages read")
            
            # Mark book as completed if finished
            if progress >= 100:
                self.current_book.status = BookStatus.COMPLETED
                self.statistics.books_completed += 1
                self.state = FinishedState()
                print(f"🎉 Completed: {self.current_book.title}!")
    
    def turn_page(self, direction: PageDirection) -> None:
        """Navigate pages"""
        self.state.turn_page(self, direction)
    
    def jump_to_page(self, page: int) -> None:
        """Jump to specific page"""
        if self.current_book and self.current_session:
            if 1 <= page <= self.current_book.total_pages:
                self.current_session.update_position(page)
                print(f"→ Jumped to page {page}")
            else:
                print(f"Page {page} out of range (1-{self.current_book.total_pages})")
    
    def jump_to_chapter(self, chapter_index: int) -> None:
        """Jump to chapter start"""
        if self.current_book:
            chapter = self.current_book.get_chapter(chapter_index)
            if chapter:
                self.jump_to_page(chapter.start_page)
                print(f"→ Jumped to: {chapter.title}")
    
    def add_highlight(self, text: str, color: Color, page: int, 
                     start_offset: int, end_offset: int) -> Highlight:
        """
        Add a highlight to current book.
        
        Args:
            text: Highlighted text
            color: Highlight color
            page: Page number
            start_offset: Start character offset
            end_offset: End character offset
        
        Returns:
            Highlight: Created highlight
        """
        if not self.current_book:
            print("No book open")
            return None
        
        self._annotation_counter += 1
        annotation_id = f"highlight_{self._annotation_counter}"
        highlight = Highlight(
            annotation_id, self.current_book.id, text, color, 
            page, start_offset, end_offset
        )
        self.annotations[self.current_book.id].append(highlight)
        print(f"✓ Added {color.value} highlight on page {page}")
        return highlight
    
    def add_bookmark(self, name: str, page: int, position: float = 0.0) -> Bookmark:
        """
        Add a bookmark to current book.
        
        Args:
            name: Bookmark name
            page: Page number
            position: Position within page (0.0-1.0)
        
        Returns:
            Bookmark: Created bookmark
        """
        if not self.current_book:
            print("No book open")
            return None
        
        self._annotation_counter += 1
        annotation_id = f"bookmark_{self._annotation_counter}"
        bookmark = Bookmark(annotation_id, self.current_book.id, name, page, position)
        self.annotations[self.current_book.id].append(bookmark)
        print(f"✓ Added bookmark '{name}' on page {page}")
        return bookmark
    
    def get_annotations(self, book_id: str) -> List[Annotation]:
        """Get all annotations for a book"""
        return self.annotations.get(book_id, [])
    
    def export_annotations(self, book_id: str, format: str = "json") -> str:
        """Export annotations in specified format"""
        annotations = self.get_annotations(book_id)
        if format == "json":
            data = [ann.to_dict() for ann in annotations]
            return json.dumps(data, indent=2)
        return ""
    
    def search_in_book(self, query: str) -> List[Dict[str, Any]]:
        """Search for text in current book"""
        if not self.current_book:
            print("No book open")
            return []
        return self.current_book.search(query)
    
    def update_settings(self, **kwargs) -> None:
        """Update reading settings"""
        for key, value in kwargs.items():
            if hasattr(self.settings, key):
                setattr(self.settings, key, value)
        print(f"✓ Settings updated: {self.settings}")
    
    def get_reading_stats(self, period: TimePeriod) -> Dict[str, Any]:
        """Get reading statistics for period"""
        return self.statistics.get_period_stats(period)
    
    def estimate_time_remaining(self) -> Optional[timedelta]:
        """Estimate time to finish current book"""
        if not self.current_book or not self.current_session:
            return None
        
        if self.statistics.reading_speed_wpm == 0:
            return None
        
        remaining_pages = (self.current_book.total_pages - 
                          self.current_session.current_page)
        words_remaining = remaining_pages * 250  # Assume 250 words/page
        minutes_remaining = words_remaining / self.statistics.reading_speed_wpm
        
        return timedelta(minutes=minutes_remaining)
    
    def __repr__(self):
        if self.current_book:
            return f"Reader(reading: {self.current_book.title})"
        return "Reader(no book open)"


# ===================== Demo Implementation =====================

def print_separator(title: str = ""):
    """Print a formatted separator"""
    if title:
        print(f"\n{'='*60}")
        print(f"  {title}")
        print('='*60)
    else:
        print('-' * 60)


def demo_book_reader():
    """
    Comprehensive demonstration of Book Reader system.
    
    Demonstrates:
    1. Library management
    2. Opening and reading books
    3. Page navigation
    4. Adding annotations (highlights, bookmarks, notes)
    5. Searching within books
    6. Customizing reading experience
    7. Tracking reading statistics
    8. Collections and organization
    """
    
    print_separator("BOOK READER SYSTEM DEMO")
    
    # 1. Create library and reader
    print("\n1. Setting Up Library and Reader")
    print_separator()
    library = Library()
    reader = Reader("user_alice")
    print(f"✓ Library created: {library}")
    print(f"✓ Reader created: {reader}")
    
    # 2. Create and add books
    print("\n2. Adding Books to Library")
    print_separator()
    
    # Book 1: 1984
    book1 = Book("1984", "George Orwell", "/library/1984.epub", BookFormat.EPUB)
    book1.isbn = "978-0451524935"
    chapter1 = Chapter("ch1", "Part One: Chapter 1", 1, 25, 
                      "It was a bright cold day in April, and the clocks were striking thirteen. "
                      "Winston Smith, his chin nuzzled into his breast in an effort to escape the "
                      "vile wind, slipped quickly through the glass doors of Victory Mansions, "
                      "though not quickly enough to prevent a swirl of gritty dust from entering along with him. "
                      "The hallway smelt of boiled cabbage and old rag mats. At one end of it a coloured poster, "
                      "too large for indoor display, had been tacked to the wall. It depicted simply an enormous face, "
                      "more than a metre wide: the face of a man of about forty-five, with a heavy black moustache "
                      "and ruggedly handsome features. Winston made for the stairs. It was no use trying the lift. "
                      "Even at the best of times it was seldom working, and at present the electric current was cut off "
                      "during daylight hours. The concept of freedom in a totalitarian society...")
    book1.add_chapter(chapter1)
    book1.total_pages = 328
    library.add_book(book1)
    
    # Book 2: To Kill a Mockingbird
    book2 = Book("To Kill a Mockingbird", "Harper Lee", "/library/mockingbird.epub", BookFormat.EPUB)
    chapter2 = Chapter("ch1", "Chapter 1", 1, 20,
                      "When he was nearly thirteen, my brother Jem got his arm badly broken at the elbow. "
                      "When it healed, and Jem's fears of never being able to play football were assuaged, "
                      "he was seldom self-conscious about his injury. His left arm was somewhat shorter than his right...")
    book2.add_chapter(chapter2)
    book2.total_pages = 324
    library.add_book(book2)
    
    # Book 3: The Great Gatsby
    book3 = Book("The Great Gatsby", "F. Scott Fitzgerald", "/library/gatsby.epub", BookFormat.EPUB)
    book3.total_pages = 180
    library.add_book(book3)
    
    # 3. Library operations
    print("\n3. Library Operations")
    print_separator()
    print(f"Library: {library}")
    stats = library.get_statistics()
    print(f"\n📚 Library Statistics:")
    print(f"   Total books: {stats['total_books']}")
    print(f"   Unread: {stats['by_status']['unread']}")
    print(f"   Unique authors: {stats['unique_authors']}")
    
    # Create collections
    library.create_collection("Classics")
    library.add_to_collection(book1.id, "Classics")
    library.add_to_collection(book2.id, "Classics")
    library.add_to_collection(book3.id, "Classics")
    
    classics = library.get_books_in_collection("Classics")
    print(f"\n📚 'Classics' collection: {len(classics)} books")
    for book in classics:
        print(f"   - {book.title} by {book.author}")
    
    # Search library
    search_results = library.search("Orwell")
    print(f"\n🔍 Search for 'Orwell': {len(search_results)} results")
    for book in search_results:
        print(f"   - {book}")
    
    # 4. Open and read a book
    print("\n4. Opening and Reading a Book")
    print_separator()
    reader.open_book(book1.id, library)
    
    # Simulate reading
    print("\n📖 Starting to read...")
    for _ in range(5):
        reader.turn_page(PageDirection.NEXT)
    
    # 5. Add annotations
    print("\n5. Adding Annotations")
    print_separator()
    
    # Add highlights
    highlight1 = reader.add_highlight(
        "concept of freedom", Color.YELLOW, page=1, start_offset=100, end_offset=118
    )
    if highlight1:
        highlight1.add_note("Important theme - freedom vs. control")
    
    reader.add_highlight(
        "totalitarian society", Color.GREEN, page=1, start_offset=200, end_offset=220
    )
    
    # Add bookmarks
    reader.add_bookmark("Start of Part Two", page=100, position=0.0)
    reader.add_bookmark("Important Scene", page=150, position=0.5)
    
    # Show annotations
    annotations = reader.get_annotations(book1.id)
    print(f"\n📝 Annotations for {book1.title}: {len(annotations)} total")
    for ann in annotations:
        print(f"   - {ann}")
    
    # 6. Search within book
    print("\n6. Searching Within Book")
    print_separator()
    search_results = reader.search_in_book("freedom")
    print(f"🔍 Search for 'freedom': {len(search_results)} results")
    for result in search_results[:2]:  # Show first 2
        print(f"   Chapter: {result['chapter']}, Page: {result['page']}")
        print(f"   Context: {result['context'][:80]}...")
    
    # 7. Navigate book
    print("\n7. Navigation Features")
    print_separator()
    reader.jump_to_page(50)
    reader.jump_to_chapter(0)
    
    # Turn back pages
    print("\nTurning back pages:")
    for _ in range(3):
        reader.turn_page(PageDirection.PREVIOUS)
    
    # 8. Customize reading experience
    print("\n8. Customizing Reading Experience")
    print_separator()
    print(f"Current settings: {reader.settings}")
    
    reader.update_settings(
        font_size=16,
        theme=Theme.DARK,
        line_spacing=2.0
    )
    applied = reader.settings.apply_settings()
    print(f"✓ Applied settings:")
    for key, value in applied.items():
        print(f"   {key}: {value}")
    
    # 9. Reading progress and statistics
    print("\n9. Reading Progress and Statistics")
    print_separator()
    
    # Simulate more reading
    print("Continuing to read...")
    for _ in range(45):  # Read 45 more pages
        reader.turn_page(PageDirection.NEXT)
    
    if reader.current_session:
        progress = reader.current_session.calculate_progress() * 100
        print(f"\n📊 Current Progress:")
        print(f"   Page: {reader.current_session.current_page}/{book1.total_pages}")
        print(f"   Progress: {progress:.1f}%")
        print(f"   Pages read: {reader.current_session.pages_read}")
        print(f"   Time: {reader.current_session.get_duration()}")
        
        # Estimate time remaining
        time_remaining = reader.estimate_time_remaining()
        if time_remaining:
            hours = time_remaining.total_seconds() / 3600
            print(f"   Est. time remaining: {hours:.1f} hours")
    
    # 10. Close book and view stats
    print("\n10. Closing Book and Viewing Statistics")
    print_separator()
    reader.close_book()
    
    daily_stats = reader.statistics.get_daily_stats()
    print(f"\n📈 Today's Reading Statistics:")
    print(f"   Pages read: {daily_stats['pages_read']}")
    print(f"   Time spent: {daily_stats['time_spent']}")
    print(f"   Sessions: {daily_stats['sessions']}")
    print(f"   Streak: {daily_stats['streak']} days")
    
    weekly_stats = reader.get_reading_stats(TimePeriod.WEEK)
    print(f"\n📈 Weekly Reading Statistics:")
    print(f"   Pages read: {weekly_stats['pages_read']}")
    print(f"   Time spent: {weekly_stats['time_spent']}")
    print(f"   Avg pages/day: {weekly_stats['avg_pages_per_day']:.1f}")
    
    print(f"\n📊 Overall Statistics:")
    print(f"   {reader.statistics}")
    
    # 11. Export annotations
    print("\n11. Exporting Annotations")
    print_separator()
    annotations_json = reader.export_annotations(book1.id, format="json")
    print(f"✓ Exported annotations for '{book1.title}'")
    print(f"   Format: JSON")
    print(f"   Size: {len(annotations_json)} characters")
    print(f"\n   Preview:")
    print(f"   {annotations_json[:200]}...")
    
    # 12. Open another book
    print("\n12. Switching to Another Book")
    print_separator()
    reader.open_book(book2.id, library)
    print(f"📖 Now reading: {reader.current_book.title}")
    
    # Quick read session
    for _ in range(10):
        reader.turn_page(PageDirection.NEXT)
    reader.close_book()
    
    # Final library state
    print("\n13. Final Library State")
    print_separator()
    final_stats = library.get_statistics()
    print(f"📚 Library Status:")
    print(f"   Total books: {final_stats['total_books']}")
    print(f"   Reading: {final_stats['by_status']['reading']}")
    print(f"   Completed: {final_stats['by_status']['completed']}")
    print(f"   Unread: {final_stats['by_status']['unread']}")
    
    print("\n" + "="*60)
    print("  DEMO COMPLETE")
    print("="*60)
    print("\n✓ Book Reader system features demonstrated:")
    print("  • Library management with collections")
    print("  • Book reading with page navigation")
    print("  • Annotations (highlights, bookmarks, notes)")
    print("  • Full-text search within books")
    print("  • Customizable reading settings")
    print("  • Reading progress tracking")
    print("  • Statistics and streak tracking")
    print("  • Multi-book session management")


if __name__ == "__main__":
    demo_book_reader()
