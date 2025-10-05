# Music Player System

## 🔗 Implementation Links

- **Python Implementation**: [python/music-player/main.py](python/music-player/main.py)
- **JavaScript Implementation**: [javascript/music-player/main.js](javascript/music-player/main.js)

## Problem Statement

Design a Music Player system that can:

1. **Play audio tracks** with controls (play, pause, stop, next, previous)
2. **Manage playlists** (create, update, delete, reorder)
3. **Handle playback queue** with dynamic additions
4. **Support shuffle and repeat** modes
5. **Control volume** and seek position
6. **Track playback history** and favorites
7. **Search and filter** by artist, album, genre
8. **Organize music library** efficiently

## Requirements

### Functional Requirements

- Play, pause, stop playback
- Next/previous track navigation
- Volume control (0-100)
- Seek to specific position
- Create and manage playlists
- Add/remove tracks from queue
- Shuffle and repeat modes (off, one, all)
- Search tracks by title, artist, album
- Filter by genre, year, rating
- Mark tracks as favorites
- Track playback history
- Recently played list
- Current playback state

### Non-Functional Requirements

- Fast track switching: < 100ms
- Support large libraries: 100,000+ tracks
- Efficient search: O(log n)
- Memory efficient playlist storage
- Smooth playback transitions
- Persist state across sessions
- Cross-platform compatibility

## Design Decisions

### Key Classes

1. **Music Player**
   - `MusicPlayer`: Main player controller (Singleton)
   - Manages playback state and controls

2. **Track**
   - `Track`: Individual song/audio file
   - Metadata (title, artist, album, duration, genre)

3. **Playlist**
   - `Playlist`: Collection of tracks
   - Support for reordering and filtering

4. **Queue**
   - `PlaybackQueue`: Current playback queue
   - Supports shuffle and repeat modes

5. **Player State**
   - `PlayerState`: Playing, Paused, Stopped
   - State transitions and validations

6. **Library**
   - `MusicLibrary`: Organize all tracks
   - Indexing and search capabilities

### Design Patterns Used

1. **State Pattern**: Player states (Playing, Paused, Stopped)
2. **Strategy Pattern**: Shuffle and repeat strategies
3. **Observer Pattern**: Playback event notifications
4. **Command Pattern**: Playback control commands
5. **Singleton Pattern**: Single player instance
6. **Composite Pattern**: Playlist hierarchy (albums, genres)
7. **Iterator Pattern**: Track iteration in playlist
8. **Factory Pattern**: Create different track types

### Key Features

- **State Management**: Clean state transitions
- **Queue Management**: Dynamic queue operations
- **Shuffle Algorithm**: Fisher-Yates shuffle
- **Search**: Efficient full-text search
- **Persistence**: Save/restore player state

## Class Diagram

```text
MusicPlayer (Singleton)
├── state: PlayerState
├── currentTrack: Track
├── queue: PlaybackQueue
├── library: MusicLibrary
├── volume: int (0-100)
├── position: int (seconds)
├── play()
├── pause()
├── stop()
├── next()
├── previous()
├── seek(position)
├── setVolume(volume)
└── addObserver(observer)

Track
├── id: string
├── title: string
├── artist: string
├── album: string
├── duration: int (seconds)
├── genre: string
├── year: int
├── filePath: string
├── rating: float
└── playCount: int

Playlist
├── id: string
├── name: string
├── tracks: List[Track]
├── createdAt: datetime
├── addTrack(track)
├── removeTrack(trackId)
├── moveTrack(from, to)
├── shuffle()
└── getTracks() → List[Track]

PlaybackQueue
├── tracks: List[Track]
├── currentIndex: int
├── shuffleMode: ShuffleMode
├── repeatMode: RepeatMode
├── originalOrder: List[Track]
├── enqueue(track)
├── dequeue() → Track
├── getCurrentTrack() → Track
├── getNext() → Track
├── getPrevious() → Track
├── clear()
└── shuffle()

PlayerState (Abstract)
├── play()
├── pause()
├── stop()
└── implementations:
    ├── PlayingState
    ├── PausedState
    └── StoppedState

MusicLibrary
├── tracks: Dict[id, Track]
├── playlists: Dict[id, Playlist]
├── artists: Dict[artist, List[Track]]
├── albums: Dict[album, List[Track]]
├── genres: Dict[genre, List[Track]]
├── addTrack(track)
├── removeTrack(trackId)
├── createPlaylist(name) → Playlist
├── search(query) → List[Track]
└── filter(criteria) → List[Track]

PlaybackObserver (Interface)
├── onTrackChanged(track)
├── onStateChanged(state)
├── onVolumeChanged(volume)
└── onPositionChanged(position)
```

## Usage Example

```python
# Initialize player
player = MusicPlayer.get_instance()
library = MusicLibrary()

# Add tracks to library
track1 = Track("1", "Bohemian Rhapsody", "Queen", "A Night at the Opera", 354)
track2 = Track("2", "Stairway to Heaven", "Led Zeppelin", "Led Zeppelin IV", 482)
library.add_track(track1)
library.add_track(track2)

# Create playlist
playlist = library.create_playlist("Rock Classics")
playlist.add_track(track1)
playlist.add_track(track2)

# Load playlist into queue
player.load_playlist(playlist)

# Playback controls
player.play()           # Start playing
player.set_volume(75)   # Set volume to 75%
player.seek(30)         # Seek to 30 seconds

# Navigation
player.next()           # Next track
player.previous()       # Previous track

# Shuffle and repeat
player.set_shuffle(True)
player.set_repeat(RepeatMode.ALL)

# Add observer
class UIObserver(PlaybackObserver):
    def on_track_changed(self, track):
        print(f"Now playing: {track.title} by {track.artist}")

player.add_observer(UIObserver())

# Search
results = library.search("queen")
rock_tracks = library.filter_by_genre("Rock")

# Save state
player.save_state("player_state.json")
```

## Player States

### State Transitions

```text
         play()
           ↓
       [Playing]
        ↙    ↘
   pause()  stop()
     ↓        ↓
  [Paused]  [Stopped]
     ↓        ↑
  play()  play()
     ↓        ↑
  [Playing]  ↑
      ↓      ↑
   stop() ──┘
```

### State Behaviors

```python
class PlayingState(PlayerState):
    def play(self):
        # Already playing, do nothing
        pass
    
    def pause(self):
        player.pause_playback()
        return PausedState()
    
    def stop(self):
        player.stop_playback()
        player.reset_position()
        return StoppedState()

class PausedState(PlayerState):
    def play(self):
        player.resume_playback()
        return PlayingState()
    
    def pause(self):
        # Already paused
        pass
    
    def stop(self):
        player.stop_playback()
        player.reset_position()
        return StoppedState()

class StoppedState(PlayerState):
    def play(self):
        player.start_playback()
        return PlayingState()
    
    def pause(self):
        # Cannot pause when stopped
        raise InvalidStateError()
    
    def stop(self):
        # Already stopped
        pass
```

## Playback Queue

### Queue Operations

```python
# Add to queue
queue.enqueue(track1)
queue.enqueue(track2)
queue.enqueue(track3)

# Current track
current = queue.get_current_track()  # track1

# Navigation
next_track = queue.get_next()        # track2
prev_track = queue.get_previous()    # back to track1

# Shuffle
queue.set_shuffle(True)
# Queue order: [track3, track1, track2]  (randomized)

# Repeat modes
queue.set_repeat(RepeatMode.ONE)     # Repeat current track
queue.set_repeat(RepeatMode.ALL)     # Repeat entire queue
queue.set_repeat(RepeatMode.OFF)     # No repeat
```

### Shuffle Algorithm

```python
def shuffle(self):
    """
    Fisher-Yates shuffle algorithm
    Time: O(n), Space: O(1)
    """
    # Save original order
    self.original_order = self.tracks.copy()
    
    # Shuffle
    for i in range(len(self.tracks) - 1, 0, -1):
        j = random.randint(0, i)
        self.tracks[i], self.tracks[j] = self.tracks[j], self.tracks[i]
```

### Repeat Logic

```python
def get_next_track(self):
    """Get next track based on repeat mode"""
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
        return None  # End of queue
```

## Playlist Management

### Playlist Operations

```python
# Create playlist
playlist = Playlist("My Favorites")

# Add tracks
playlist.add_track(track1)
playlist.add_track(track2)
playlist.add_track(track3)

# Reorder (move track from index 2 to index 0)
playlist.move_track(2, 0)

# Remove track
playlist.remove_track(track2.id)

# Shuffle playlist
playlist.shuffle()

# Get tracks
tracks = playlist.get_tracks()
```

### Smart Playlists

```python
# Auto-generated playlists
class SmartPlaylist(Playlist):
    def __init__(self, name, criteria):
        super().__init__(name)
        self.criteria = criteria
    
    def update(self, library):
        """Update playlist based on criteria"""
        self.tracks = library.filter(self.criteria)

# Examples
recently_played = SmartPlaylist("Recently Played", 
                               lambda t: t.last_played > datetime.now() - timedelta(days=7))

top_rated = SmartPlaylist("Top Rated",
                         lambda t: t.rating >= 4.5)

rock_80s = SmartPlaylist("80s Rock",
                        lambda t: t.genre == "Rock" and 1980 <= t.year < 1990)
```

## Search and Filter

### Search Implementation

```python
class MusicLibrary:
    def search(self, query):
        """
        Full-text search across title, artist, album
        """
        query = query.lower()
        results = []
        
        for track in self.tracks.values():
            # Search in title, artist, album
            if (query in track.title.lower() or
                query in track.artist.lower() or
                query in track.album.lower()):
                results.append(track)
        
        return results
    
    def filter_by_genre(self, genre):
        """Get tracks by genre"""
        return self.genres.get(genre, [])
    
    def filter_by_artist(self, artist):
        """Get tracks by artist"""
        return self.artists.get(artist, [])
    
    def filter_by_album(self, album):
        """Get tracks by album"""
        return self.albums.get(album, [])
    
    def filter_by_year(self, start_year, end_year):
        """Get tracks by year range"""
        return [t for t in self.tracks.values()
                if start_year <= t.year <= end_year]
```

### Indexing

```python
class MusicLibrary:
    def add_track(self, track):
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
```

## Advanced Features

### 1. Playback History

```python
class PlaybackHistory:
    def __init__(self, max_size=100):
        self.history = []
        self.max_size = max_size
    
    def add(self, track, timestamp):
        """Add track to history"""
        self.history.append((track, timestamp))
        
        # Limit size
        if len(self.history) > self.max_size:
            self.history.pop(0)
    
    def get_recent(self, count=20):
        """Get recently played tracks"""
        return self.history[-count:]
    
    def get_most_played(self, count=10):
        """Get most played tracks"""
        track_counts = {}
        for track, _ in self.history:
            track_counts[track.id] = track_counts.get(track.id, 0) + 1
        
        sorted_tracks = sorted(track_counts.items(), 
                              key=lambda x: x[1], 
                              reverse=True)
        return sorted_tracks[:count]
```

### 2. Equalizer

```python
class Equalizer:
    def __init__(self):
        self.bands = {
            '60Hz': 0,
            '170Hz': 0,
            '310Hz': 0,
            '600Hz': 0,
            '1kHz': 0,
            '3kHz': 0,
            '6kHz': 0,
            '12kHz': 0,
            '14kHz': 0,
            '16kHz': 0
        }
        self.presets = {
            'Flat': {band: 0 for band in self.bands},
            'Bass Boost': {'60Hz': 6, '170Hz': 4, '310Hz': 2},
            'Treble Boost': {'6kHz': 4, '12kHz': 5, '14kHz': 6},
            'Rock': {'60Hz': 5, '170Hz': 3, '600Hz': -2, '3kHz': 2, '6kHz': 4},
            'Pop': {'170Hz': 2, '600Hz': 3, '1kHz': 2, '3kHz': -1}
        }
    
    def set_band(self, band, gain):
        """Set gain for frequency band (-12 to +12 dB)"""
        if -12 <= gain <= 12:
            self.bands[band] = gain
    
    def load_preset(self, preset_name):
        """Load equalizer preset"""
        if preset_name in self.presets:
            preset = self.presets[preset_name]
            for band in self.bands:
                self.bands[band] = preset.get(band, 0)
```

### 3. Crossfade

```python
class Crossfade:
    def __init__(self, duration=3):
        self.duration = duration  # seconds
        self.enabled = False
    
    def apply(self, current_track, next_track):
        """
        Apply crossfade between tracks
        
        Fade out current track in last 'duration' seconds
        Fade in next track in first 'duration' seconds
        """
        if not self.enabled:
            return
        
        # Start fading out current track
        fade_out_start = current_track.duration - self.duration
        
        # Schedule fade in for next track
        # This would be handled by audio engine
        pass
```

### 4. Gapless Playback

```python
class GaplessPlayback:
    def __init__(self):
        self.enabled = True
        self.buffer_next_track = True
    
    def prepare_next(self, next_track):
        """
        Pre-buffer next track for gapless transition
        """
        if self.enabled and self.buffer_next_track:
            # Load next track into buffer
            # Start buffering when current track is 80% complete
            pass
```

## Real-World Use Cases

### 1. Spotify-like Player

```python
# Streaming player
player = MusicPlayer.get_instance()
player.enable_streaming()
player.set_buffer_size(5)  # Buffer 5 tracks ahead

# Recommendations
recommended = library.get_recommended(current_track)
for track in recommended:
    queue.enqueue(track)
```

### 2. DJ Mixing Console

```python
# Dual deck system
deck_a = MusicPlayer("Deck A")
deck_b = MusicPlayer("Deck B")

# Load tracks
deck_a.load_track(track1)
deck_b.load_track(track2)

# Crossfade between decks
crossfader = Crossfader()
crossfader.set_position(50)  # Center position

# BPM sync
bpm_sync = BPMSync()
bpm_sync.sync(deck_a, deck_b)
```

### 3. Car Audio System

```python
# Car player with limited UI
car_player = MusicPlayer.get_instance()
car_player.enable_voice_control()

# Quick playlists
car_player.create_quick_playlist("Road Trip")
car_player.create_quick_playlist("Commute")

# Steering wheel controls
controls = SteeringWheelControls()
controls.map_button("Next", player.next)
controls.map_button("Previous", player.previous)
controls.map_button("PlayPause", player.toggle_play_pause)
```

## Time Complexity

| Operation | Complexity | Notes |
|-----------|------------|-------|
| Play/Pause/Stop | O(1) | State change |
| Next/Previous | O(1) | Queue navigation |
| Add to queue | O(1) | Append operation |
| Remove from queue | O(n) | Linear search |
| Shuffle | O(n) | Fisher-Yates |
| Search | O(n) | Linear scan |
| Filter by genre | O(1) | Indexed lookup |
| Create playlist | O(1) | Object creation |
| Add to playlist | O(1) | Append operation |

## Space Complexity

| Component | Space |
|-----------|-------|
| Library | O(n) |
| Queue | O(m) |
| Playlists | O(p × k) |
| History | O(h) |
| Indices | O(n) |

**Note:** n = total tracks, m = queue size, p = playlists, k = avg tracks per playlist, h = history size

## Interview Discussion Points

1. **How to handle large music libraries efficiently?**
   - Indexing by artist, album, genre
   - Pagination for UI
   - Lazy loading
   - Database backend

2. **How to implement smooth transitions between tracks?**
   - Pre-buffering next track
   - Crossfade support
   - Gapless playback
   - Audio engine integration

3. **How to manage memory with large queues?**
   - Limit queue size
   - Virtual queue with lazy loading
   - Track metadata only, load audio on demand
   - LRU cache for recent tracks

4. **How to synchronize across multiple devices?**
   - Cloud state sync
   - Event-driven updates
   - Conflict resolution (last-write-wins)
   - WebSocket for real-time sync

5. **How to implement smart shuffle?**
   - Avoid recently played tracks
   - Genre distribution
   - Artist variety
   - Temporal diversity

## Best Practices

1. **Use State Pattern** for player states
2. **Index library** for fast lookups
3. **Pre-buffer tracks** for smooth playback
4. **Persist state** across sessions
5. **Handle errors gracefully** (missing files, corrupted tracks)
6. **Implement observers** for UI updates
7. **Cache metadata** for performance
8. **Support keyboard shortcuts**

## Summary

Music Player System demonstrates:

- **State Management**: Clean state transitions
- **Queue Management**: Dynamic queue with shuffle/repeat
- **Library Organization**: Efficient indexing and search
- **Playback Control**: Complete playback functionality
- **Extensible**: Plugin architecture for features
- **Observable**: Event-driven updates

Perfect for:

- Streaming music services
- Desktop music players
- Mobile music apps
- Car audio systems
- DJ software
- Web-based players
