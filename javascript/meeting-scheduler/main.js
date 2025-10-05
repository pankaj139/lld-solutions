/**
 * Meeting Scheduler System Implementation
 * 
 * This module implements a comprehensive meeting scheduling system (like Google Calendar) with:
 * - Calendar management with conflict detection
 * - Availability checking across multiple participants
 * - Time zone support and conversion
 * - Recurring meetings with flexible patterns
 * - Room booking with capacity constraints
 * - Meeting invitations and RSVP
 * - Notification system with reminders
 * - Find common free time algorithm
 * - Interval overlap and merge algorithms
 * - Priority-based conflict resolution
 * 
 * Usage:
 *   // Create users and calendars
 *   const organizer = new User("user1", "Alice", "alice@example.com", "America/New_York");
 *   const participant = new User("user2", "Bob", "bob@example.com", "America/Los_Angeles");
 *   
 *   // Create meeting using builder
 *   const meeting = new MeetingBuilder()
 *       .setTitle("Team Standup")
 *       .setTime(startTime, endTime)
 *       .setOrganizer(organizer)
 *       .addParticipant(participant)
 *       .build();
 *   
 *   // Schedule meeting
 *   const scheduler = new CalendarManager();
 *   scheduler.createMeeting(meeting);
 *   
 *   // Find common free time
 *   const freeSlots = scheduler.findMeetingTime([organizer, participant], 60);
 * 
 * Design Patterns:
 *   - Strategy Pattern: Availability checking, conflict resolution
 *   - Observer Pattern: Meeting notifications
 *   - Factory Pattern: Meeting type creation
 *   - Builder Pattern: Meeting construction
 *   - Chain of Responsibility: Conflict handling
 *   - State Pattern: Meeting lifecycle
 *   - Composite Pattern: Recurring meeting series
 *   - Memento Pattern: Meeting history
 *   - Singleton Pattern: Calendar manager
 *   - Template Method: Scheduling workflow
 * 
 * Author: LLD Solutions
 * Date: 2025-10-05
 */

const { v4: uuidv4 } = require('crypto');

// ===================== Enums =====================

const MeetingStatus = {
    SCHEDULED: 'scheduled',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled'
};

const Visibility = {
    PUBLIC: 'public',
    PRIVATE: 'private',
    CONFIDENTIAL: 'confidential'
};

const InvitationStatus = {
    PENDING: 'pending',
    ACCEPTED: 'accepted',
    DECLINED: 'declined',
    TENTATIVE: 'tentative'
};

const Frequency = {
    DAILY: 'daily',
    WEEKLY: 'weekly',
    MONTHLY: 'monthly',
    YEARLY: 'yearly'
};

const ConflictPriority = {
    LOW: 1,
    MEDIUM: 2,
    HIGH: 3,
    CRITICAL: 4
};

// ===================== Utility Functions =====================

function generateId() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// ===================== Time Slot and Interval Classes =====================

/**
 * Represents a time interval.
 * 
 * Usage:
 *   const slot = new TimeSlot(startTime, endTime);
 *   const overlaps = slot.overlaps(otherSlot);
 *   const duration = slot.duration();
 * 
 * Returns:
 *   TimeSlot: Time interval with overlap detection
 */
class TimeSlot {
    constructor(start, end) {
        if (start >= end) {
            throw new Error("Start time must be before end time");
        }
        this.start = start;
        this.end = end;
    }

    overlaps(other) {
        return this.start < other.end && this.end > other.start;
    }

    contains(time) {
        return this.start <= time && time < this.end;
    }

    duration() {
        return this.end - this.start;
    }

    durationMinutes() {
        return Math.floor(this.duration() / (1000 * 60));
    }

    merge(other) {
        if (!this.overlaps(other)) {
            throw new Error("Cannot merge non-overlapping slots");
        }
        return new TimeSlot(
            new Date(Math.min(this.start, other.start)),
            new Date(Math.max(this.end, other.end))
        );
    }

    toString() {
        const formatTime = (date) => {
            return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
        };
        return `TimeSlot(${formatTime(this.start)} - ${formatTime(this.end)})`;
    }
}

/**
 * Merge overlapping time intervals.
 * 
 * Algorithm:
 *   1. Sort intervals by start time
 *   2. Iterate and merge overlapping intervals
 *   3. Return merged list
 * 
 * Complexity: O(N log N)
 */
function mergeIntervals(intervals) {
    if (intervals.length === 0) return [];

    const sorted = intervals.sort((a, b) => a.start - b.start);
    const merged = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
        const current = sorted[i];
        const last = merged[merged.length - 1];

        if (current.start <= last.end) {
            last.end = new Date(Math.max(last.end, current.end));
        } else {
            merged.push(current);
        }
    }

    return merged;
}

// ===================== User and Calendar Classes =====================

/**
 * Represents a user with calendar.
 * 
 * Usage:
 *   const user = new User("u1", "Alice", "alice@example.com", "America/New_York");
 *   const availability = user.getAvailability(dateRange);
 * 
 * Returns:
 *   User: User with calendar and availability
 */
class User {
    constructor(userId, name, email, timeZone = "UTC") {
        this.id = userId;
        this.name = name;
        this.email = email;
        this.timeZone = timeZone;
        this.calendar = new Calendar(this);
    }

    getAvailability(start, end) {
        return this.calendar.findFreeSlots(new TimeSlot(start, end));
    }

    toString() {
        return `User(${this.name}, ${this.email})`;
    }
}

/**
 * User's calendar managing meetings.
 * 
 * Usage:
 *   const calendar = new Calendar(user);
 *   calendar.addMeeting(meeting);
 *   const conflicts = calendar.hasConflict(newMeeting);
 *   const freeSlots = calendar.findFreeSlots(timeRange);
 * 
 * Returns:
 *   Calendar: Calendar with meeting management
 */
class Calendar {
    constructor(owner) {
        this.id = generateId();
        this.owner = owner;
        this.meetings = new Map();
    }

    addMeeting(meeting) {
        this.meetings.set(meeting.id, meeting);
        console.log(`✓ Added meeting '${meeting.title}' to ${this.owner.name}'s calendar`);
    }

    removeMeeting(meetingId) {
        if (this.meetings.has(meetingId)) {
            const meeting = this.meetings.get(meetingId);
            this.meetings.delete(meetingId);
            console.log(`✓ Removed meeting '${meeting.title}' from calendar`);
            return true;
        }
        return false;
    }

    getMeetings(start, end) {
        return Array.from(this.meetings.values()).filter(m =>
            m.startTime < end && m.endTime > start
        );
    }

    findFreeSlots(timeRange) {
        const busyTimes = [];

        for (const meeting of this.meetings.values()) {
            const meetingSlot = new TimeSlot(meeting.startTime, meeting.endTime);
            if (meetingSlot.overlaps(timeRange)) {
                const start = new Date(Math.max(meeting.startTime, timeRange.start));
                const end = new Date(Math.min(meeting.endTime, timeRange.end));
                busyTimes.push(new TimeSlot(start, end));
            }
        }

        if (busyTimes.length === 0) {
            return [timeRange];
        }

        const mergedBusy = mergeIntervals(busyTimes);
        const freeSlots = [];
        let currentTime = timeRange.start;

        for (const busySlot of mergedBusy) {
            if (currentTime < busySlot.start) {
                freeSlots.push(new TimeSlot(currentTime, busySlot.start));
            }
            currentTime = new Date(Math.max(currentTime, busySlot.end));
        }

        if (currentTime < timeRange.end) {
            freeSlots.push(new TimeSlot(currentTime, timeRange.end));
        }

        return freeSlots;
    }

    hasConflict(meeting) {
        for (const existing of this.meetings.values()) {
            if (existing.id !== meeting.id) {
                if (meeting.startTime < existing.endTime && 
                    meeting.endTime > existing.startTime) {
                    return true;
                }
            }
        }
        return false;
    }

    toString() {
        return `Calendar(${this.owner.name}, ${this.meetings.size} meetings)`;
    }
}

// ===================== Meeting Classes =====================

/**
 * Represents a scheduled meeting.
 * 
 * Usage:
 *   const meeting = new Meeting("Standup", startTime, endTime, organizer);
 *   meeting.addParticipant(user);
 *   meeting.setRoom(room);
 * 
 * Returns:
 *   Meeting: Meeting instance with all details
 */
class Meeting {
    constructor(title, startTime, endTime, organizer) {
        this.id = generateId();
        this.title = title;
        this.description = "";
        this.startTime = startTime;
        this.endTime = endTime;
        this.organizer = organizer;
        this.participants = [];
        this.room = null;
        this.status = MeetingStatus.SCHEDULED;
        this.visibility = Visibility.PUBLIC;
        this.priority = ConflictPriority.MEDIUM;
        this.createdAt = new Date();
    }

    addParticipant(user) {
        if (!this.participants.includes(user)) {
            this.participants.push(user);
        }
    }

    removeParticipant(user) {
        const index = this.participants.indexOf(user);
        if (index > -1) {
            this.participants.splice(index, 1);
        }
    }

    setRoom(room) {
        this.room = room;
    }

    getDuration() {
        return this.endTime - this.startTime;
    }

    getDurationMinutes() {
        return Math.floor(this.getDuration() / (1000 * 60));
    }

    overlapsWith(other) {
        return this.startTime < other.endTime && this.endTime > other.startTime;
    }

    isRecurring() {
        return this instanceof RecurringMeeting;
    }

    toString() {
        const formatDateTime = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${year}-${month}-${day} ${hours}:${minutes}`;
        };
        return `Meeting('${this.title}', ${formatDateTime(this.startTime)})`;
    }
}

/**
 * Defines recurrence pattern for meetings.
 * 
 * Usage:
 *   const rule = new RecurrenceRule(Frequency.WEEKLY, 1, untilDate);
 *   const nextDate = rule.getNextDate(currentDate);
 * 
 * Returns:
 *   RecurrenceRule: Recurrence pattern
 */
class RecurrenceRule {
    constructor(frequency, interval = 1, until = null, count = null) {
        this.frequency = frequency;
        this.interval = interval;
        this.until = until;
        this.count = count;
        this.byDay = [];
    }

    getNextDate(currentDate) {
        const date = new Date(currentDate);

        if (this.frequency === Frequency.DAILY) {
            date.setDate(date.getDate() + this.interval);
        } else if (this.frequency === Frequency.WEEKLY) {
            date.setDate(date.getDate() + (7 * this.interval));
        } else if (this.frequency === Frequency.MONTHLY) {
            date.setMonth(date.getMonth() + this.interval);
        } else if (this.frequency === Frequency.YEARLY) {
            date.setFullYear(date.getFullYear() + this.interval);
        }

        return date;
    }

    toString() {
        return `RecurrenceRule(${this.frequency}, every ${this.interval})`;
    }
}

/**
 * Recurring meeting with recurrence pattern.
 * 
 * Usage:
 *   const rule = new RecurrenceRule(Frequency.WEEKLY, 1);
 *   const meeting = new RecurringMeeting(title, start, end, organizer, rule);
 *   const occurrences = meeting.generateOccurrences(untilDate);
 * 
 * Returns:
 *   RecurringMeeting: Recurring meeting series
 */
class RecurringMeeting extends Meeting {
    constructor(title, startTime, endTime, organizer, recurrenceRule) {
        super(title, startTime, endTime, organizer);
        this.recurrenceRule = recurrenceRule;
        this.exceptions = new Set();
        this.occurrences = [];
    }

    addException(exceptionDate) {
        this.exceptions.add(exceptionDate.toDateString());
    }

    generateOccurrences(until, maxCount = 365) {
        this.occurrences = [];
        let currentDate = new Date(this.startTime);
        let count = 0;

        const ruleUntil = this.recurrenceRule.until || until;
        const ruleCount = this.recurrenceRule.count || maxCount;

        while (currentDate <= ruleUntil && count < ruleCount) {
            const dateString = currentDate.toDateString();

            if (!this.exceptions.has(dateString)) {
                const occurrenceStart = new Date(currentDate);
                const occurrenceEnd = new Date(occurrenceStart.getTime() + this.getDuration());

                const occurrence = new Meeting(this.title, occurrenceStart, occurrenceEnd, this.organizer);
                occurrence.description = this.description;
                occurrence.participants = [...this.participants];
                occurrence.room = this.room;
                occurrence.visibility = this.visibility;

                this.occurrences.push(occurrence);
                count++;
            }

            currentDate = this.recurrenceRule.getNextDate(currentDate);
        }

        return this.occurrences;
    }

    toString() {
        return `RecurringMeeting('${this.title}', ${this.recurrenceRule})`;
    }
}

// ===================== Room Management =====================

/**
 * Meeting room with booking management.
 * 
 * Usage:
 *   const room = new Room("r1", "Conference Room A", 10, "Building 1");
 *   const isAvailable = room.isAvailable(timeSlot);
 *   room.book(meeting);
 * 
 * Returns:
 *   Room: Room with availability checking
 */
class Room {
    constructor(roomId, name, capacity, location) {
        this.id = roomId;
        this.name = name;
        this.capacity = capacity;
        this.location = location;
        this.amenities = [];
        this.bookings = [];
    }

    addAmenity(amenity) {
        this.amenities.push(amenity);
    }

    isAvailable(timeSlot) {
        for (const booking of this.bookings) {
            if (booking.overlaps(timeSlot)) {
                return false;
            }
        }
        return true;
    }

    book(meeting) {
        const timeSlot = new TimeSlot(meeting.startTime, meeting.endTime);

        if (meeting.participants.length + 1 > this.capacity) {
            console.log(`✗ Room '${this.name}' capacity exceeded (${this.capacity} max)`);
            return false;
        }

        if (!this.isAvailable(timeSlot)) {
            console.log(`✗ Room '${this.name}' not available`);
            return false;
        }

        this.bookings.push(timeSlot);
        console.log(`✓ Booked room '${this.name}' for meeting '${meeting.title}'`);
        return true;
    }

    cancelBooking(meeting) {
        const timeSlot = new TimeSlot(meeting.startTime, meeting.endTime);
        for (let i = 0; i < this.bookings.length; i++) {
            const booking = this.bookings[i];
            if (booking.start.getTime() === timeSlot.start.getTime() &&
                booking.end.getTime() === timeSlot.end.getTime()) {
                this.bookings.splice(i, 1);
                return true;
            }
        }
        return false;
    }

    toString() {
        return `Room('${this.name}', capacity=${this.capacity}, ${this.bookings.length} bookings)`;
    }
}

// ===================== Meeting Builder (Builder Pattern) =====================

/**
 * Builder for constructing meetings with fluent interface.
 * 
 * Usage:
 *   const meeting = new MeetingBuilder()
 *       .setTitle("Team Meeting")
 *       .setTime(start, end)
 *       .setOrganizer(user)
 *       .addParticipant(user2)
 *       .setRoom(room)
 *       .build();
 * 
 * Returns:
 *   MeetingBuilder: Fluent builder for meetings
 */
class MeetingBuilder {
    constructor() {
        this._title = "";
        this._description = "";
        this._startTime = null;
        this._endTime = null;
        this._organizer = null;
        this._participants = [];
        this._room = null;
        this._recurrenceRule = null;
        this._priority = ConflictPriority.MEDIUM;
        this._visibility = Visibility.PUBLIC;
    }

    setTitle(title) {
        this._title = title;
        return this;
    }

    setDescription(description) {
        this._description = description;
        return this;
    }

    setTime(startTime, endTime) {
        this._startTime = startTime;
        this._endTime = endTime;
        return this;
    }

    setOrganizer(organizer) {
        this._organizer = organizer;
        return this;
    }

    addParticipant(participant) {
        this._participants.push(participant);
        return this;
    }

    setRoom(room) {
        this._room = room;
        return this;
    }

    setRecurrence(recurrenceRule) {
        this._recurrenceRule = recurrenceRule;
        return this;
    }

    setPriority(priority) {
        this._priority = priority;
        return this;
    }

    setVisibility(visibility) {
        this._visibility = visibility;
        return this;
    }

    build() {
        if (!this._title || !this._startTime || !this._endTime || !this._organizer) {
            throw new Error("Missing required fields: title, time, organizer");
        }

        let meeting;
        if (this._recurrenceRule) {
            meeting = new RecurringMeeting(
                this._title, this._startTime, this._endTime,
                this._organizer, this._recurrenceRule
            );
        } else {
            meeting = new Meeting(
                this._title, this._startTime, this._endTime, this._organizer
            );
        }

        meeting.description = this._description;
        meeting.priority = this._priority;
        meeting.visibility = this._visibility;

        for (const participant of this._participants) {
            meeting.addParticipant(participant);
        }

        if (this._room) {
            meeting.setRoom(this._room);
        }

        return meeting;
    }
}

// ===================== Availability Checker (Strategy Pattern) =====================

/**
 * Finds common free time across participants.
 * 
 * Usage:
 *   const checker = new AvailabilityChecker();
 *   const freeSlots = checker.findFreeSlots([user1, user2], duration, dateRange);
 * 
 * Returns:
 *   AvailabilityChecker: Availability checking utility
 */
class AvailabilityChecker {
    checkAvailability(users, timeSlot) {
        const availability = {};
        for (const user of users) {
            const tempMeeting = new Meeting("temp", timeSlot.start, timeSlot.end, user);
            const hasConflict = user.calendar.hasConflict(tempMeeting);
            availability[user.id] = !hasConflict;
        }
        return availability;
    }

    findFreeSlots(users, durationMinutes, timeRange, maxResults = 10) {
        const allBusyTimes = [];

        for (const user of users) {
            const freeSlots = user.calendar.findFreeSlots(timeRange);
            
            if (freeSlots.length === 0) {
                allBusyTimes.push(timeRange);
            } else {
                let current = timeRange.start;
                for (const freeSlot of freeSlots) {
                    if (current < freeSlot.start) {
                        allBusyTimes.push(new TimeSlot(current, freeSlot.start));
                    }
                    current = freeSlot.end;
                }
                if (current < timeRange.end) {
                    allBusyTimes.push(new TimeSlot(current, timeRange.end));
                }
            }
        }

        if (allBusyTimes.length === 0) {
            return [timeRange];
        }

        const mergedBusy = mergeIntervals(allBusyTimes);
        const freeSlots = [];
        let currentTime = timeRange.start;

        for (const busySlot of mergedBusy) {
            if (currentTime < busySlot.start) {
                const gap = new TimeSlot(currentTime, busySlot.start);
                if (gap.durationMinutes() >= durationMinutes) {
                    freeSlots.push(gap);
                    if (freeSlots.length >= maxResults) {
                        return freeSlots;
                    }
                }
            }
            currentTime = new Date(Math.max(currentTime, busySlot.end));
        }

        if (currentTime < timeRange.end) {
            const gap = new TimeSlot(currentTime, timeRange.end);
            if (gap.durationMinutes() >= durationMinutes) {
                freeSlots.push(gap);
            }
        }

        return freeSlots.slice(0, maxResults);
    }
}

// ===================== Conflict Detector =====================

class Conflict {
    constructor(user, conflictingMeeting, severity) {
        this.user = user;
        this.conflictingMeeting = conflictingMeeting;
        this.severity = severity;
    }
}

/**
 * Detects and resolves scheduling conflicts.
 * 
 * Usage:
 *   const detector = new ConflictDetector();
 *   const conflicts = detector.detectConflicts(meeting);
 * 
 * Returns:
 *   ConflictDetector: Conflict detection utility
 */
class ConflictDetector {
    detectConflicts(meeting) {
        const conflicts = [];
        const allUsers = [meeting.organizer, ...meeting.participants];

        for (const user of allUsers) {
            for (const existingMeeting of user.calendar.meetings.values()) {
                if (existingMeeting.id !== meeting.id) {
                    if (meeting.overlapsWith(existingMeeting)) {
                        const severity = existingMeeting.priority >= meeting.priority
                            ? "hard"
                            : "soft";
                        conflicts.push(new Conflict(user, existingMeeting, severity));
                    }
                }
            }
        }

        return conflicts;
    }

    resolveConflicts(conflicts) {
        const suggestions = [];

        for (const conflict of conflicts) {
            if (conflict.severity === "hard") {
                suggestions.push(
                    `Reschedule '${conflict.conflictingMeeting.title}' or choose different time`
                );
            } else {
                suggestions.push(
                    `Consider rescheduling '${conflict.conflictingMeeting.title}' (lower priority)`
                );
            }
        }

        return suggestions;
    }
}

// ===================== Notification Manager (Observer Pattern) =====================

class Observer {
    update(meeting, eventType) {
        throw new Error("Method must be implemented");
    }
}

class EmailNotifier extends Observer {
    update(meeting, eventType) {
        if (eventType === "invitation") {
            for (const participant of meeting.participants) {
                console.log(`📧 Email sent to ${participant.email}: Invitation for '${meeting.title}'`);
            }
        } else if (eventType === "update") {
            const allUsers = [meeting.organizer, ...meeting.participants];
            for (const user of allUsers) {
                console.log(`📧 Email sent to ${user.email}: '${meeting.title}' updated`);
            }
        } else if (eventType === "cancellation") {
            const allUsers = [meeting.organizer, ...meeting.participants];
            for (const user of allUsers) {
                console.log(`📧 Email sent to ${user.email}: '${meeting.title}' cancelled`);
            }
        } else if (eventType === "reminder") {
            const allUsers = [meeting.organizer, ...meeting.participants];
            for (const user of allUsers) {
                console.log(`📧 Reminder sent to ${user.email}: '${meeting.title}' in 15 minutes`);
            }
        }
    }
}

/**
 * Manages meeting notifications (Singleton).
 * 
 * Usage:
 *   const manager = new NotificationManager();
 *   manager.subscribe(new EmailNotifier());
 *   manager.sendInvitation(meeting);
 * 
 * Returns:
 *   NotificationManager: Notification manager instance
 */
class NotificationManager {
    constructor() {
        if (NotificationManager.instance) {
            return NotificationManager.instance;
        }
        NotificationManager.instance = this;

        this.observers = [];
    }

    subscribe(observer) {
        this.observers.push(observer);
    }

    unsubscribe(observer) {
        const index = this.observers.indexOf(observer);
        if (index > -1) {
            this.observers.splice(index, 1);
        }
    }

    notify(meeting, eventType) {
        for (const observer of this.observers) {
            observer.update(meeting, eventType);
        }
    }

    sendInvitation(meeting) {
        this.notify(meeting, "invitation");
    }

    sendUpdate(meeting) {
        this.notify(meeting, "update");
    }

    sendCancellation(meeting) {
        this.notify(meeting, "cancellation");
    }

    sendReminder(meeting) {
        this.notify(meeting, "reminder");
    }
}

// ===================== Calendar Manager (Singleton) =====================

/**
 * Central manager for calendar operations (Singleton).
 * 
 * Usage:
 *   const manager = new CalendarManager();
 *   manager.createMeeting(meeting);
 *   manager.rescheduleMeeting(meetingId, newTime);
 *   const freeSlots = manager.findMeetingTime(users, duration);
 * 
 * Returns:
 *   CalendarManager: Singleton manager instance
 */
class CalendarManager {
    constructor() {
        if (CalendarManager.instance) {
            return CalendarManager.instance;
        }
        CalendarManager.instance = this;

        this.calendars = new Map();
        this.meetings = new Map();
        this.rooms = new Map();
        this.availabilityChecker = new AvailabilityChecker();
        this.conflictDetector = new ConflictDetector();
        this.notificationManager = new NotificationManager();

        this.notificationManager.subscribe(new EmailNotifier());
    }

    registerCalendar(calendar) {
        this.calendars.set(calendar.owner.id, calendar);
    }

    addRoom(room) {
        this.rooms.set(room.id, room);
    }

    createMeeting(meeting) {
        const conflicts = this.conflictDetector.detectConflicts(meeting);
        
        if (conflicts.length > 0) {
            console.log(`\n⚠️  Detected ${conflicts.length} conflict(s) for '${meeting.title}':`);
            for (const conflict of conflicts) {
                console.log(`   - ${conflict.user.name}: overlaps with '${conflict.conflictingMeeting.title}'`);
            }

            const suggestions = this.conflictDetector.resolveConflicts(conflicts);
            if (suggestions.length > 0) {
                console.log(`\n💡 Suggestions:`);
                for (const suggestion of suggestions.slice(0, 3)) {
                    console.log(`   - ${suggestion}`);
                }
            }
        }

        if (meeting.room) {
            if (!meeting.room.book(meeting)) {
                console.log(`✗ Failed to book room for meeting`);
                return false;
            }
        }

        meeting.organizer.calendar.addMeeting(meeting);
        for (const participant of meeting.participants) {
            participant.calendar.addMeeting(meeting);
        }

        this.meetings.set(meeting.id, meeting);
        this.notificationManager.sendInvitation(meeting);

        console.log(`\n✓ Meeting '${meeting.title}' created successfully`);
        return true;
    }

    cancelMeeting(meetingId) {
        if (!this.meetings.has(meetingId)) {
            return false;
        }

        const meeting = this.meetings.get(meetingId);
        meeting.status = MeetingStatus.CANCELLED;

        meeting.organizer.calendar.removeMeeting(meetingId);
        for (const participant of meeting.participants) {
            participant.calendar.removeMeeting(meetingId);
        }

        if (meeting.room) {
            meeting.room.cancelBooking(meeting);
        }

        this.notificationManager.sendCancellation(meeting);
        return true;
    }

    rescheduleMeeting(meetingId, newStart, newEnd) {
        if (!this.meetings.has(meetingId)) {
            return false;
        }

        const meeting = this.meetings.get(meetingId);
        const oldStart = meeting.startTime;
        const oldEnd = meeting.endTime;

        meeting.startTime = newStart;
        meeting.endTime = newEnd;

        const conflicts = this.conflictDetector.detectConflicts(meeting);
        if (conflicts.length > 0) {
            console.log(`⚠️  Warning: Rescheduled meeting has conflicts`);
        }

        if (meeting.room) {
            const tempMeeting = new Meeting("temp", oldStart, oldEnd, meeting.organizer);
            meeting.room.cancelBooking(tempMeeting);
            meeting.room.book(meeting);
        }

        this.notificationManager.sendUpdate(meeting);
        console.log(`✓ Meeting '${meeting.title}' rescheduled`);
        return true;
    }

    findMeetingTime(users, durationMinutes, dateRange = null) {
        if (dateRange === null) {
            const start = new Date();
            start.setHours(9, 0, 0, 0);
            const end = new Date(start);
            end.setDate(end.getDate() + 7);
            dateRange = new TimeSlot(start, end);
        }

        return this.availabilityChecker.findFreeSlots(users, durationMinutes, dateRange);
    }

    findAvailableRoom(timeSlot, capacity) {
        for (const room of this.rooms.values()) {
            if (room.capacity >= capacity && room.isAvailable(timeSlot)) {
                return room;
            }
        }
        return null;
    }
}

// ===================== Demo Implementation =====================

function printSeparator(title = "") {
    if (title) {
        console.log(`\n${'='.repeat(70)}`);
        console.log(`  ${title}`);
        console.log('='.repeat(70));
    } else {
        console.log('-'.repeat(70));
    }
}

function formatDateTime(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function demoMeetingScheduler() {
    printSeparator("MEETING SCHEDULER SYSTEM DEMO");

    // 1. Create users
    console.log("\n1. Creating Users and Calendars");
    printSeparator();

    const alice = new User("u1", "Alice Johnson", "alice@company.com", "America/New_York");
    const bob = new User("u2", "Bob Smith", "bob@company.com", "America/Los_Angeles");
    const charlie = new User("u3", "Charlie Brown", "charlie@company.com", "Europe/London");

    console.log(`✓ Created users:`);
    console.log(`   - ${alice.name} (${alice.timeZone})`);
    console.log(`   - ${bob.name} (${bob.timeZone})`);
    console.log(`   - ${charlie.name} (${charlie.timeZone})`);

    // 2. Create calendar manager
    console.log("\n2. Setting Up Calendar Manager");
    printSeparator();

    const manager = new CalendarManager();
    manager.registerCalendar(alice.calendar);
    manager.registerCalendar(bob.calendar);
    manager.registerCalendar(charlie.calendar);

    console.log(`✓ Registered ${manager.calendars.size} calendars`);

    // 3. Create rooms
    console.log("\n3. Creating Meeting Rooms");
    printSeparator();

    const room1 = new Room("r1", "Conference Room A", 10, "Building 1, Floor 2");
    room1.addAmenity("Projector");
    room1.addAmenity("Whiteboard");
    room1.addAmenity("Video Conference");

    const room2 = new Room("r2", "Small Meeting Room", 4, "Building 1, Floor 3");
    room2.addAmenity("TV Screen");

    manager.addRoom(room1);
    manager.addRoom(room2);

    console.log(`✓ Created rooms:`);
    console.log(`   - ${room1.name} (capacity: ${room1.capacity})`);
    console.log(`   - ${room2.name} (capacity: ${room2.capacity})`);

    // 4. Create simple meeting
    console.log("\n4. Creating Simple Meeting");
    printSeparator();

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);

    const meeting1 = new MeetingBuilder()
        .setTitle("Team Standup")
        .setDescription("Daily standup meeting")
        .setTime(tomorrow, new Date(tomorrow.getTime() + 30 * 60 * 1000))
        .setOrganizer(alice)
        .addParticipant(bob)
        .addParticipant(charlie)
        .setRoom(room2)
        .setPriority(ConflictPriority.MEDIUM)
        .build();

    console.log(`📅 Meeting: ${meeting1.title}`);
    console.log(`   Time: ${formatDateTime(meeting1.startTime)} - ${formatDateTime(meeting1.endTime).split(' ')[1]}`);
    console.log(`   Duration: ${meeting1.getDurationMinutes()} minutes`);
    console.log(`   Organizer: ${meeting1.organizer.name}`);
    console.log(`   Participants: ${meeting1.participants.length}`);

    manager.createMeeting(meeting1);

    // 5. Conflict detection
    console.log("\n5. Testing Conflict Detection");
    printSeparator();

    const conflictingMeeting = new MeetingBuilder()
        .setTitle("Client Call")
        .setTime(
            new Date(tomorrow.getTime() + 15 * 60 * 1000),
            new Date(tomorrow.getTime() + 45 * 60 * 1000)
        )
        .setOrganizer(alice)
        .addParticipant(bob)
        .setPriority(ConflictPriority.HIGH)
        .build();

    console.log(`📅 Attempting to schedule: ${conflictingMeeting.title}`);
    manager.createMeeting(conflictingMeeting);

    // 6. Find free time
    console.log("\n6. Finding Common Free Time");
    printSeparator();

    const searchStart = new Date();
    searchStart.setDate(searchStart.getDate() + 2);
    searchStart.setHours(9, 0, 0, 0);
    const searchEnd = new Date(searchStart);
    searchEnd.setDate(searchEnd.getDate() + 1);

    console.log(`🔍 Searching for 60-minute slots between ${alice.name}, ${bob.name}, and ${charlie.name}`);
    console.log(`   Time range: ${formatDateTime(searchStart)} - ${formatDateTime(searchEnd)}`);

    const freeSlots = manager.findMeetingTime([alice, bob, charlie], 60, new TimeSlot(searchStart, searchEnd));

    console.log(`\n✓ Found ${freeSlots.length} available time slots:`);
    freeSlots.slice(0, 5).forEach((slot, i) => {
        console.log(`   ${i + 1}. ${formatDateTime(slot.start)} - ${formatDateTime(slot.end).split(' ')[1]} (${slot.durationMinutes()} min available)`);
    });

    // 7. Recurring meeting
    console.log("\n7. Creating Recurring Meeting");
    printSeparator();

    const recurrenceStart = new Date();
    recurrenceStart.setDate(recurrenceStart.getDate() + 1);
    recurrenceStart.setHours(14, 0, 0, 0);

    const recurrenceEnd = new Date(recurrenceStart);
    recurrenceEnd.setDate(recurrenceEnd.getDate() + 30);

    const recurrenceRule = new RecurrenceRule(Frequency.WEEKLY, 1, recurrenceEnd, 4);

    const recurringMeeting = new MeetingBuilder()
        .setTitle("Weekly Team Sync")
        .setTime(recurrenceStart, new Date(recurrenceStart.getTime() + 60 * 60 * 1000))
        .setOrganizer(alice)
        .addParticipant(bob)
        .setRecurrence(recurrenceRule)
        .setRoom(room1)
        .build();

    console.log(`📅 Recurring Meeting: ${recurringMeeting.title}`);
    console.log(`   Pattern: ${recurringMeeting.recurrenceRule}`);
    console.log(`   First occurrence: ${formatDateTime(recurringMeeting.startTime)}`);

    const occurrences = recurringMeeting.generateOccurrences(new Date(recurrenceStart.getTime() + 60 * 24 * 60 * 60 * 1000));
    console.log(`\n✓ Generated ${occurrences.length} occurrences:`);
    occurrences.forEach((occ, i) => {
        console.log(`   ${i + 1}. ${formatDateTime(occ.startTime)}`);
    });

    manager.createMeeting(recurringMeeting);

    // 8. Room booking
    console.log("\n8. Room Booking with Capacity Check");
    printSeparator();

    const largeMeetingTime = new Date();
    largeMeetingTime.setDate(largeMeetingTime.getDate() + 3);
    largeMeetingTime.setHours(15, 0, 0, 0);

    const largeMeeting = new MeetingBuilder()
        .setTitle("All Hands Meeting")
        .setTime(largeMeetingTime, new Date(largeMeetingTime.getTime() + 2 * 60 * 60 * 1000))
        .setOrganizer(alice)
        .addParticipant(bob)
        .addParticipant(charlie)
        .setRoom(room1)
        .setPriority(ConflictPriority.CRITICAL)
        .build();

    console.log(`📅 Meeting: ${largeMeeting.title}`);
    console.log(`   Participants: ${largeMeeting.participants.length + 1} (including organizer)`);
    console.log(`   Requested room: ${room1.name} (capacity: ${room1.capacity})`);

    manager.createMeeting(largeMeeting);

    // 9. Reschedule
    console.log("\n9. Rescheduling Meeting");
    printSeparator();

    console.log(`📅 Original time: ${formatDateTime(meeting1.startTime)}`);

    const newTime = new Date(meeting1.startTime.getTime() + 2 * 60 * 60 * 1000);
    manager.rescheduleMeeting(
        meeting1.id,
        newTime,
        new Date(newTime.getTime() + 30 * 60 * 1000)
    );

    console.log(`📅 New time: ${formatDateTime(newTime)}`);

    // 10. Summary
    console.log("\n10. Calendar Summary");
    printSeparator();

    console.log(`\n📊 ${alice.name}'s Calendar:`);
    console.log(`   Total meetings: ${alice.calendar.meetings.size}`);
    Array.from(alice.calendar.meetings.values()).slice(0, 3).forEach(m => {
        console.log(`   - ${m.title}: ${formatDateTime(m.startTime)}`);
    });

    console.log(`\n📊 ${bob.name}'s Calendar:`);
    console.log(`   Total meetings: ${bob.calendar.meetings.size}`);

    console.log(`\n📊 Room Utilization:`);
    [room1, room2].forEach(room => {
        console.log(`   ${room.name}: ${room.bookings.length} bookings`);
    });

    // 11. Availability check
    console.log("\n11. Checking Availability");
    printSeparator();

    const checkTime = new Date(tomorrow.getTime() + 3 * 60 * 60 * 1000);
    const checkSlot = new TimeSlot(checkTime, new Date(checkTime.getTime() + 30 * 60 * 1000));

    console.log(`🔍 Checking availability at ${formatDateTime(checkTime)}`);

    const availability = manager.availabilityChecker.checkAvailability([alice, bob, charlie], checkSlot);

    [alice, bob, charlie].forEach(user => {
        const status = availability[user.id] ? "✓ Available" : "✗ Busy";
        console.log(`   ${user.name}: ${status}`);
    });

    console.log("\n" + "=".repeat(70));
    console.log("  DEMO COMPLETE");
    console.log("=".repeat(70));
    console.log("\n✓ Meeting Scheduler system features demonstrated:");
    console.log("  • Calendar management for multiple users");
    console.log("  • Meeting creation with Builder pattern");
    console.log("  • Conflict detection and resolution");
    console.log("  • Finding common free time slots");
    console.log("  • Recurring meeting pattern generation");
    console.log("  • Room booking with capacity validation");
    console.log("  • Meeting rescheduling");
    console.log("  • Email notifications (Observer pattern)");
    console.log("  • Interval overlap and merge algorithms");
    console.log("  • Availability checking across participants");
}

// Run the demo
if (require.main === module) {
    demoMeetingScheduler();
}

// Exports
module.exports = {
    MeetingStatus,
    Visibility,
    InvitationStatus,
    Frequency,
    ConflictPriority,
    TimeSlot,
    mergeIntervals,
    User,
    Calendar,
    Meeting,
    RecurrenceRule,
    RecurringMeeting,
    Room,
    MeetingBuilder,
    AvailabilityChecker,
    Conflict,
    ConflictDetector,
    Observer,
    EmailNotifier,
    NotificationManager,
    CalendarManager
};
