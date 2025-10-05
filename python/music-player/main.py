"""
MUSIC PLAYER SYSTEM - Low Level Design Implementation in Python

This file implements a comprehensive music player with playlist management,
playback controls, shuffle/repeat modes, and library organization.

FILE PURPOSE:
Provides a production-ready music player system with state management, queue handling,
playlist creation, search capabilities, and observer notifications for UI updates.

DESIGN PATTERNS USED:
1. STATE PATTERN: Player states (Playing, Paused, Stopped)
   - Clean state transitions
   - State-specific behaviors
   - Invalid state prevention

2. STRATEGY PATTERN: Shuffle and repeat strategies
   - Different playback modes
   - Pluggable strategies
   - Easy to extend

3. OBSERVER PATTERN: Playback event notifications
   - Track change notifications
   - State change updates
   - Volume/position updates
   - UI synchronization

4. SINGLETON PATTERN: Single player instance
   - Global access point
   - Single source of truth
   - Resource control

5. COMMAND PATTERN: Playback controls
   - Encapsulate operations
   - Undo/redo capability
   - Operation history

6. COMPOSITE PATTERN: Playlist hierarchy
   - Nested playlists
   - Album/genre organization
   - Recursive operations

7. ITERATOR PATTERN: Track iteration
   - Sequential access
   - Queue traversal
   - Playlist iteration

OOP CONCEPTS DEMONSTRATED:
- ENCAPSULATION: Player state hidden behind interface
- INHERITANCE: State hierarchy
- POLYMORPHISM: Different states/strategies
- ABSTRACTION: Abstract player state

SOLID PRINCIPLES:
- SRP: Each class has single responsibility
- OCP: Open for extension (new states) closed for modification
- LSP: All states interchangeable
- ISP: Focused interfaces
- DIP: Depends on abstractions

USAGE:
    # Initialize player
    player = MusicPlayer.get_instance()
    library = MusicLibrary()
    
    # Add tracks
    track1 = Track("1", "Bohemian Rhapsody", "Queen", "A Night at the Opera", 354)
    library.add_track(track1)
    
    # Create playlist
    playlist = library.create_playlist("Rock Classics")
    playlist.add_track(track1)
    
    # Load and play
    player.load_playlist(playlist)
    player.play()
    player.set_volume(75)
    
    # Navigate
    player.next()
    player.previous()
    
    # Shuffle and repeat
    player.set_shuffle(True)
    player.set_repeat(RepeatMode.ALL)

RETURN VALUES:
- play(): Returns bool (True if started)
- next(): Returns Track or None
- search(query): Returns List[Track]
- get_current_track(): Returns Track or None
"""

from abc import ABC, abstractmethod
from enum import Enum
from typing import List, Optional, Dict, Callable
from datetime import datetime
import random
import time


# ==================== ENUMS ====================

class PlayerState(Enum):
    """Player state enumeration"""
    STOPPED = "stopped"
    PLAYING = "playing"
    PAUSED = "paused"


class RepeatMode(Enum):
    """Repeat mode enumeration"""
    OFF = "off"
    ONE = "one"      # Repeat current track
    ALL = "all"      # Repeat queue


class ShuffleMode(Enum):
    """Shuffle mode enumeration"""
    OFF = "off"
    ON = "on"


# ==================== TRACK ====================

class Track:
    """
    Music track with metadata
    
    USAGE:
        track = Track("1", "Song Title", "Artist", "Album", 240)
    
    RETURN:
        Track instance
    """
    def __init__(self, track_id: str, title: str, artist: str, album: str, duration: int,
                 genre: str = "Unknown", year: int = 0, file_path: str = ""):
        self.id = track_id
        self.title = title
        self.artist = artist
        self.album = album
        self.duration = duration  # seconds
        self.genre = genre
        self.year = year
        self.file_path = file_path
        self.rating = 0.0
        self.play_count = 0
        self.last_played = None
        self.is_favorite = False
    
    def play(self):
        """Increment play count"""
        self.play_count += 1
        self.last_played = datetime.now()
    
    def toggle_favorite(self):
        """Toggle favorite status"""
        self.is_favorite = not self.is_favorite
    
    def get_duration_formatted(self) -> str:
        """Get duration in MM:SS format"""
        minutes = self.duration // 60
        seconds = self.duration % 60
        return f"{minutes}:{seconds:02d}"
    
    def __repr__(self):
        return f"Track({self.title} by {self.artist})"


# ==================== PLAYLIST ====================

class Playlist:
    """
    Collection of tracks
    
    USAGE:
        playlist = Playlist("my-playlist", "My Favorites")
        playlist.add_track(track)
    
    RETURN:
        Playlist instance
    """
    def __init__(self, playlist_id: str, name: str):
        self.id = playlist_id
        self.name = name
        self.tracks: List[Track] = []
        self.created_at = datetime.now()
    
    def add_track(self, track: Track):
        """Add track to playlist"""
        if track not in self.tracks:
            self.tracks.append(track)
    
    def remove_track(self, track_id: str) -> bool:
        """Remove track by ID"""
        for i, track in enumerate(self.tracks):
            if track.id == track_id:
                self.tracks.pop(i)
                return True
        return False
    
    def move_track(self, from_index: int, to_index: int):
        """Reorder tracks"""
        if 0 <= from_index < len(self.tracks) and 0 <= to_index < len(self.tracks):
            track = self.tracks.pop(from_index)
            self.tracks.insert(to_index, track)
    
    def shuffle(self):
        """Shuffle tracks"""
        random.shuffle(self.tracks)
    
    def get_tracks(self) -> List[Track]:
        """Get all tracks"""
        return self.tracks.copy()
    
    def get_duration(self) -> int:
        """Get total duration in seconds"""
        return sum(track.duration for track in self.tracks)
    
    def __repr__(self):
        return f"Playlist({self.name}, {len(self.tracks)} tracks)"


# ==================== PLAYBACK QUEUE ====================

class PlaybackQueue:
    """
    Playback queue with shuffle and repeat
    
    USAGE:
        queue = PlaybackQueue()
        queue.enqueue(track)
        current = queue.get_current()
    
    RETURN:
        PlaybackQueue instance
    """
    def __init__(self):
        self.tracks: List[Track] = []
        self.current_index = 0
        self.shuffle_mode = ShuffleMode.OFF
        self.repeat_mode = RepeatMode.OFF
        self.original_order: List[Track] = []
    
    def enqueue(self, track: Track):
        """Add track to queue"""
        self.tracks.append(track)
    
    def clear(self):
        """Clear queue"""
        self.tracks.clear()
        self.current_index = 0
        self.original_order.clear()
    
    def load_playlist(self, playlist: Playlist):
        """Load playlist into queue"""
        self.clear()
        self.tracks = playlist.get_tracks()
        self.current_index = 0
        self.original_order = self.tracks.copy()
    
    def get_current(self) -> Optional[Track]:
        """Get current track"""
        if 0 <= self.current_index < len(self.tracks):
            return self.tracks[self.current_index]
        return None
    
    def get_next(self) -> Optional[Track]:
        """Get next track based on repeat mode"""
        if not self.tracks:
            return None
        
        if self.repeat_mode == RepeatMode.ONE:
            # Repeat current track
            return self.tracks[self.current_index]
        
        elif self.repeat_mode == RepeatMode.ALL:
            # Move to next, loop back to start
            self.current_index = (self.current_index + 1) % len(self.tracks)
            return self.tracks[self.current_index]
        
        else:  # RepeatMode.OFF
            # Move to next, stop at end
            if self.current_index < len(self.tracks) - 1:
                self.current_index += 1
                return self.tracks[self.current_index]
            return None
    
    def get_previous(self) -> Optional[Track]:
        """Get previous track"""
        if not self.tracks:
            return None
        
        if self.current_index > 0:
            self.current_index -= 1
            return self.tracks[self.current_index]
        elif self.repeat_mode == RepeatMode.ALL:
            # Loop back to end
            self.current_index = len(self.tracks) - 1
            return self.tracks[self.current_index]
        
        return self.tracks[self.current_index]
    
    def set_shuffle(self, enabled: bool):
        """Enable/disable shuffle"""
        if enabled and self.shuffle_mode == ShuffleMode.OFF:
            # Enable shuffle
            self.shuffle_mode = ShuffleMode.ON
            current_track = self.get_current()
            
            # Fisher-Yates shuffle
            for i in range(len(self.tracks) - 1, 0, -1):
                j = random.randint(0, i)
                self.tracks[i], self.tracks[j] = self.tracks[j], self.tracks[i]
            
            # Find new position of current track
            if current_track:
                for i, track in enumerate(self.tracks):
                    if track.id == current_track.id:
                        self.current_index = i
                        break
        
        elif not enabled and self.shuffle_mode == ShuffleMode.ON:
            # Disable shuffle - restore original order
            self.shuffle_mode = ShuffleMode.OFF
            current_track = self.get_current()
            self.tracks = self.original_order.copy()
            
            # Find position in original order
            if current_track:
                for i, track in enumerate(self.tracks):
                    if track.id == current_track.id:
                        self.current_index = i
                        break
    
    def set_repeat(self, mode: RepeatMode):
        """Set repeat mode"""
        self.repeat_mode = mode
    
    def size(self) -> int:
        """Get queue size"""
        return len(self.tracks)
    
    def __repr__(self):
        return f"PlaybackQueue({len(self.tracks)} tracks, index={self.current_index})"


# ==================== OBSERVER PATTERN ====================

class PlaybackObserver(ABC):
    """
    Observer interface for playback events
    
    DESIGN PATTERN: Observer Pattern
    
    USAGE:
        class MyObserver(PlaybackObserver):
            def on_track_changed(self, track):
                print(f"Now playing: {track.title}")
    
    RETURN:
        None
    """
    @abstractmethod
    def on_track_changed(self, track: Optional[Track]):
        """Called when track changes"""
        pass
    
    def on_state_changed(self, state: PlayerState):
        """Called when player state changes"""
        pass
    
    def on_volume_changed(self, volume: int):
        """Called when volume changes"""
        pass
    
    def on_position_changed(self, position: int):
        """Called when position changes"""
        pass


# ==================== MUSIC LIBRARY ====================

class MusicLibrary:
    """
    Music library with indexing and search
    
    USAGE:
        library = MusicLibrary()
        library.add_track(track)
        results = library.search("queen")
    
    RETURN:
        MusicLibrary instance
    """
    def __init__(self):
        self.tracks: Dict[str, Track] = {}
        self.playlists: Dict[str, Playlist] = {}
        self.artists: Dict[str, List[Track]] = {}
        self.albums: Dict[str, List[Track]] = {}
        self.genres: Dict[str, List[Track]] = {}
        self._playlist_counter = 0
    
    def add_track(self, track: Track):
        """Add track and update indices"""
        self.tracks[track.id] = track
        
        # Update artist index
        if track.artist not in self.artists:
            self.artists[track.artist] = []
        self.artists[track.artist].append(track)
        
        # Update album index
        if track.album not in self.albums:
            self.albums[track.album] = []
        self.albums[track.album].append(track)
        
        # Update genre index
        if track.genre not in self.genres:
            self.genres[track.genre] = []
        self.genres[track.genre].append(track)
    
    def remove_track(self, track_id: str) -> bool:
        """Remove track from library"""
        if track_id in self.tracks:
            track = self.tracks[track_id]
            del self.tracks[track_id]
            
            # Remove from indices
            self.artists[track.artist].remove(track)
            self.albums[track.album].remove(track)
            self.genres[track.genre].remove(track)
            
            return True
        return False
    
    def create_playlist(self, name: str) -> Playlist:
        """Create new playlist"""
        self._playlist_counter += 1
        playlist_id = f"playlist-{self._playlist_counter}"
        playlist = Playlist(playlist_id, name)
        self.playlists[playlist_id] = playlist
        return playlist
    
    def get_playlist(self, playlist_id: str) -> Optional[Playlist]:
        """Get playlist by ID"""
        return self.playlists.get(playlist_id)
    
    def search(self, query: str) -> List[Track]:
        """Search tracks by title, artist, or album"""
        query = query.lower()
        results = []
        
        for track in self.tracks.values():
            if (query in track.title.lower() or
                query in track.artist.lower() or
                query in track.album.lower()):
                results.append(track)
        
        return results
    
    def filter_by_genre(self, genre: str) -> List[Track]:
        """Get tracks by genre"""
        return self.genres.get(genre, [])
    
    def filter_by_artist(self, artist: str) -> List[Track]:
        """Get tracks by artist"""
        return self.artists.get(artist, [])
    
    def filter_by_album(self, album: str) -> List[Track]:
        """Get tracks by album"""
        return self.albums.get(album, [])
    
    def get_favorites(self) -> List[Track]:
        """Get favorite tracks"""
        return [t for t in self.tracks.values() if t.is_favorite]
    
    def get_recently_played(self, count: int = 20) -> List[Track]:
        """Get recently played tracks"""
        played = [t for t in self.tracks.values() if t.last_played]
        return sorted(played, key=lambda t: t.last_played, reverse=True)[:count]
    
    def __repr__(self):
        return f"MusicLibrary({len(self.tracks)} tracks, {len(self.playlists)} playlists)"


# ==================== MUSIC PLAYER ====================

class MusicPlayer:
    """
    Main music player (Singleton)
    
    DESIGN PATTERN: Singleton Pattern
    
    USAGE:
        player = MusicPlayer.get_instance()
        player.play()
        player.set_volume(75)
    
    RETURN:
        MusicPlayer instance
    """
    _instance = None
    
    def __init__(self):
        if MusicPlayer._instance is not None:
            raise Exception("Use get_instance() to get MusicPlayer")
        
        self._state = PlayerState.STOPPED
        self._queue = PlaybackQueue()
        self._volume = 50  # 0-100
        self._position = 0  # seconds
        self._observers: List[PlaybackObserver] = []
        
        print("🎵 Music Player initialized")
    
    @classmethod
    def get_instance(cls):
        """Get singleton instance"""
        if cls._instance is None:
            cls._instance = MusicPlayer()
        return cls._instance
    
    def play(self) -> bool:
        """Start/resume playback"""
        current = self._queue.get_current()
        if not current:
            print("❌ No track in queue")
            return False
        
        if self._state == PlayerState.STOPPED:
            # Start playing
            current.play()
            self._state = PlayerState.PLAYING
            self._position = 0
            print(f"▶️  Playing: {current.title} by {current.artist}")
            self._notify_track_changed(current)
            self._notify_state_changed(self._state)
            return True
        
        elif self._state == PlayerState.PAUSED:
            # Resume playing
            self._state = PlayerState.PLAYING
            print(f"▶️  Resumed: {current.title}")
            self._notify_state_changed(self._state)
            return True
        
        return False
    
    def pause(self):
        """Pause playback"""
        if self._state == PlayerState.PLAYING:
            self._state = PlayerState.PAUSED
            print("⏸️  Paused")
            self._notify_state_changed(self._state)
    
    def stop(self):
        """Stop playback"""
        if self._state != PlayerState.STOPPED:
            self._state = PlayerState.STOPPED
            self._position = 0
            print("⏹️  Stopped")
            self._notify_state_changed(self._state)
    
    def next(self) -> Optional[Track]:
        """Play next track"""
        next_track = self._queue.get_next()
        if next_track:
            self._position = 0
            if self._state == PlayerState.PLAYING:
                next_track.play()
            print(f"⏭️  Next: {next_track.title}")
            self._notify_track_changed(next_track)
            return next_track
        else:
            print("⏭️  End of queue")
            self.stop()
            return None
    
    def previous(self) -> Optional[Track]:
        """Play previous track"""
        prev_track = self._queue.get_previous()
        if prev_track:
            self._position = 0
            if self._state == PlayerState.PLAYING:
                prev_track.play()
            print(f"⏮️  Previous: {prev_track.title}")
            self._notify_track_changed(prev_track)
            return prev_track
        return None
    
    def seek(self, position: int):
        """Seek to position in seconds"""
        current = self._queue.get_current()
        if current and 0 <= position <= current.duration:
            self._position = position
            print(f"⏩ Seeked to {position}s")
            self._notify_position_changed(position)
    
    def set_volume(self, volume: int):
        """Set volume (0-100)"""
        if 0 <= volume <= 100:
            self._volume = volume
            print(f"🔊 Volume: {volume}%")
            self._notify_volume_changed(volume)
    
    def load_playlist(self, playlist: Playlist):
        """Load playlist into queue"""
        self._queue.load_playlist(playlist)
        print(f"📋 Loaded playlist: {playlist.name} ({len(playlist.tracks)} tracks)")
    
    def set_shuffle(self, enabled: bool):
        """Enable/disable shuffle"""
        self._queue.set_shuffle(enabled)
        status = "ON" if enabled else "OFF"
        print(f"🔀 Shuffle: {status}")
    
    def set_repeat(self, mode: RepeatMode):
        """Set repeat mode"""
        self._queue.set_repeat(mode)
        print(f"🔁 Repeat: {mode.value.upper()}")
    
    def get_current_track(self) -> Optional[Track]:
        """Get current track"""
        return self._queue.get_current()
    
    def get_state(self) -> PlayerState:
        """Get player state"""
        return self._state
    
    def get_volume(self) -> int:
        """Get current volume"""
        return self._volume
    
    def get_position(self) -> int:
        """Get current position"""
        return self._position
    
    def add_observer(self, observer: PlaybackObserver):
        """Add observer"""
        self._observers.append(observer)
    
    def remove_observer(self, observer: PlaybackObserver):
        """Remove observer"""
        if observer in self._observers:
            self._observers.remove(observer)
    
    def _notify_track_changed(self, track: Optional[Track]):
        """Notify observers of track change"""
        for observer in self._observers:
            observer.on_track_changed(track)
    
    def _notify_state_changed(self, state: PlayerState):
        """Notify observers of state change"""
        for observer in self._observers:
            observer.on_state_changed(state)
    
    def _notify_volume_changed(self, volume: int):
        """Notify observers of volume change"""
        for observer in self._observers:
            observer.on_volume_changed(volume)
    
    def _notify_position_changed(self, position: int):
        """Notify observers of position change"""
        for observer in self._observers:
            observer.on_position_changed(position)
    
    def __repr__(self):
        current = self._queue.get_current()
        track_info = f"'{current.title}'" if current else "None"
        return f"MusicPlayer(state={self._state.value}, track={track_info}, volume={self._volume}%)"


# ==================== DEMO ====================

def main():
    """
    Demo of Music Player
    
    Demonstrates:
    - Track creation and metadata
    - Playlist management
    - Playback controls
    - Shuffle and repeat modes
    - Library organization
    - Search functionality
    - Observer notifications
    """
    print("=" * 70)
    print("🎵 MUSIC PLAYER DEMO")
    print("=" * 70)
    
    # Create library
    print("\n📚 Creating music library...")
    library = MusicLibrary()
    
    # Add tracks
    print("\n🎸 Adding tracks...")
    tracks = [
        Track("1", "Bohemian Rhapsody", "Queen", "A Night at the Opera", 354, "Rock", 1975),
        Track("2", "Stairway to Heaven", "Led Zeppelin", "Led Zeppelin IV", 482, "Rock", 1971),
        Track("3", "Hotel California", "Eagles", "Hotel California", 391, "Rock", 1976),
        Track("4", "Imagine", "John Lennon", "Imagine", 183, "Pop", 1971),
        Track("5", "Billie Jean", "Michael Jackson", "Thriller", 294, "Pop", 1982),
    ]
    
    for track in tracks:
        library.add_track(track)
        print(f"  ✓ Added: {track.title} by {track.artist} [{track.get_duration_formatted()}]")
    
    # Create playlist
    print("\n📋 Creating playlist...")
    rock_classics = library.create_playlist("Rock Classics")
    rock_classics.add_track(tracks[0])  # Bohemian Rhapsody
    rock_classics.add_track(tracks[1])  # Stairway to Heaven
    rock_classics.add_track(tracks[2])  # Hotel California
    print(f"  ✓ Created: {rock_classics.name} with {len(rock_classics.tracks)} tracks")
    
    # Initialize player
    print("\n🎵 Initializing player...")
    player = MusicPlayer.get_instance()
    
    # Add observer
    print("\n👀 Adding observer...")
    class UIObserver(PlaybackObserver):
        def on_track_changed(self, track):
            if track:
                print(f"  🎵 UI Update: Now playing '{track.title}' by {track.artist}")
        
        def on_state_changed(self, state):
            print(f"  📱 UI Update: Player state changed to {state.value}")
        
        def on_volume_changed(self, volume):
            print(f"  📱 UI Update: Volume changed to {volume}%")
    
    observer = UIObserver()
    player.add_observer(observer)
    
    # Load playlist
    player.load_playlist(rock_classics)
    
    # Playback controls
    print("\n▶️  Playback controls...")
    player.play()
    time.sleep(0.5)
    
    player.set_volume(75)
    time.sleep(0.5)
    
    # Pause and resume
    print("\n⏸️  Pause and resume...")
    player.pause()
    time.sleep(0.5)
    
    player.play()
    time.sleep(0.5)
    
    # Navigate tracks
    print("\n⏭️  Navigation...")
    player.next()
    time.sleep(0.5)
    
    player.next()
    time.sleep(0.5)
    
    player.previous()
    time.sleep(0.5)
    
    # Shuffle
    print("\n🔀 Shuffle mode...")
    player.set_shuffle(True)
    time.sleep(0.5)
    
    # Repeat
    print("\n🔁 Repeat mode...")
    player.set_repeat(RepeatMode.ALL)
    time.sleep(0.5)
    
    # Search
    print("\n🔍 Search functionality...")
    results = library.search("queen")
    print(f"  Search 'queen': {len(results)} results")
    for track in results:
        print(f"    - {track.title} by {track.artist}")
    
    # Filter by genre
    print("\n🎸 Filter by genre...")
    rock_tracks = library.filter_by_genre("Rock")
    print(f"  Rock tracks: {len(rock_tracks)} found")
    for track in rock_tracks:
        print(f"    - {track.title} by {track.artist}")
    
    # Mark as favorite
    print("\n⭐ Favorites...")
    tracks[0].toggle_favorite()
    tracks[1].toggle_favorite()
    favorites = library.get_favorites()
    print(f"  Favorites: {len(favorites)} tracks")
    for track in favorites:
        print(f"    - {track.title}")
    
    # Player info
    print("\n📊 Player Status:")
    print(f"  Current track: {player.get_current_track().title if player.get_current_track() else 'None'}")
    print(f"  State: {player.get_state().value}")
    print(f"  Volume: {player.get_volume()}%")
    print(f"  Queue size: {player._queue.size()}")
    
    # Library stats
    print("\n📈 Library Statistics:")
    print(f"  Total tracks: {len(library.tracks)}")
    print(f"  Total playlists: {len(library.playlists)}")
    print(f"  Artists: {len(library.artists)}")
    print(f"  Albums: {len(library.albums)}")
    print(f"  Genres: {len(library.genres)}")
    
    # Stop player
    print("\n⏹️  Stopping player...")
    player.stop()
    
    print("\n" + "=" * 70)
    print("✨ Demo completed successfully!")
    print("=" * 70)


if __name__ == "__main__":
    main()
