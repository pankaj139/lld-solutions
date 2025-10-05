# Book Reader System - Low Level Design

## Table of Contents

- [Overview](#overview)
- [Requirements](#requirements)
  - [Functional Requirements](#functional-requirements)
  - [Non-Functional Requirements](#non-functional-requirements)
- [Core Use Cases](#core-use-cases)
- [Design Patterns Used](#design-patterns-used)
- [Class Diagram](#class-diagram)
- [Component Design](#component-design)
- [Data Structures](#data-structures)
- [API Design](#api-design)
- [Implementation Details](#implementation-details)
- [Business Rules](#business-rules)
- [Extension Points](#extension-points)
- [Complexity Analysis](#complexity-analysis)
- [Trade-offs and Design Decisions](#trade-offs-and-design-decisions)

## Overview

A Book Reader System is a digital reading application (like Kindle, Apple Books) that allows users to read, annotate, and manage a personal library of books. The system supports multiple book formats, provides customizable reading experiences, and tracks reading progress across devices.

### Key Features

- **Library Management**: Organize books by author, genre, reading status
- **Reading Progress**: Track position, time spent, pages read
- **Annotations**: Bookmarks, highlights, notes with colors
- **Customization**: Font size, typeface, theme (day/night/sepia)
- **Navigation**: Table of contents, search, page jump
- **Reading Statistics**: Daily goals, streaks, insights
- **Multi-Format Support**: EPUB, PDF, MOBI, TXT
- **Offline Reading**: Full functionality without internet

## Requirements

### Functional Requirements

1. **Library Management**
   - Add/remove books to library
   - Organize books by collections, shelves, tags
   - Search and filter library (author, genre, status)
   - Sort by title, author, date added, recently read

2. **Book Reading**
   - Open and read books
   - Navigate pages (next, previous, jump to page)
   - Table of contents navigation
   - Full-text search within book
   - Adjust reading position

3. **Reading Progress**
   - Track current page/position
   - Calculate percentage complete
   - Estimate time remaining
   - Reading history (sessions, duration)
   - Sync progress across devices

4. **Annotations**
   - Create/edit/delete bookmarks
   - Add highlights with colors
   - Attach notes to highlights
   - Export annotations
   - View all annotations for a book

5. **Customization**
   - Font family selection (serif, sans-serif, dyslexic-friendly)
   - Font size adjustment (8pt to 32pt)
   - Line spacing (single, 1.5, double)
   - Margins and text alignment
   - Themes (light, dark, sepia, custom)
   - Screen brightness control

6. **Reading Statistics**
   - Pages read today/week/month
   - Time spent reading
   - Reading streaks
   - Books completed
   - Average reading speed (WPM)

### Non-Functional Requirements

1. **Performance**
   - Fast page turns (<100ms)
   - Quick book loading (<2s)
   - Smooth scrolling
   - Efficient memory usage

2. **Usability**
   - Intuitive interface
   - Easy navigation
   - Accessible features (screen reader support)
   - Gesture support (swipe, pinch-zoom)

3. **Reliability**
   - Auto-save reading position
   - Data persistence
   - Graceful handling of corrupted files
   - Backup and restore

4. **Scalability**
   - Support large libraries (1000+ books)
   - Handle large books (1000+ pages)
   - Efficient indexing

## Core Use Cases

### Use Case 1: Read a Book

```text
Actor: Reader
Precondition: Book is in library

Main Flow:
1. User selects book from library
2. System loads book and restores last reading position
3. User reads content
4. User turns pages (swipe, tap, keyboard)
5. System updates reading progress
6. User closes book
7. System saves current position

Alternative Flow:
- User jumps to specific page/chapter
- User searches for text in book
- User adjusts display settings
```

### Use Case 2: Add Highlight

```text
Actor: Reader
Precondition: Book is open

Main Flow:
1. User selects text
2. System shows annotation menu
3. User chooses highlight color
4. System creates highlight
5. System saves highlight to book

Alternative Flow:
- User adds note to highlight
- User removes highlight
- User changes highlight color
```

### Use Case 3: Manage Library

```text
Actor: Reader

Main Flow:
1. User views library
2. User searches/filters books
3. User organizes into collections
4. User removes finished books

Alternative Flow:
- User imports new books
- User exports book data
- User views reading statistics
```

## Design Patterns Used

### 1. State Pattern

- **Purpose**: Manage reading states and book states
- **Usage**: Reading (Active, Paused, Finished), Book (Downloaded, Reading, Completed)
- **Benefit**: Clean state transitions and behavior

### 2. Strategy Pattern

- **Purpose**: Different rendering and parsing strategies
- **Usage**: Book format parsers (EPUB, PDF, MOBI), rendering engines
- **Benefit**: Easy addition of new formats

### 3. Observer Pattern

- **Purpose**: Update UI and sync changes
- **Usage**: Progress updates, annotation changes, settings changes
- **Benefit**: Decoupled components, reactive updates

### 4. Memento Pattern

- **Purpose**: Save and restore reading state
- **Usage**: Reading position, scroll state, zoom level
- **Benefit**: Undo capability, state persistence

### 5. Command Pattern

- **Purpose**: Encapsulate user actions
- **Usage**: Highlight, bookmark, note operations (with undo/redo)
- **Benefit**: Action history, undo/redo support

### 6. Singleton Pattern

- **Purpose**: Single instance managers
- **Usage**: LibraryManager, SettingsManager, SyncManager
- **Benefit**: Centralized state management

### 7. Factory Pattern

- **Purpose**: Create appropriate parsers and renderers
- **Usage**: BookParserFactory creates EPUB/PDF/MOBI parsers
- **Benefit**: Encapsulated creation logic

### 8. Composite Pattern

- **Purpose**: Represent book hierarchy
- **Usage**: Book → Chapter → Section → Paragraph → Text
- **Benefit**: Uniform treatment of book components

## Class Diagram

```text
┌─────────────────────────────────┐
│   Book                          │
├─────────────────────────────────┤
│ - id: str                       │
│ - title: str                    │
│ - author: str                   │
│ - isbn: str                     │
│ - format: BookFormat            │
│ - file_path: str                │
│ - total_pages: int              │
│ - cover_image: str              │
│ - metadata: Dict                │
├─────────────────────────────────┤
│ + get_content(page): str        │
│ + get_chapter(index): Chapter   │
│ + search(query): List[Result]   │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│   Chapter                       │
├─────────────────────────────────┤
│ - id: str                       │
│ - title: str                    │
│ - start_page: int               │
│ - end_page: int                 │
│ - content: str                  │
│ - sub_chapters: List[Chapter]   │
├─────────────────────────────────┤
│ + get_content(): str            │
│ + get_sub_chapter(i): Chapter   │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│   ReadingSession                │
├─────────────────────────────────┤
│ - session_id: str               │
│ - book_id: str                  │
│ - user_id: str                  │
│ - current_page: int             │
│ - current_position: float       │
│ - start_time: datetime          │
│ - end_time: datetime            │
│ - pages_read: int               │
├─────────────────────────────────┤
│ + update_position(page, pos)    │
│ + calculate_progress(): float   │
│ + get_duration(): timedelta     │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│   Annotation                    │
│   <<abstract>>                  │
├─────────────────────────────────┤
│ - id: str                       │
│ - book_id: str                  │
│ - page_number: int              │
│ - created_at: datetime          │
│ - modified_at: datetime         │
├─────────────────────────────────┤
│ + to_dict(): Dict               │
└─────────────────────────────────┘
         ▲
         │
    ┌────┴─────┬──────────┐
    │          │          │
┌───┴────┐  ┌──┴────┐  ┌──┴────┐
│Bookmark│  │Highlight│ │ Note  │
└────────┘  └─────────┘  └───────┘

┌─────────────────────────────────┐
│   Bookmark                      │
├─────────────────────────────────┤
│ - name: str                     │
│ - position: float               │
├─────────────────────────────────┤
│ + jump_to()                     │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│   Highlight                     │
├─────────────────────────────────┤
│ - text: str                     │
│ - color: Color                  │
│ - start_offset: int             │
│ - end_offset: int               │
│ - note: Note                    │
├─────────────────────────────────┤
│ + change_color(color)           │
│ + add_note(text)                │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│   Note                          │
├─────────────────────────────────┤
│ - text: str                     │
│ - highlight_id: str             │
├─────────────────────────────────┤
│ + update_text(text)             │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│   ReadingSettings               │
├─────────────────────────────────┤
│ - font_family: str              │
│ - font_size: int                │
│ - line_spacing: float           │
│ - theme: Theme                  │
│ - brightness: float             │
│ - margin_size: int              │
│ - text_align: Alignment         │
├─────────────────────────────────┤
│ + apply_settings()              │
│ + reset_to_default()            │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│   Library                       │
├─────────────────────────────────┤
│ - books: Dict[str, Book]        │
│ - collections: Dict[str, List]  │
│ - shelves: Dict[str, Shelf]     │
├─────────────────────────────────┤
│ + add_book(book): bool          │
│ + remove_book(book_id): bool    │
│ + search(query): List[Book]     │
│ + filter_by(criteria): List     │
│ + create_collection(name)       │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│   BookParser                    │
│   <<interface>>                 │
├─────────────────────────────────┤
│ + parse(file): Book             │
│ + extract_toc(): List[Chapter]  │
│ + extract_metadata(): Dict      │
└─────────────────────────────────┘
         ▲
         │
    ┌────┴─────┬──────────┐
    │          │          │
┌───┴─────┐  ┌─┴──────┐ ┌─┴───────┐
│EPUBParser│ │PDFParser│ │TXTParser│
└──────────┘  └─────────┘ └─────────┘

┌─────────────────────────────────┐
│   ReadingState                  │
│   <<interface>>                 │
├─────────────────────────────────┤
│ + open_book()                   │
│ + close_book()                  │
│ + turn_page()                   │
└─────────────────────────────────┘
         ▲
         │
    ┌────┴─────┬──────────┐
    │          │          │
┌───┴─────┐  ┌─┴──────┐ ┌─┴────────┐
│  Idle   │  │ Reading│ │ Finished │
└─────────┘  └────────┘  └──────────┘

┌─────────────────────────────────┐
│   Reader                        │
├─────────────────────────────────┤
│ - current_book: Book            │
│ - current_session: Session      │
│ - settings: ReadingSettings     │
│ - state: ReadingState           │
├─────────────────────────────────┤
│ + open_book(book_id)            │
│ + close_book()                  │
│ + turn_page(direction)          │
│ + jump_to_page(page)            │
│ + add_highlight(text, color)    │
│ + add_bookmark(name)            │
│ + search(query): List[Result]   │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│   ReadingStatistics             │
├─────────────────────────────────┤
│ - total_pages_read: int         │
│ - total_time: timedelta         │
│ - books_completed: int          │
│ - current_streak: int           │
│ - reading_speed_wpm: float      │
├─────────────────────────────────┤
│ + update_stats(session)         │
│ + get_daily_stats(): Dict       │
│ + get_weekly_stats(): Dict      │
│ + calculate_streak(): int       │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│   SyncManager                   │
├─────────────────────────────────┤
│ - last_sync: datetime           │
│ - pending_changes: List         │
├─────────────────────────────────┤
│ + sync_progress()               │
│ + sync_annotations()            │
│ + sync_library()                │
│ + resolve_conflicts()           │
└─────────────────────────────────┘
```

## Component Design

### 1. Book Component

```python
class Book:
    """
    Represents a digital book with metadata and content.
    
    Usage:
        book = Book(title="1984", author="George Orwell")
        chapter = book.get_chapter(0)
        results = book.search("freedom")
    
    Returns:
        Book: Instance with full book data and operations
    """
    - id: Unique identifier
    - title, author, isbn: Metadata
    - format: BookFormat enum (EPUB, PDF, MOBI, TXT)
    - file_path: Location of book file
    - total_pages: Page count
    - chapters: List of chapters with table of contents
    - metadata: Additional info (publisher, year, language, genre)
```

### 2. ReadingSession Component

```python
class ReadingSession:
    """
    Tracks a single reading session with progress and duration.
    
    Usage:
        session = ReadingSession(book_id, user_id)
        session.update_position(page=42, position=0.5)
        progress = session.calculate_progress()
    
    Returns:
        ReadingSession: Session with tracked metrics
    """
    - Tracks current page and position within page
    - Records start and end times
    - Calculates pages read and progress percentage
    - Estimates time remaining based on reading speed
```

### 3. Annotation System

```python
class Annotation:
    """
    Base class for bookmarks, highlights, and notes.
    
    Usage:
        highlight = Highlight(text="Important", color=Color.YELLOW)
        bookmark = Bookmark(name="Chapter 5", page=100)
        note = Note(text="Remember this", highlight_id="h123")
    
    Returns:
        Annotation: Base annotation with common properties
    """
    - Polymorphic design for different annotation types
    - Supports export and import
    - Timestamp tracking for creation and modification
```

### 4. Reading Settings

```python
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
    - Font customization (family, size, weight)
    - Layout (line spacing, margins, alignment)
    - Visual theme (light, dark, sepia, custom colors)
    - Brightness and screen settings
    - Persists across sessions
```

### 5. Library Manager

```python
class Library:
    """
    Manages user's book collection.
    
    Usage:
        library = Library()
        library.add_book(book)
        results = library.search("Orwell")
        collection = library.create_collection("Sci-Fi")
    
    Returns:
        Library: Singleton instance managing all books
    """
    - Book storage and retrieval
    - Collections and shelves for organization
    - Search and filter capabilities
    - Import/export functionality
```

## Data Structures

### 1. Book Index (B-Tree)

```text
Purpose: Fast book lookup and range queries
Structure: B-Tree indexed by book ID
Operations:
  - Insert: O(log N)
  - Search: O(log N)
  - Range query: O(log N + K)

Usage: Quick access to books in large libraries
```

### 2. Full-Text Search Index (Inverted Index)

```text
Purpose: Fast text search within books
Structure: Map[word -> List[(book_id, page, position)]]
Operations:
  - Index document: O(M) where M = unique words
  - Search: O(1) for lookup + O(K) for results
  
Usage: Search for phrases across all books or within a book
```

### 3. Reading History (Circular Buffer)

```text
Purpose: Store recent reading sessions
Structure: Fixed-size circular buffer
Operations:
  - Add session: O(1)
  - Get recent: O(K)
  
Usage: Quick access to recent reading activity
```

### 4. Annotation Storage (Hash Map + Sorted List)

```text
Purpose: Efficient annotation retrieval
Structure: 
  - Hash map for O(1) lookup by ID
  - Sorted list by page number for ordered retrieval
Operations:
  - Add: O(1) + O(log N)
  - Get by page: O(log N + K)
  - Get by ID: O(1)
```

## API Design

### Core Reading APIs

```python
# Book Management
open_book(book_id: str) -> Book
    """Open a book and restore reading position"""
    
close_book() -> ReadingSession
    """Close current book and save session"""
    
turn_page(direction: PageDirection) -> Page
    """Navigate to next/previous page"""
    
jump_to_page(page_number: int) -> Page
    """Jump to specific page"""
    
jump_to_chapter(chapter_id: str) -> Page
    """Jump to chapter start"""

# Search
search_in_book(query: str) -> List[SearchResult]
    """Search for text within current book"""
    
search_library(query: str, filters: Dict) -> List[Book]
    """Search across all books in library"""

# Annotations
add_highlight(text: str, color: Color, page: int, offset: int) -> Highlight
    """Create a new highlight"""
    
add_bookmark(name: str, page: int, position: float) -> Bookmark
    """Create a new bookmark"""
    
add_note(text: str, highlight_id: str) -> Note
    """Add note to highlight"""
    
get_annotations(book_id: str) -> List[Annotation]
    """Get all annotations for a book"""
    
export_annotations(book_id: str, format: str) -> str
    """Export annotations (JSON, Markdown, PDF)"""

# Settings
update_settings(settings: ReadingSettings) -> None
    """Apply new reading settings"""
    
get_settings() -> ReadingSettings
    """Get current settings"""

# Statistics
get_reading_stats(period: TimePeriod) -> ReadingStatistics
    """Get reading stats for period"""
    
get_progress(book_id: str) -> float
    """Get reading progress (0-1)"""
    
estimate_time_remaining(book_id: str) -> timedelta
    """Estimate time to finish book"""
```

### Library Management APIs

```python
# Library Operations
add_book_to_library(file_path: str) -> Book
    """Import book to library"""
    
remove_book(book_id: str) -> bool
    """Remove book from library"""
    
get_books(filter: LibraryFilter, sort: SortCriteria) -> List[Book]
    """Get filtered and sorted book list"""

# Collections
create_collection(name: str) -> Collection
    """Create new book collection"""
    
add_to_collection(book_id: str, collection_id: str) -> bool
    """Add book to collection"""
    
get_collections() -> List[Collection]
    """Get all collections"""

# Sync
sync_progress() -> SyncResult
    """Sync reading progress across devices"""
    
sync_annotations() -> SyncResult
    """Sync annotations across devices"""
```

## Implementation Details

### 1. Book Parsing Strategy

```python
class BookParserFactory:
    """
    Factory for creating appropriate book parsers.
    
    Usage:
        parser = BookParserFactory.create_parser("book.epub")
        book = parser.parse("path/to/book.epub")
    
    Returns:
        BookParser: Parser for specific format
    """
    
    @staticmethod
    def create_parser(file_path: str) -> BookParser:
        extension = file_path.split('.')[-1].lower()
        if extension == 'epub':
            return EPUBParser()
        elif extension == 'pdf':
            return PDFParser()
        elif extension == 'mobi':
            return MOBIParser()
        elif extension == 'txt':
            return TXTParser()
        else:
            raise UnsupportedFormatError(extension)
```

### 2. Reading State Machine

```text
State Transitions:

Idle → Reading: open_book()
Reading → Paused: pause_reading()
Paused → Reading: resume_reading()
Reading → Idle: close_book()
Reading → Finished: complete_book()
Finished → Reading: reopen_book()

States:
- Idle: No book open
- Reading: Actively reading
- Paused: Book open but not reading
- Finished: Reached end of book
```

### 3. Progress Calculation

```python
def calculate_progress(self) -> float:
    """
    Calculate reading progress as percentage.
    
    Formula:
        progress = (current_page + position_in_page) / total_pages
    
    Returns:
        float: Progress from 0.0 to 1.0
    """
    if self.total_pages == 0:
        return 0.0
    
    page_progress = (self.current_page - 1) / self.total_pages
    position_progress = self.current_position / self.total_pages
    
    return min(1.0, page_progress + position_progress)
```

### 4. Time Remaining Estimation

```python
def estimate_time_remaining(self) -> timedelta:
    """
    Estimate time to finish book based on reading speed.
    
    Algorithm:
        1. Calculate average reading speed (pages/hour)
        2. Determine remaining pages
        3. Estimate = remaining_pages / reading_speed
    
    Returns:
        timedelta: Estimated time to completion
    """
    avg_speed = self.calculate_average_speed()  # pages/hour
    remaining_pages = self.total_pages - self.current_page
    
    if avg_speed == 0:
        return timedelta(hours=0)
    
    hours_remaining = remaining_pages / avg_speed
    return timedelta(hours=hours_remaining)
```

### 5. Annotation Rendering

```python
def render_page_with_annotations(page: Page, 
                                 annotations: List[Annotation]) -> RenderedPage:
    """
    Render page content with highlights and bookmarks.
    
    Algorithm:
        1. Sort annotations by position
        2. Split text at annotation boundaries
        3. Apply styling to highlighted segments
        4. Add bookmark indicators
        5. Combine into final rendered page
    
    Complexity: O(N log N + M) where N = annotations, M = text length
    """
    # Implementation details...
```

### 6. Full-Text Search

```python
def search_in_book(query: str) -> List[SearchResult]:
    """
    Search for text within book using inverted index.
    
    Algorithm:
        1. Tokenize query into terms
        2. Lookup each term in inverted index
        3. Find pages containing all terms
        4. Rank results by relevance
        5. Return top K results with context
    
    Complexity: O(T + R log R) where T = terms, R = results
    """
    # Implementation details...
```

## Business Rules

### Rule 1: Auto-Save Reading Position

```text
Trigger: Every page turn or after 30 seconds of inactivity
Action: Save current page, position, and timestamp
Rationale: Never lose reading progress
Implementation: Background timer + page change listener
```

### Rule 2: Annotation Limits

```text
Constraint: Maximum 1000 highlights per book
Rationale: Performance optimization for large books
Exception: Premium users have unlimited highlights
Enforcement: Check count before creating highlight
```

### Rule 3: Reading Streak Rules

```text
Definition: Consecutive days with at least 10 minutes of reading
Reset: Missed days reset streak to 0
Grace Period: 1-day grace period for timezone differences
Calculation: Check daily reading sessions
```

### Rule 4: Sync Conflict Resolution

```text
Strategy: Last-Write-Wins for position, Merge for annotations
Position: Use most recent reading position
Annotations: Merge annotations from all devices (no duplicates)
Rationale: Preserve user data from all sources
```

### Rule 5: Book Format Compatibility

```text
Supported: EPUB, PDF, MOBI, TXT
Validation: Check format on import
Conversion: Auto-convert MOBI to EPUB if needed
Rejection: Reject DRM-protected books
```

### Rule 6: Reading Speed Calculation

```text
Formula: WPM = (words_read) / (time_in_minutes)
Window: Calculate over last 10 reading sessions
Minimum: Require at least 5 minutes of reading data
Update: Recalculate after each session
```

## Extension Points

### 1. New Book Formats

```python
class CustomParser(BookParser):
    """
    Add support for new book format.
    
    Example: Comic book format (CBZ, CBR)
    Implementation: Implement parse(), extract_toc(), extract_metadata()
    Registration: Register with BookParserFactory
    """
```

### 2. Cloud Sync Providers

```python
class CloudSyncStrategy:
    """
    Integrate with cloud storage services.
    
    Examples: Dropbox, Google Drive, iCloud
    Implementation: Implement upload(), download(), sync()
    Configuration: API keys and authentication
    """
```

### 3. Text-to-Speech Integration

```python
class TTSEngine:
    """
    Add audio narration capability.
    
    Features: Read aloud current page, highlight speaking word
    Implementation: Integrate TTS APIs (Google, Amazon Polly)
    Controls: Play, pause, speed control, voice selection
    """
```

### 4. Social Features

```python
class SocialManager:
    """
    Share reading activity and annotations.
    
    Features:
    - Share highlights on social media
    - Reading clubs and discussions
    - Public book reviews
    - Follow other readers
    """
```

### 5. AI-Powered Features

```python
class AIAssistant:
    """
    Intelligent reading enhancements.
    
    Features:
    - Chapter summaries
    - Character relationship maps
    - Vocabulary learning (define words)
    - Reading recommendations
    - Question answering about book content
    """
```

## Complexity Analysis

### Time Complexity

| Operation | Complexity | Notes |
|-----------|------------|-------|
| Open book | O(1) | Load metadata, lazy load content |
| Turn page | O(1) | Simple page navigation |
| Jump to page | O(1) | Direct page access |
| Search in book | O(M + R log R) | M = document size, R = results |
| Add highlight | O(log N) | Insert into sorted annotation list |
| Get annotations | O(log N + K) | Binary search + retrieve K annotations |
| Sync progress | O(1) | Single API call |
| Calculate stats | O(S) | S = number of sessions |

### Space Complexity

| Component | Complexity | Notes |
|-----------|------------|-------|
| Book metadata | O(B) | B = number of books |
| Current book content | O(P) | P = pages in current book |
| Annotations | O(A) | A = total annotations |
| Reading history | O(S) | S = sessions (capped at 1000) |
| Search index | O(V × D) | V = vocabulary size, D = documents |
| Total | O(B + P + A + S + V×D) | Dominated by search index |

## Trade-offs and Design Decisions

### 1. Pagination vs. Continuous Scroll

**Decision:** Support both modes

| Aspect | Pagination | Continuous Scroll |
|--------|------------|-------------------|
| Navigation | Page-by-page | Smooth scrolling |
| Progress | Clear page numbers | Percentage based |
| Performance | Loads one page | Loads entire chapter |
| User Preference | Traditional readers | Modern web users |

**Rationale:** Offer choice to accommodate different reading preferences.

### 2. Local Storage vs. Cloud Storage

**Decision:** Local-first with optional cloud sync

| Aspect | Local Storage | Cloud Storage |
|--------|---------------|---------------|
| Performance | Fast | Network dependent |
| Offline | Full support | Limited |
| Multi-device | Manual transfer | Auto-sync |
| Privacy | High | Depends on provider |

**Rationale:** Local storage ensures performance and offline access; cloud sync adds convenience.

### 3. Format Support

**Decision:** Focus on EPUB and PDF, convert others

| Format | Support | Notes |
|--------|---------|-------|
| EPUB | Native | Best for reflowable text |
| PDF | Native | Fixed layout, slower rendering |
| MOBI | Convert to EPUB | Amazon format |
| TXT | Native | Simple text files |
| DOCX | Not supported | Use conversion tools |

**Rationale:** EPUB is open standard; PDF widely used; others converted.

### 4. Annotation Storage

**Decision:** Store annotations separately from book files

**Pros:**

- Non-destructive (original file unchanged)
- Easy backup and sync
- Can delete book without losing annotations
- Support annotation sharing

**Cons:**

- Need to maintain association between book and annotations
- Slightly more complex data model

**Rationale:** Flexibility and data preservation outweigh complexity.

### 5. Reading Statistics Granularity

**Decision:** Track per-session, aggregate for reports

| Granularity | Storage | Accuracy | Privacy |
|-------------|---------|----------|---------|
| Per-page | High | Very high | Low |
| Per-session | Medium | High | Medium |
| Daily aggregate | Low | Medium | High |

**Rationale:** Session-level provides good balance of detail and privacy.

## Summary

The Book Reader System provides a comprehensive digital reading experience with:

- **Rich Reading Features**: Customizable display, progress tracking, annotations
- **Library Management**: Organization, search, collections
- **Multi-Format Support**: EPUB, PDF, MOBI, TXT
- **Reading Statistics**: Track habits, goals, streaks
- **Sync Capability**: Cross-device progress and annotations
- **Offline-First**: Full functionality without internet

**Key Design Principles:**

1. **Performance**: Fast page turns, efficient memory usage
2. **User Experience**: Intuitive navigation, customization options
3. **Data Integrity**: Auto-save, conflict resolution
4. **Extensibility**: Plugin architecture for new formats and features
5. **Privacy**: Local-first storage, optional cloud sync

**Perfect for:**

- E-reader applications (Kindle-like)
- Educational platforms
- Digital libraries
- Publishing platforms
- Reading companion apps
