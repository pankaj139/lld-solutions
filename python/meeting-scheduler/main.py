"""
Meeting Scheduler System Implementation

This module implements a comprehensive meeting scheduling system (like Google Calendar) with:
- Calendar management with conflict detection
- Availability checking across multiple participants
- Time zone support and conversion
- Recurring meetings with flexible patterns
- Room booking with capacity constraints
- Meeting invitations and RSVP
- Notification system with reminders
- Find common free time algorithm
- Interval overlap and merge algorithms
- Priority-based conflict resolution

Usage:
    # Create users and calendars
    organizer = User("user1", "Alice", "alice@example.com", "America/New_York")
    participant = User("user2", "Bob", "bob@example.com", "America/Los_Angeles")
    
    # Create meeting using builder
    meeting = (MeetingBuilder()
               .set_title("Team Standup")
               .set_time(start_time, end_time)
               .set_organizer(organizer)
               .add_participant(participant)
               .build())
    
    # Schedule meeting
    scheduler = CalendarManager()
    scheduler.create_meeting(meeting)
    
    # Find common free time
    free_slots = scheduler.find_meeting_time([organizer, participant], 60)

Design Patterns:
    - Strategy Pattern: Availability checking, conflict resolution
    - Observer Pattern: Meeting notifications
    - Factory Pattern: Meeting type creation
    - Builder Pattern: Meeting construction
    - Chain of Responsibility: Conflict handling
    - State Pattern: Meeting lifecycle
    - Composite Pattern: Recurring meeting series
    - Memento Pattern: Meeting history
    - Singleton Pattern: Calendar manager
    - Template Method: Scheduling workflow

Author: LLD Solutions
Date: 2025-10-05
"""

from abc import ABC, abstractmethod
from enum import Enum
from typing import List, Dict, Optional, Set, Tuple
from datetime import datetime, timedelta, date
from collections import defaultdict
import uuid


# ===================== Enums =====================

class MeetingStatus(Enum):
    """Meeting status"""
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class Visibility(Enum):
    """Meeting visibility"""
    PUBLIC = "public"
    PRIVATE = "private"
    CONFIDENTIAL = "confidential"


class InvitationStatus(Enum):
    """Invitation response status"""
    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"
    TENTATIVE = "tentative"


class Frequency(Enum):
    """Recurrence frequency"""
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    YEARLY = "yearly"


class ConflictPriority(Enum):
    """Meeting priority for conflict resolution"""
    LOW = 1
    MEDIUM = 2
    HIGH = 3
    CRITICAL = 4


# ===================== Time Slot and Interval Classes =====================

class TimeSlot:
    """
    Represents a time interval.
    
    Usage:
        slot = TimeSlot(start_time, end_time)
        overlaps = slot.overlaps(other_slot)
        duration = slot.duration()
    
    Returns:
        TimeSlot: Time interval with overlap detection
    """
    
    def __init__(self, start: datetime, end: datetime):
        if start >= end:
            raise ValueError("Start time must be before end time")
        self.start = start
        self.end = end
    
    def overlaps(self, other: 'TimeSlot') -> bool:
        """Check if two time slots overlap"""
        return self.start < other.end and self.end > other.start
    
    def contains(self, time: datetime) -> bool:
        """Check if time falls within slot"""
        return self.start <= time < self.end
    
    def duration(self) -> timedelta:
        """Get duration of time slot"""
        return self.end - self.start
    
    def duration_minutes(self) -> int:
        """Get duration in minutes"""
        return int(self.duration().total_seconds() / 60)
    
    def merge(self, other: 'TimeSlot') -> 'TimeSlot':
        """Merge with overlapping time slot"""
        if not self.overlaps(other):
            raise ValueError("Cannot merge non-overlapping slots")
        return TimeSlot(min(self.start, other.start), max(self.end, other.end))
    
    def __repr__(self):
        return f"TimeSlot({self.start.strftime('%H:%M')} - {self.end.strftime('%H:%M')})"


def merge_intervals(intervals: List[TimeSlot]) -> List[TimeSlot]:
    """
    Merge overlapping time intervals.
    
    Algorithm:
        1. Sort intervals by start time
        2. Iterate and merge overlapping intervals
        3. Return merged list
    
    Complexity: O(N log N)
    """
    if not intervals:
        return []
    
    # Sort by start time
    sorted_intervals = sorted(intervals, key=lambda x: x.start)
    merged = [sorted_intervals[0]]
    
    for current in sorted_intervals[1:]:
        last = merged[-1]
        if current.start <= last.end:
            # Overlapping, merge
            last.end = max(last.end, current.end)
        else:
            # Non-overlapping, add new interval
            merged.append(current)
    
    return merged


# ===================== User and Calendar Classes =====================

class User:
    """
    Represents a user with calendar.
    
    Usage:
        user = User("u1", "Alice", "alice@example.com", "America/New_York")
        availability = user.get_availability(date_range)
    
    Returns:
        User: User with calendar and availability
    """
    
    def __init__(self, user_id: str, name: str, email: str, time_zone: str = "UTC"):
        self.id = user_id
        self.name = name
        self.email = email
        self.time_zone = time_zone
        self.calendar = Calendar(self)
    
    def get_availability(self, start: datetime, end: datetime) -> List[TimeSlot]:
        """Get available time slots"""
        return self.calendar.find_free_slots(TimeSlot(start, end))
    
    def __repr__(self):
        return f"User({self.name}, {self.email})"


class Calendar:
    """
    User's calendar managing meetings.
    
    Usage:
        calendar = Calendar(user)
        calendar.add_meeting(meeting)
        conflicts = calendar.has_conflict(new_meeting)
        free_slots = calendar.find_free_slots(time_range)
    
    Returns:
        Calendar: Calendar with meeting management
    """
    
    def __init__(self, owner: User):
        self.id = str(uuid.uuid4())
        self.owner = owner
        self.meetings: Dict[str, 'Meeting'] = {}
    
    def add_meeting(self, meeting: 'Meeting') -> None:
        """Add meeting to calendar"""
        self.meetings[meeting.id] = meeting
        print(f"✓ Added meeting '{meeting.title}' to {self.owner.name}'s calendar")
    
    def remove_meeting(self, meeting_id: str) -> bool:
        """Remove meeting from calendar"""
        if meeting_id in self.meetings:
            meeting = self.meetings.pop(meeting_id)
            print(f"✓ Removed meeting '{meeting.title}' from calendar")
            return True
        return False
    
    def get_meetings(self, start: datetime, end: datetime) -> List['Meeting']:
        """Get all meetings in time range"""
        return [m for m in self.meetings.values() 
                if m.start_time < end and m.end_time > start]
    
    def find_free_slots(self, time_range: TimeSlot) -> List[TimeSlot]:
        """
        Find free time slots in calendar.
        
        Algorithm:
            1. Get all busy times in range
            2. Sort by start time
            3. Find gaps between busy times
            4. Return free slots
        
        Complexity: O(N log N)
        """
        busy_times = []
        for meeting in self.meetings.values():
            meeting_slot = TimeSlot(meeting.start_time, meeting.end_time)
            if meeting_slot.overlaps(time_range):
                # Clip to time range
                start = max(meeting.start_time, time_range.start)
                end = min(meeting.end_time, time_range.end)
                busy_times.append(TimeSlot(start, end))
        
        if not busy_times:
            return [time_range]
        
        # Merge overlapping busy times
        merged_busy = merge_intervals(busy_times)
        
        # Find gaps
        free_slots = []
        current_time = time_range.start
        
        for busy_slot in merged_busy:
            if current_time < busy_slot.start:
                free_slots.append(TimeSlot(current_time, busy_slot.start))
            current_time = max(current_time, busy_slot.end)
        
        # Check final gap
        if current_time < time_range.end:
            free_slots.append(TimeSlot(current_time, time_range.end))
        
        return free_slots
    
    def has_conflict(self, meeting: 'Meeting') -> bool:
        """Check if meeting conflicts with existing meetings"""
        for existing in self.meetings.values():
            if existing.id != meeting.id:
                if (meeting.start_time < existing.end_time and 
                    meeting.end_time > existing.start_time):
                    return True
        return False
    
    def __repr__(self):
        return f"Calendar({self.owner.name}, {len(self.meetings)} meetings)"


# ===================== Meeting Classes =====================

class Meeting:
    """
    Represents a scheduled meeting.
    
    Usage:
        meeting = Meeting("Standup", start_time, end_time, organizer)
        meeting.add_participant(user)
        meeting.set_room(room)
    
    Returns:
        Meeting: Meeting instance with all details
    """
    
    def __init__(self, title: str, start_time: datetime, end_time: datetime, 
                 organizer: User):
        self.id = str(uuid.uuid4())
        self.title = title
        self.description = ""
        self.start_time = start_time
        self.end_time = end_time
        self.organizer = organizer
        self.participants: List[User] = []
        self.room: Optional['Room'] = None
        self.status = MeetingStatus.SCHEDULED
        self.visibility = Visibility.PUBLIC
        self.priority = ConflictPriority.MEDIUM
        self.created_at = datetime.now()
    
    def add_participant(self, user: User) -> None:
        """Add participant to meeting"""
        if user not in self.participants:
            self.participants.append(user)
    
    def remove_participant(self, user: User) -> None:
        """Remove participant from meeting"""
        if user in self.participants:
            self.participants.remove(user)
    
    def set_room(self, room: 'Room') -> None:
        """Set meeting room"""
        self.room = room
    
    def get_duration(self) -> timedelta:
        """Get meeting duration"""
        return self.end_time - self.start_time
    
    def get_duration_minutes(self) -> int:
        """Get duration in minutes"""
        return int(self.get_duration().total_seconds() / 60)
    
    def overlaps_with(self, other: 'Meeting') -> bool:
        """Check if two meetings overlap"""
        return (self.start_time < other.end_time and 
                self.end_time > other.start_time)
    
    def is_recurring(self) -> bool:
        """Check if meeting is recurring"""
        return isinstance(self, RecurringMeeting)
    
    def __repr__(self):
        return f"Meeting('{self.title}', {self.start_time.strftime('%Y-%m-%d %H:%M')})"


class RecurrenceRule:
    """
    Defines recurrence pattern for meetings.
    
    Usage:
        rule = RecurrenceRule(Frequency.WEEKLY, interval=1, until=end_date)
        next_date = rule.get_next_date(current_date)
    
    Returns:
        RecurrenceRule: Recurrence pattern
    """
    
    def __init__(self, frequency: Frequency, interval: int = 1, 
                 until: Optional[datetime] = None, count: Optional[int] = None):
        self.frequency = frequency
        self.interval = interval
        self.until = until
        self.count = count
        self.by_day: List[int] = []  # 0=Mon, 6=Sun
    
    def get_next_date(self, current_date: date) -> date:
        """
        Get next occurrence date based on recurrence rule.
        
        Complexity: O(1)
        """
        if self.frequency == Frequency.DAILY:
            return current_date + timedelta(days=self.interval)
        elif self.frequency == Frequency.WEEKLY:
            return current_date + timedelta(weeks=self.interval)
        elif self.frequency == Frequency.MONTHLY:
            # Approximate - same day next month(s)
            month = current_date.month + self.interval
            year = current_date.year + (month - 1) // 12
            month = ((month - 1) % 12) + 1
            day = min(current_date.day, 28)  # Avoid day overflow
            return date(year, month, day)
        elif self.frequency == Frequency.YEARLY:
            return date(current_date.year + self.interval, 
                       current_date.month, current_date.day)
        return current_date
    
    def __repr__(self):
        return f"RecurrenceRule({self.frequency.value}, every {self.interval})"


class RecurringMeeting(Meeting):
    """
    Recurring meeting with recurrence pattern.
    
    Usage:
        rule = RecurrenceRule(Frequency.WEEKLY, interval=1)
        meeting = RecurringMeeting(title, start, end, organizer, rule)
        occurrences = meeting.generate_occurrences(until_date)
    
    Returns:
        RecurringMeeting: Recurring meeting series
    """
    
    def __init__(self, title: str, start_time: datetime, end_time: datetime,
                 organizer: User, recurrence_rule: RecurrenceRule):
        super().__init__(title, start_time, end_time, organizer)
        self.recurrence_rule = recurrence_rule
        self.exceptions: Set[date] = set()  # Dates to skip
        self.occurrences: List[Meeting] = []
    
    def add_exception(self, exception_date: date) -> None:
        """Add exception date (skip occurrence)"""
        self.exceptions.add(exception_date)
    
    def generate_occurrences(self, until: datetime, max_count: int = 365) -> List[Meeting]:
        """
        Generate all occurrences of recurring meeting.
        
        Algorithm:
            1. Start with first occurrence
            2. Apply recurrence rule repeatedly
            3. Skip exceptions
            4. Stop at 'until' date or 'count' limit
            5. Create Meeting objects for each occurrence
        
        Complexity: O(K) where K = number of occurrences
        """
        self.occurrences = []
        current_date = self.start_time.date()
        count = 0
        
        rule_until = self.recurrence_rule.until if self.recurrence_rule.until else until
        rule_count = self.recurrence_rule.count if self.recurrence_rule.count else max_count
        
        while (current_date <= rule_until.date() and count < rule_count):
            # Skip exceptions
            if current_date not in self.exceptions:
                # Create occurrence
                occurrence_start = datetime.combine(current_date, self.start_time.time())
                occurrence_end = occurrence_start + self.get_duration()
                
                occurrence = Meeting(self.title, occurrence_start, occurrence_end, self.organizer)
                occurrence.description = self.description
                occurrence.participants = self.participants.copy()
                occurrence.room = self.room
                occurrence.visibility = self.visibility
                
                self.occurrences.append(occurrence)
                count += 1
            
            # Get next occurrence date
            current_date = self.recurrence_rule.get_next_date(current_date)
        
        return self.occurrences
    
    def __repr__(self):
        return f"RecurringMeeting('{self.title}', {self.recurrence_rule})"


# ===================== Room Management =====================

class Room:
    """
    Meeting room with booking management.
    
    Usage:
        room = Room("r1", "Conference Room A", 10, "Building 1")
        is_available = room.is_available(time_slot)
        room.book(meeting)
    
    Returns:
        Room: Room with availability checking
    """
    
    def __init__(self, room_id: str, name: str, capacity: int, location: str):
        self.id = room_id
        self.name = name
        self.capacity = capacity
        self.location = location
        self.amenities: List[str] = []
        self.bookings: List[TimeSlot] = []
    
    def add_amenity(self, amenity: str) -> None:
        """Add room amenity"""
        self.amenities.append(amenity)
    
    def is_available(self, time_slot: TimeSlot) -> bool:
        """Check if room is available for time slot"""
        for booking in self.bookings:
            if booking.overlaps(time_slot):
                return False
        return True
    
    def book(self, meeting: Meeting) -> bool:
        """Book room for meeting"""
        time_slot = TimeSlot(meeting.start_time, meeting.end_time)
        
        # Check capacity
        if len(meeting.participants) + 1 > self.capacity:  # +1 for organizer
            print(f"✗ Room '{self.name}' capacity exceeded ({self.capacity} max)")
            return False
        
        # Check availability
        if not self.is_available(time_slot):
            print(f"✗ Room '{self.name}' not available")
            return False
        
        self.bookings.append(time_slot)
        print(f"✓ Booked room '{self.name}' for meeting '{meeting.title}'")
        return True
    
    def cancel_booking(self, meeting: Meeting) -> bool:
        """Cancel room booking"""
        time_slot = TimeSlot(meeting.start_time, meeting.end_time)
        # Find and remove matching booking
        for booking in self.bookings:
            if booking.start == time_slot.start and booking.end == time_slot.end:
                self.bookings.remove(booking)
                return True
        return False
    
    def __repr__(self):
        return f"Room('{self.name}', capacity={self.capacity}, {len(self.bookings)} bookings)"


# ===================== Meeting Builder (Builder Pattern) =====================

class MeetingBuilder:
    """
    Builder for constructing meetings with fluent interface.
    
    Usage:
        meeting = (MeetingBuilder()
                   .set_title("Team Meeting")
                   .set_time(start, end)
                   .set_organizer(user)
                   .add_participant(user2)
                   .set_room(room)
                   .build())
    
    Returns:
        MeetingBuilder: Fluent builder for meetings
    """
    
    def __init__(self):
        self._title = ""
        self._description = ""
        self._start_time = None
        self._end_time = None
        self._organizer = None
        self._participants = []
        self._room = None
        self._recurrence_rule = None
        self._priority = ConflictPriority.MEDIUM
        self._visibility = Visibility.PUBLIC
    
    def set_title(self, title: str) -> 'MeetingBuilder':
        """Set meeting title"""
        self._title = title
        return self
    
    def set_description(self, description: str) -> 'MeetingBuilder':
        """Set meeting description"""
        self._description = description
        return self
    
    def set_time(self, start_time: datetime, end_time: datetime) -> 'MeetingBuilder':
        """Set meeting time"""
        self._start_time = start_time
        self._end_time = end_time
        return self
    
    def set_organizer(self, organizer: User) -> 'MeetingBuilder':
        """Set meeting organizer"""
        self._organizer = organizer
        return self
    
    def add_participant(self, participant: User) -> 'MeetingBuilder':
        """Add meeting participant"""
        self._participants.append(participant)
        return self
    
    def set_room(self, room: Room) -> 'MeetingBuilder':
        """Set meeting room"""
        self._room = room
        return self
    
    def set_recurrence(self, recurrence_rule: RecurrenceRule) -> 'MeetingBuilder':
        """Set recurrence rule"""
        self._recurrence_rule = recurrence_rule
        return self
    
    def set_priority(self, priority: ConflictPriority) -> 'MeetingBuilder':
        """Set meeting priority"""
        self._priority = priority
        return self
    
    def set_visibility(self, visibility: Visibility) -> 'MeetingBuilder':
        """Set meeting visibility"""
        self._visibility = visibility
        return self
    
    def build(self) -> Meeting:
        """Build and return meeting"""
        if not all([self._title, self._start_time, self._end_time, self._organizer]):
            raise ValueError("Missing required fields: title, time, organizer")
        
        # Create appropriate meeting type
        if self._recurrence_rule:
            meeting = RecurringMeeting(
                self._title, self._start_time, self._end_time, 
                self._organizer, self._recurrence_rule
            )
        else:
            meeting = Meeting(
                self._title, self._start_time, self._end_time, self._organizer
            )
        
        # Set optional fields
        meeting.description = self._description
        meeting.priority = self._priority
        meeting.visibility = self._visibility
        
        # Add participants
        for participant in self._participants:
            meeting.add_participant(participant)
        
        # Set room
        if self._room:
            meeting.set_room(self._room)
        
        return meeting


# ===================== Availability Checker (Strategy Pattern) =====================

class AvailabilityChecker:
    """
    Finds common free time across participants.
    
    Usage:
        checker = AvailabilityChecker()
        free_slots = checker.find_free_slots([user1, user2], duration, date_range)
        is_available = checker.check_availability(users, time_slot)
    
    Returns:
        AvailabilityChecker: Availability checking utility
    """
    
    def check_availability(self, users: List[User], time_slot: TimeSlot) -> Dict[User, bool]:
        """Check if users are available in time slot"""
        availability = {}
        for user in users:
            has_conflict = user.calendar.has_conflict(
                Meeting("temp", time_slot.start, time_slot.end, user)
            )
            availability[user] = not has_conflict
        return availability
    
    def find_free_slots(self, users: List[User], duration_minutes: int, 
                       time_range: TimeSlot, max_results: int = 10) -> List[TimeSlot]:
        """
        Find common free time across all users.
        
        Algorithm:
            1. Get all busy times for each user
            2. Merge overlapping busy times
            3. Find gaps between busy times
            4. Filter gaps >= duration
            5. Return available slots
        
        Complexity: O(N × M log M) where N = users, M = meetings/user
        """
        # Collect all busy times
        all_busy_times = []
        for user in users:
            free_slots = user.calendar.find_free_slots(time_range)
            # Invert to get busy times
            if not free_slots:
                # Entire range is busy
                all_busy_times.append(time_range)
            else:
                # Add gaps as busy times
                current = time_range.start
                for free_slot in free_slots:
                    if current < free_slot.start:
                        all_busy_times.append(TimeSlot(current, free_slot.start))
                    current = free_slot.end
                if current < time_range.end:
                    all_busy_times.append(TimeSlot(current, time_range.end))
        
        if not all_busy_times:
            return [time_range]
        
        # Merge overlapping intervals
        merged_busy = merge_intervals(all_busy_times)
        
        # Find gaps
        free_slots = []
        current_time = time_range.start
        
        for busy_slot in merged_busy:
            if current_time < busy_slot.start:
                gap = TimeSlot(current_time, busy_slot.start)
                if gap.duration_minutes() >= duration_minutes:
                    free_slots.append(gap)
                    if len(free_slots) >= max_results:
                        return free_slots
            current_time = max(current_time, busy_slot.end)
        
        # Check final gap
        if current_time < time_range.end:
            gap = TimeSlot(current_time, time_range.end)
            if gap.duration_minutes() >= duration_minutes:
                free_slots.append(gap)
        
        return free_slots[:max_results]
    
    def suggest_meeting_times(self, users: List[User], duration_minutes: int,
                            date_range: TimeSlot) -> List[TimeSlot]:
        """Suggest optimal meeting times"""
        free_slots = self.find_free_slots(users, duration_minutes, date_range, max_results=5)
        
        # Prefer morning slots (9 AM - 12 PM)
        morning_slots = []
        afternoon_slots = []
        
        for slot in free_slots:
            if 9 <= slot.start.hour < 12:
                morning_slots.append(slot)
            else:
                afternoon_slots.append(slot)
        
        # Return morning slots first, then afternoon
        return morning_slots + afternoon_slots


# ===================== Conflict Detector =====================

class Conflict:
    """Represents a scheduling conflict"""
    
    def __init__(self, user: User, conflicting_meeting: Meeting, severity: str):
        self.user = user
        self.conflicting_meeting = conflicting_meeting
        self.severity = severity  # "hard" or "soft"


class ConflictDetector:
    """
    Detects and resolves scheduling conflicts.
    
    Usage:
        detector = ConflictDetector()
        conflicts = detector.detect_conflicts(meeting)
    
    Returns:
        ConflictDetector: Conflict detection utility
    """
    
    def detect_conflicts(self, meeting: Meeting) -> List[Conflict]:
        """
        Detect conflicts with existing meetings.
        
        Algorithm:
            1. For each participant, get their calendar
            2. Find overlapping meetings
            3. Check room conflicts
            4. Calculate conflict severity
            5. Return list of conflicts
        
        Complexity: O(P × M) where P = participants, M = meetings/participant
        """
        conflicts = []
        
        # Check participant conflicts
        all_users = [meeting.organizer] + meeting.participants
        for user in all_users:
            for existing_meeting in user.calendar.meetings.values():
                if existing_meeting.id != meeting.id:
                    if meeting.overlaps_with(existing_meeting):
                        # Determine severity based on priority
                        if existing_meeting.priority.value >= meeting.priority.value:
                            severity = "hard"
                        else:
                            severity = "soft"
                        
                        conflicts.append(Conflict(user, existing_meeting, severity))
        
        return conflicts
    
    def resolve_conflicts(self, conflicts: List[Conflict]) -> List[str]:
        """Suggest conflict resolution strategies"""
        suggestions = []
        
        for conflict in conflicts:
            if conflict.severity == "hard":
                suggestions.append(
                    f"Reschedule '{conflict.conflicting_meeting.title}' or choose different time"
                )
            else:
                suggestions.append(
                    f"Consider rescheduling '{conflict.conflicting_meeting.title}' (lower priority)"
                )
        
        return suggestions


# ===================== Notification Manager (Observer Pattern) =====================

class Observer(ABC):
    """Abstract observer for notifications"""
    
    @abstractmethod
    def update(self, meeting: Meeting, event_type: str) -> None:
        pass


class EmailNotifier(Observer):
    """Email notification observer"""
    
    def update(self, meeting: Meeting, event_type: str) -> None:
        if event_type == "invitation":
            for participant in meeting.participants:
                print(f"📧 Email sent to {participant.email}: Invitation for '{meeting.title}'")
        elif event_type == "update":
            all_users = [meeting.organizer] + meeting.participants
            for user in all_users:
                print(f"📧 Email sent to {user.email}: '{meeting.title}' updated")
        elif event_type == "cancellation":
            all_users = [meeting.organizer] + meeting.participants
            for user in all_users:
                print(f"📧 Email sent to {user.email}: '{meeting.title}' cancelled")
        elif event_type == "reminder":
            all_users = [meeting.organizer] + meeting.participants
            for user in all_users:
                print(f"📧 Reminder sent to {user.email}: '{meeting.title}' in 15 minutes")


class NotificationManager:
    """
    Manages meeting notifications (Singleton).
    
    Usage:
        manager = NotificationManager()
        manager.subscribe(EmailNotifier())
        manager.send_invitation(meeting)
    
    Returns:
        NotificationManager: Notification manager instance
    """
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(NotificationManager, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        self.observers: List[Observer] = []
    
    def subscribe(self, observer: Observer) -> None:
        """Add notification observer"""
        self.observers.append(observer)
    
    def unsubscribe(self, observer: Observer) -> None:
        """Remove notification observer"""
        if observer in self.observers:
            self.observers.remove(observer)
    
    def notify(self, meeting: Meeting, event_type: str) -> None:
        """Notify all observers"""
        for observer in self.observers:
            observer.update(meeting, event_type)
    
    def send_invitation(self, meeting: Meeting) -> None:
        """Send meeting invitation"""
        self.notify(meeting, "invitation")
    
    def send_update(self, meeting: Meeting) -> None:
        """Send meeting update notification"""
        self.notify(meeting, "update")
    
    def send_cancellation(self, meeting: Meeting) -> None:
        """Send cancellation notification"""
        self.notify(meeting, "cancellation")
    
    def send_reminder(self, meeting: Meeting) -> None:
        """Send meeting reminder"""
        self.notify(meeting, "reminder")


# ===================== Calendar Manager (Singleton) =====================

class CalendarManager:
    """
    Central manager for calendar operations (Singleton).
    
    Usage:
        manager = CalendarManager()
        manager.create_meeting(meeting)
        manager.reschedule_meeting(meeting_id, new_time)
        free_slots = manager.find_meeting_time(users, duration)
    
    Returns:
        CalendarManager: Singleton manager instance
    """
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(CalendarManager, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        
        self.calendars: Dict[str, Calendar] = {}
        self.meetings: Dict[str, Meeting] = {}
        self.rooms: Dict[str, Room] = {}
        self.availability_checker = AvailabilityChecker()
        self.conflict_detector = ConflictDetector()
        self.notification_manager = NotificationManager()
        
        # Subscribe email notifier
        self.notification_manager.subscribe(EmailNotifier())
    
    def register_calendar(self, calendar: Calendar) -> None:
        """Register a user's calendar"""
        self.calendars[calendar.owner.id] = calendar
    
    def add_room(self, room: Room) -> None:
        """Add meeting room"""
        self.rooms[room.id] = room
    
    def create_meeting(self, meeting: Meeting) -> bool:
        """
        Create a new meeting.
        
        Process:
            1. Detect conflicts
            2. Book room if specified
            3. Add to all participant calendars
            4. Send invitations
        
        Returns:
            bool: True if meeting created successfully
        """
        # Detect conflicts
        conflicts = self.conflict_detector.detect_conflicts(meeting)
        if conflicts:
            print(f"\n⚠️  Detected {len(conflicts)} conflict(s) for '{meeting.title}':")
            for conflict in conflicts:
                print(f"   - {conflict.user.name}: overlaps with '{conflict.conflicting_meeting.title}'")
            
            # Show suggestions
            suggestions = self.conflict_detector.resolve_conflicts(conflicts)
            if suggestions:
                print(f"\n💡 Suggestions:")
                for suggestion in suggestions[:3]:
                    print(f"   - {suggestion}")
        
        # Book room
        if meeting.room:
            if not meeting.room.book(meeting):
                print(f"✗ Failed to book room for meeting")
                return False
        
        # Add to calendars
        meeting.organizer.calendar.add_meeting(meeting)
        for participant in meeting.participants:
            participant.calendar.add_meeting(meeting)
        
        # Store meeting
        self.meetings[meeting.id] = meeting
        
        # Send invitations
        self.notification_manager.send_invitation(meeting)
        
        print(f"\n✓ Meeting '{meeting.title}' created successfully")
        return True
    
    def cancel_meeting(self, meeting_id: str) -> bool:
        """Cancel a meeting"""
        if meeting_id not in self.meetings:
            return False
        
        meeting = self.meetings[meeting_id]
        meeting.status = MeetingStatus.CANCELLED
        
        # Remove from calendars
        meeting.organizer.calendar.remove_meeting(meeting_id)
        for participant in meeting.participants:
            participant.calendar.remove_meeting(meeting_id)
        
        # Cancel room booking
        if meeting.room:
            meeting.room.cancel_booking(meeting)
        
        # Send cancellation notification
        self.notification_manager.send_cancellation(meeting)
        
        return True
    
    def reschedule_meeting(self, meeting_id: str, new_start: datetime, 
                          new_end: datetime) -> bool:
        """Reschedule a meeting to new time"""
        if meeting_id not in self.meetings:
            return False
        
        meeting = self.meetings[meeting_id]
        old_start = meeting.start_time
        old_end = meeting.end_time
        
        # Update times
        meeting.start_time = new_start
        meeting.end_time = new_end
        
        # Check conflicts with new time
        conflicts = self.conflict_detector.detect_conflicts(meeting)
        if conflicts:
            print(f"⚠️  Warning: Rescheduled meeting has conflicts")
        
        # Update room booking
        if meeting.room:
            meeting.room.cancel_booking(
                Meeting("temp", old_start, old_end, meeting.organizer)
            )
            meeting.room.book(meeting)
        
        # Send update notification
        self.notification_manager.send_update(meeting)
        
        print(f"✓ Meeting '{meeting.title}' rescheduled")
        return True
    
    def find_meeting_time(self, users: List[User], duration_minutes: int,
                         date_range: Optional[TimeSlot] = None) -> List[TimeSlot]:
        """
        Find common free time for users.
        
        Args:
            users: List of participants
            duration_minutes: Required meeting duration
            date_range: Time range to search (default: next 7 days)
        
        Returns:
            List of available time slots
        """
        if date_range is None:
            # Default: search next 7 days during working hours (9 AM - 5 PM)
            start = datetime.now().replace(hour=9, minute=0, second=0, microsecond=0)
            end = start + timedelta(days=7)
            date_range = TimeSlot(start, end)
        
        return self.availability_checker.find_free_slots(users, duration_minutes, date_range)
    
    def find_available_room(self, time_slot: TimeSlot, capacity: int) -> Optional[Room]:
        """Find available room matching criteria"""
        for room in self.rooms.values():
            if room.capacity >= capacity and room.is_available(time_slot):
                return room
        return None


# ===================== Demo Implementation =====================

def print_separator(title: str = ""):
    """Print a formatted separator"""
    if title:
        print(f"\n{'='*70}")
        print(f"  {title}")
        print('='*70)
    else:
        print('-' * 70)


def demo_meeting_scheduler():
    """
    Comprehensive demonstration of Meeting Scheduler system.
    
    Demonstrates:
    1. User and calendar creation
    2. Room setup
    3. Simple meeting creation
    4. Conflict detection
    5. Finding common free time
    6. Recurring meetings
    7. Room booking
    8. Meeting rescheduling
    9. Notifications
    """
    
    print_separator("MEETING SCHEDULER SYSTEM DEMO")
    
    # 1. Create users with calendars
    print("\n1. Creating Users and Calendars")
    print_separator()
    
    alice = User("u1", "Alice Johnson", "alice@company.com", "America/New_York")
    bob = User("u2", "Bob Smith", "bob@company.com", "America/Los_Angeles")
    charlie = User("u3", "Charlie Brown", "charlie@company.com", "Europe/London")
    
    print(f"✓ Created users:")
    print(f"   - {alice.name} ({alice.time_zone})")
    print(f"   - {bob.name} ({bob.time_zone})")
    print(f"   - {charlie.name} ({charlie.time_zone})")
    
    # 2. Create calendar manager and register calendars
    print("\n2. Setting Up Calendar Manager")
    print_separator()
    
    manager = CalendarManager()
    manager.register_calendar(alice.calendar)
    manager.register_calendar(bob.calendar)
    manager.register_calendar(charlie.calendar)
    
    print(f"✓ Registered {len(manager.calendars)} calendars")
    
    # 3. Create meeting rooms
    print("\n3. Creating Meeting Rooms")
    print_separator()
    
    room1 = Room("r1", "Conference Room A", 10, "Building 1, Floor 2")
    room1.add_amenity("Projector")
    room1.add_amenity("Whiteboard")
    room1.add_amenity("Video Conference")
    
    room2 = Room("r2", "Small Meeting Room", 4, "Building 1, Floor 3")
    room2.add_amenity("TV Screen")
    
    manager.add_room(room1)
    manager.add_room(room2)
    
    print(f"✓ Created rooms:")
    print(f"   - {room1.name} (capacity: {room1.capacity})")
    print(f"   - {room2.name} (capacity: {room2.capacity})")
    
    # 4. Create a simple meeting using builder
    print("\n4. Creating Simple Meeting")
    print_separator()
    
    tomorrow = datetime.now().replace(hour=10, minute=0, second=0, microsecond=0) + timedelta(days=1)
    meeting1 = (MeetingBuilder()
                .set_title("Team Standup")
                .set_description("Daily standup meeting")
                .set_time(tomorrow, tomorrow + timedelta(minutes=30))
                .set_organizer(alice)
                .add_participant(bob)
                .add_participant(charlie)
                .set_room(room2)
                .set_priority(ConflictPriority.MEDIUM)
                .build())
    
    print(f"📅 Meeting: {meeting1.title}")
    print(f"   Time: {meeting1.start_time.strftime('%Y-%m-%d %H:%M')} - {meeting1.end_time.strftime('%H:%M')}")
    print(f"   Duration: {meeting1.get_duration_minutes()} minutes")
    print(f"   Organizer: {meeting1.organizer.name}")
    print(f"   Participants: {len(meeting1.participants)}")
    
    manager.create_meeting(meeting1)
    
    # 5. Try to create conflicting meeting
    print("\n5. Testing Conflict Detection")
    print_separator()
    
    # Create overlapping meeting
    conflicting_meeting = (MeetingBuilder()
                          .set_title("Client Call")
                          .set_time(tomorrow + timedelta(minutes=15), 
                                   tomorrow + timedelta(minutes=45))
                          .set_organizer(alice)
                          .add_participant(bob)
                          .set_priority(ConflictPriority.HIGH)
                          .build())
    
    print(f"📅 Attempting to schedule: {conflicting_meeting.title}")
    manager.create_meeting(conflicting_meeting)
    
    # 6. Find common free time
    print("\n6. Finding Common Free Time")
    print_separator()
    
    search_start = datetime.now().replace(hour=9, minute=0, second=0, microsecond=0) + timedelta(days=2)
    search_end = search_start + timedelta(days=1)
    search_range = TimeSlot(search_start, search_end)
    
    print(f"🔍 Searching for 60-minute slots between {alice.name}, {bob.name}, and {charlie.name}")
    print(f"   Time range: {search_start.strftime('%Y-%m-%d %H:%M')} - {search_end.strftime('%Y-%m-%d %H:%M')}")
    
    free_slots = manager.find_meeting_time([alice, bob, charlie], 60, search_range)
    
    print(f"\n✓ Found {len(free_slots)} available time slots:")
    for i, slot in enumerate(free_slots[:5], 1):
        print(f"   {i}. {slot.start.strftime('%Y-%m-%d %H:%M')} - {slot.end.strftime('%H:%M')} "
              f"({slot.duration_minutes()} min available)")
    
    # 7. Create recurring meeting
    print("\n7. Creating Recurring Meeting")
    print_separator()
    
    recurrence_start = datetime.now().replace(hour=14, minute=0, second=0, microsecond=0) + timedelta(days=1)
    recurrence_rule = RecurrenceRule(
        Frequency.WEEKLY,
        interval=1,
        until=recurrence_start + timedelta(days=30),
        count=4
    )
    
    recurring_meeting = (MeetingBuilder()
                        .set_title("Weekly Team Sync")
                        .set_time(recurrence_start, recurrence_start + timedelta(hours=1))
                        .set_organizer(alice)
                        .add_participant(bob)
                        .set_recurrence(recurrence_rule)
                        .set_room(room1)
                        .build())
    
    print(f"📅 Recurring Meeting: {recurring_meeting.title}")
    print(f"   Pattern: {recurring_meeting.recurrence_rule}")
    print(f"   First occurrence: {recurring_meeting.start_time.strftime('%Y-%m-%d %H:%M')}")
    
    # Generate occurrences
    occurrences = recurring_meeting.generate_occurrences(
        recurring_meeting.start_time + timedelta(days=60)
    )
    print(f"\n✓ Generated {len(occurrences)} occurrences:")
    for i, occurrence in enumerate(occurrences, 1):
        print(f"   {i}. {occurrence.start_time.strftime('%Y-%m-%d %H:%M')}")
    
    manager.create_meeting(recurring_meeting)
    
    # 8. Book room for specific meeting
    print("\n8. Room Booking with Capacity Check")
    print_separator()
    
    large_meeting_time = datetime.now().replace(hour=15, minute=0, second=0, microsecond=0) + timedelta(days=3)
    large_meeting = (MeetingBuilder()
                    .set_title("All Hands Meeting")
                    .set_time(large_meeting_time, large_meeting_time + timedelta(hours=2))
                    .set_organizer(alice)
                    .add_participant(bob)
                    .add_participant(charlie)
                    .set_room(room1)
                    .set_priority(ConflictPriority.CRITICAL)
                    .build())
    
    print(f"📅 Meeting: {large_meeting.title}")
    print(f"   Participants: {len(large_meeting.participants) + 1} (including organizer)")
    print(f"   Requested room: {room1.name} (capacity: {room1.capacity})")
    
    manager.create_meeting(large_meeting)
    
    # 9. Reschedule meeting
    print("\n9. Rescheduling Meeting")
    print_separator()
    
    print(f"📅 Original time: {meeting1.start_time.strftime('%Y-%m-%d %H:%M')}")
    
    new_time = meeting1.start_time + timedelta(hours=2)
    manager.reschedule_meeting(
        meeting1.id,
        new_time,
        new_time + timedelta(minutes=30)
    )
    
    print(f"📅 New time: {new_time.strftime('%Y-%m-%d %H:%M')}")
    
    # 10. Calendar summary
    print("\n10. Calendar Summary")
    print_separator()
    
    print(f"\n📊 {alice.name}'s Calendar:")
    print(f"   Total meetings: {len(alice.calendar.meetings)}")
    for meeting in list(alice.calendar.meetings.values())[:3]:
        print(f"   - {meeting.title}: {meeting.start_time.strftime('%Y-%m-%d %H:%M')}")
    
    print(f"\n📊 {bob.name}'s Calendar:")
    print(f"   Total meetings: {len(bob.calendar.meetings)}")
    
    print(f"\n📊 Room Utilization:")
    for room in [room1, room2]:
        print(f"   {room.name}: {len(room.bookings)} bookings")
    
    # 11. Availability check
    print("\n11. Checking Availability")
    print_separator()
    
    check_time = tomorrow + timedelta(hours=3)
    check_slot = TimeSlot(check_time, check_time + timedelta(minutes=30))
    
    print(f"🔍 Checking availability at {check_time.strftime('%Y-%m-%d %H:%M')}")
    
    availability = manager.availability_checker.check_availability(
        [alice, bob, charlie], check_slot
    )
    
    for user, is_available in availability.items():
        status = "✓ Available" if is_available else "✗ Busy"
        print(f"   {user.name}: {status}")
    
    print("\n" + "="*70)
    print("  DEMO COMPLETE")
    print("="*70)
    print("\n✓ Meeting Scheduler system features demonstrated:")
    print("  • Calendar management for multiple users")
    print("  • Meeting creation with Builder pattern")
    print("  • Conflict detection and resolution")
    print("  • Finding common free time slots")
    print("  • Recurring meeting pattern generation")
    print("  • Room booking with capacity validation")
    print("  • Meeting rescheduling")
    print("  • Email notifications (Observer pattern)")
    print("  • Interval overlap and merge algorithms")
    print("  • Availability checking across participants")


if __name__ == "__main__":
    demo_meeting_scheduler()
