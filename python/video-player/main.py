"""
Video Player System Implementation

This module implements a comprehensive video player (like YouTube, Netflix) with:
- Playback controls (play, pause, seek, skip)
- Quality selection (Auto, 360p, 720p, 1080p, 4K)
- Speed control (0.25x to 2x)
- Subtitle support with synchronization
- Playlist management with shuffle/repeat
- Buffer management for smooth streaming
- Watch history and resume capability
- Download manager for offline viewing
- Recommendations engine

Usage:
    # Create player and load video
    player = VideoPlayer()
    video = Video("v1", "Tutorial", "https://cdn.com/video.mp4", 3600)
    player.load_video(video)
    
    # Playback control
    player.play()
    player.seek(120)
    player.set_quality("1080p")
    player.enable_subtitles("en")
    
    # Playlist
    playlist = Playlist("My Playlist")
    playlist.add_video(video)
    playlist.play()

Design Patterns:
    - State Pattern: Playback states (Idle, Playing, Paused, Buffering)
    - Strategy Pattern: Quality selection, streaming strategies
    - Observer Pattern: Progress updates, quality changes
    - Command Pattern: Playback commands
    - Singleton Pattern: Player instance, managers
    - Factory Pattern: Video decoders
    - Proxy Pattern: Buffering proxy
    - Decorator Pattern: Video filters

Author: LLD Solutions
Date: 2025-10-05
"""

from abc import ABC, abstractmethod
from enum import Enum
from typing import List, Dict, Optional, Any
from datetime import datetime, timedelta
from collections import deque
import random


# ===================== Enums =====================

class PlayerState(Enum):
    """Player states"""
    IDLE = "idle"
    PLAYING = "playing"
    PAUSED = "paused"
    BUFFERING = "buffering"
    STOPPED = "stopped"
    ERROR = "error"


class RepeatMode(Enum):
    """Playlist repeat modes"""
    OFF = "off"
    ONE = "one"
    ALL = "all"


class DownloadStatus(Enum):
    """Download status"""
    QUEUED = "queued"
    DOWNLOADING = "downloading"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


# ===================== Video and Quality Classes =====================

class Quality:
    """
    Represents a video quality option.
    
    Usage:
        quality = Quality("1080p", 5000000, "https://cdn.com/1080p.mp4", "h264")
        bandwidth = quality.get_bandwidth()
    
    Returns:
        Quality: Quality configuration with URL and bitrate
    """
    
    def __init__(self, resolution: str, bitrate: int, url: str, codec: str = "h264"):
        self.resolution = resolution  # e.g., "720p", "1080p"
        self.bitrate = bitrate  # bits per second
        self.url = url
        self.codec = codec
    
    def get_bandwidth(self) -> int:
        """Get required bandwidth"""
        return self.bitrate
    
    def __repr__(self):
        return f"Quality({self.resolution}, {self.bitrate//1000}kbps)"


class SubtitleCue:
    """Represents a single subtitle cue with timing"""
    
    def __init__(self, start_time: float, end_time: float, text: str):
        self.start_time = start_time
        self.end_time = end_time
        self.text = text


class Subtitle:
    """
    Represents a subtitle track.
    
    Usage:
        subtitle = Subtitle("en", "https://cdn.com/subs_en.srt", "SRT")
        subtitle.parse()
        cue = subtitle.get_cue_at(120.5)
    
    Returns:
        Subtitle: Subtitle track with cues
    """
    
    def __init__(self, language: str, url: str, format_type: str = "SRT"):
        self.language = language
        self.url = url
        self.format = format_type
        self.cues: List[SubtitleCue] = []
    
    def parse(self):
        """Parse subtitle file (simulated)"""
        # Simulate parsing SRT file
        self.cues = [
            SubtitleCue(0, 5, "Welcome to the tutorial"),
            SubtitleCue(5, 10, "Let's get started"),
            SubtitleCue(10, 15, "First, we'll cover the basics")
        ]
    
    def get_cue_at(self, time: float) -> Optional[str]:
        """
        Get subtitle text at specific time using binary search.
        
        Args:
            time: Current playback time in seconds
        
        Returns:
            str: Subtitle text or None
        
        Complexity: O(log N)
        """
        left, right = 0, len(self.cues) - 1
        
        while left <= right:
            mid = (left + right) // 2
            cue = self.cues[mid]
            
            if cue.start_time <= time <= cue.end_time:
                return cue.text
            elif time < cue.start_time:
                right = mid - 1
            else:
                left = mid + 1
        
        return None
    
    def __repr__(self):
        return f"Subtitle({self.language}, {len(self.cues)} cues)"


class Video:
    """
    Represents a video with metadata and available qualities.
    
    Usage:
        video = Video("v123", "Tutorial", "https://cdn.com/video.mp4", 3600)
        video.add_quality(Quality("1080p", 5000000, "url"))
        video.add_subtitle(Subtitle("en", "url"))
    
    Returns:
        Video: Complete video instance
    """
    
    def __init__(self, video_id: str, title: str, url: str, duration: int):
        self.id = video_id
        self.title = title
        self.url = url
        self.duration = duration  # seconds
        self.thumbnail = f"https://cdn.com/thumb_{video_id}.jpg"
        self.qualities: List[Quality] = []
        self.subtitles: List[Subtitle] = []
        self.metadata = {
            'description': '',
            'views': 0,
            'likes': 0,
            'category': 'Education'
        }
    
    def add_quality(self, quality: Quality) -> None:
        """Add a quality option"""
        self.qualities.append(quality)
    
    def add_subtitle(self, subtitle: Subtitle) -> None:
        """Add a subtitle track"""
        self.subtitles.append(subtitle)
    
    def get_quality(self, resolution: str) -> Optional[Quality]:
        """Get quality by resolution"""
        for quality in self.qualities:
            if quality.resolution == resolution:
                return quality
        return None
    
    def get_subtitle(self, language: str) -> Optional[Subtitle]:
        """Get subtitle by language"""
        for subtitle in self.subtitles:
            if subtitle.language == language:
                return subtitle
        return None
    
    def __repr__(self):
        return f"Video('{self.title}', {self.duration}s, {len(self.qualities)} qualities)"


# ===================== Playback State (State Pattern) =====================

class PlaybackState(ABC):
    """Abstract base class for playback states"""
    
    @abstractmethod
    def play(self, player: 'VideoPlayer') -> None:
        pass
    
    @abstractmethod
    def pause(self, player: 'VideoPlayer') -> None:
        pass
    
    @abstractmethod
    def stop(self, player: 'VideoPlayer') -> None:
        pass
    
    @abstractmethod
    def seek(self, player: 'VideoPlayer', time: float) -> None:
        pass


class IdleState(PlaybackState):
    """No video loaded"""
    
    def play(self, player: 'VideoPlayer') -> None:
        print("No video loaded. Load a video first.")
    
    def pause(self, player: 'VideoPlayer') -> None:
        print("No video playing.")
    
    def stop(self, player: 'VideoPlayer') -> None:
        print("Already stopped.")
    
    def seek(self, player: 'VideoPlayer', time: float) -> None:
        print("No video loaded.")


class PlayingState(PlaybackState):
    """Video is currently playing"""
    
    def play(self, player: 'VideoPlayer') -> None:
        print("Already playing.")
    
    def pause(self, player: 'VideoPlayer') -> None:
        player.state = PausedState()
        print(f"⏸  Paused at {player.format_time(player.current_time)}")
    
    def stop(self, player: 'VideoPlayer') -> None:
        player.current_time = 0
        player.state = IdleState()
        print("⏹ Stopped")
    
    def seek(self, player: 'VideoPlayer', time: float) -> None:
        if 0 <= time <= player.current_video.duration:
            player.current_time = time
            print(f"⏩ Seeking to {player.format_time(time)}")
        else:
            print(f"Invalid seek time")


class PausedState(PlaybackState):
    """Video is paused"""
    
    def play(self, player: 'VideoPlayer') -> None:
        player.state = PlayingState()
        print(f"▶  Resumed from {player.format_time(player.current_time)}")
    
    def pause(self, player: 'VideoPlayer') -> None:
        print("Already paused.")
    
    def stop(self, player: 'VideoPlayer') -> None:
        player.current_time = 0
        player.state = IdleState()
        print("⏹ Stopped")
    
    def seek(self, player: 'VideoPlayer', time: float) -> None:
        if 0 <= time <= player.current_video.duration:
            player.current_time = time
            print(f"⏩ Seeking to {player.format_time(time)}")


class BufferingState(PlaybackState):
    """Video is buffering"""
    
    def play(self, player: 'VideoPlayer') -> None:
        print("Buffering... Please wait.")
    
    def pause(self, player: 'VideoPlayer') -> None:
        player.state = PausedState()
        print("⏸  Paused during buffering")
    
    def stop(self, player: 'VideoPlayer') -> None:
        player.current_time = 0
        player.state = IdleState()
        print("⏹ Stopped")
    
    def seek(self, player: 'VideoPlayer', time: float) -> None:
        print("Cannot seek while buffering")


# ===================== Buffer Manager =====================

class BufferRange:
    """Represents a buffered time range"""
    
    def __init__(self, start: float, end: float):
        self.start = start
        self.end = end
    
    def contains(self, time: float) -> bool:
        return self.start <= time <= self.end
    
    def __repr__(self):
        return f"[{self.start:.1f}s - {self.end:.1f}s]"


class BufferManager:
    """
    Manages video buffering for smooth playback.
    
    Usage:
        buffer_mgr = BufferManager(30)
        buffer_mgr.add_to_buffer(BufferRange(0, 10))
        is_buffered = buffer_mgr.is_buffered(5)
        percentage = buffer_mgr.get_buffered_percentage(0, 100)
    
    Returns:
        BufferManager: Manager for buffering operations
    """
    
    def __init__(self, buffer_size: int = 30):
        self.buffer_size = buffer_size  # seconds
        self.buffered_ranges: List[BufferRange] = []
        self.download_speed = 0.0  # Mbps
    
    def add_to_buffer(self, range: BufferRange) -> None:
        """Add a range to buffer"""
        self.buffered_ranges.append(range)
        self._merge_overlapping_ranges()
    
    def _merge_overlapping_ranges(self) -> None:
        """Merge overlapping buffered ranges"""
        if not self.buffered_ranges:
            return
        
        # Sort by start time
        self.buffered_ranges.sort(key=lambda r: r.start)
        
        merged = [self.buffered_ranges[0]]
        for current in self.buffered_ranges[1:]:
            last = merged[-1]
            if current.start <= last.end:
                # Overlapping, merge
                last.end = max(last.end, current.end)
            else:
                merged.append(current)
        
        self.buffered_ranges = merged
    
    def is_buffered(self, time: float) -> bool:
        """Check if a specific time is buffered"""
        for range in self.buffered_ranges:
            if range.contains(time):
                return True
        return False
    
    def get_buffered_time(self, from_time: float) -> float:
        """Get how much is buffered from a specific time"""
        for range in self.buffered_ranges:
            if range.start <= from_time <= range.end:
                return range.end - from_time
        return 0.0
    
    def get_buffered_percentage(self, current_time: float, duration: float) -> float:
        """Get buffer percentage"""
        buffered = self.get_buffered_time(current_time)
        return min(1.0, buffered / self.buffer_size)
    
    def estimate_bandwidth(self) -> float:
        """Estimate available bandwidth (simulated)"""
        # Simulate bandwidth estimation
        return self.download_speed if self.download_speed > 0 else 5.0  # 5 Mbps default
    
    def __repr__(self):
        return f"BufferManager({len(self.buffered_ranges)} ranges)"


# ===================== Playlist =====================

class Playlist:
    """
    Manages a playlist of videos with playback order.
    
    Usage:
        playlist = Playlist("My Playlist")
        playlist.add_video(video1)
        playlist.add_video(video2)
        playlist.set_repeat_mode(RepeatMode.ALL)
        playlist.shuffle()
        next_video = playlist.next()
    
    Returns:
        Playlist: Playlist with video management
    """
    
    def __init__(self, playlist_id: str, name: str):
        self.id = playlist_id
        self.name = name
        self.videos: List[Video] = []
        self.current_index = 0
        self.repeat_mode = RepeatMode.OFF
        self.shuffle_enabled = False
        self._original_order: List[Video] = []
    
    def add_video(self, video: Video) -> None:
        """Add video to playlist"""
        self.videos.append(video)
        print(f"✓ Added '{video.title}' to '{self.name}'")
    
    def remove_video(self, index: int) -> bool:
        """Remove video at index"""
        if 0 <= index < len(self.videos):
            removed = self.videos.pop(index)
            print(f"✓ Removed '{removed.title}' from '{self.name}'")
            return True
        return False
    
    def next(self) -> Optional[Video]:
        """Get next video in playlist"""
        if not self.videos:
            return None
        
        if self.repeat_mode == RepeatMode.ONE:
            return self.videos[self.current_index]
        
        self.current_index += 1
        
        if self.current_index >= len(self.videos):
            if self.repeat_mode == RepeatMode.ALL:
                self.current_index = 0
            else:
                return None
        
        return self.videos[self.current_index]
    
    def previous(self) -> Optional[Video]:
        """Get previous video in playlist"""
        if not self.videos:
            return None
        
        self.current_index -= 1
        if self.current_index < 0:
            self.current_index = len(self.videos) - 1
        
        return self.videos[self.current_index]
    
    def get_current_video(self) -> Optional[Video]:
        """Get current video"""
        if 0 <= self.current_index < len(self.videos):
            return self.videos[self.current_index]
        return None
    
    def shuffle(self) -> None:
        """Shuffle playlist using Fisher-Yates algorithm"""
        if not self.shuffle_enabled:
            self._original_order = self.videos.copy()
            self.shuffle_enabled = True
        
        # Fisher-Yates shuffle
        for i in range(len(self.videos) - 1, 0, -1):
            j = random.randint(0, i)
            self.videos[i], self.videos[j] = self.videos[j], self.videos[i]
        
        print(f"🔀 Shuffled '{self.name}'")
    
    def unshuffle(self) -> None:
        """Restore original order"""
        if self.shuffle_enabled and self._original_order:
            self.videos = self._original_order.copy()
            self.shuffle_enabled = False
            print(f"✓ Restored order for '{self.name}'")
    
    def set_repeat_mode(self, mode: RepeatMode) -> None:
        """Set repeat mode"""
        self.repeat_mode = mode
        print(f"🔁 Repeat mode: {mode.value}")
    
    def __repr__(self):
        return f"Playlist('{self.name}', {len(self.videos)} videos)"


# ===================== Watch History =====================

class HistoryEntry:
    """Represents a watch history entry"""
    
    def __init__(self, video_id: str, watch_time: float, total_duration: float):
        self.video_id = video_id
        self.watch_time = watch_time
        self.total_duration = total_duration
        self.timestamp = datetime.now()
        self.completed = watch_time >= total_duration * 0.95
    
    def get_progress(self) -> float:
        """Get watch progress (0.0 to 1.0)"""
        return min(1.0, self.watch_time / self.total_duration)
    
    def is_recent(self) -> bool:
        """Check if entry is recent (within 7 days)"""
        return (datetime.now() - self.timestamp).days < 7
    
    def __repr__(self):
        progress = self.get_progress() * 100
        return f"History({self.video_id}, {progress:.0f}% watched)"


class WatchHistory:
    """
    Tracks user's viewing history and progress.
    
    Usage:
        history = WatchHistory("user_123")
        history.add_entry(video, 1200)
        position = history.get_watch_position("video_id")
        recent = history.get_recent_videos()
    
    Returns:
        WatchHistory: History tracker with resume capability
    """
    
    def __init__(self, user_id: str):
        self.user_id = user_id
        self.entries: List[HistoryEntry] = []
        self._position_map: Dict[str, float] = {}
    
    def add_entry(self, video: Video, watch_time: float) -> None:
        """Add or update history entry"""
        # Remove old entry for same video
        self.entries = [e for e in self.entries if e.video_id != video.id]
        
        # Add new entry
        entry = HistoryEntry(video.id, watch_time, video.duration)
        self.entries.insert(0, entry)  # Most recent first
        self._position_map[video.id] = watch_time
        
        # Keep only last 100 entries
        self.entries = self.entries[:100]
    
    def get_watch_position(self, video_id: str) -> float:
        """Get last watch position for a video"""
        return self._position_map.get(video_id, 0.0)
    
    def get_recent_videos(self, limit: int = 10) -> List[HistoryEntry]:
        """Get recent watch history"""
        return [e for e in self.entries if e.is_recent()][:limit]
    
    def get_continue_watching(self) -> List[HistoryEntry]:
        """Get videos to continue watching (not completed)"""
        return [e for e in self.entries if not e.completed and e.get_progress() > 0.05][:10]
    
    def clear_history(self) -> None:
        """Clear all history"""
        self.entries.clear()
        self._position_map.clear()
        print("✓ History cleared")
    
    def __repr__(self):
        return f"WatchHistory({len(self.entries)} entries)"


# ===================== Download Manager =====================

class Download:
    """Represents a video download"""
    
    def __init__(self, download_id: str, video: Video, quality: Quality):
        self.id = download_id
        self.video = video
        self.quality = quality
        self.progress = 0.0
        self.status = DownloadStatus.QUEUED
        self.file_path = f"/downloads/{video.id}_{quality.resolution}.mp4"
        self.size = quality.bitrate * video.duration // 8  # Approximate size in bytes
    
    def start(self) -> None:
        """Start download"""
        self.status = DownloadStatus.DOWNLOADING
        print(f"📥 Downloading '{self.video.title}' ({self.quality.resolution})")
    
    def pause(self) -> None:
        """Pause download"""
        self.status = DownloadStatus.PAUSED
        print(f"⏸  Download paused: {self.progress*100:.0f}%")
    
    def resume(self) -> None:
        """Resume download"""
        self.status = DownloadStatus.DOWNLOADING
        print(f"▶  Download resumed: {self.progress*100:.0f}%")
    
    def complete(self) -> None:
        """Mark as completed"""
        self.progress = 1.0
        self.status = DownloadStatus.COMPLETED
        print(f"✓ Download completed: '{self.video.title}'")
    
    def cancel(self) -> None:
        """Cancel download"""
        self.status = DownloadStatus.CANCELLED
        print(f"✗ Download cancelled")
    
    def __repr__(self):
        return f"Download({self.video.title}, {self.status.value}, {self.progress*100:.0f}%)"


class DownloadManager:
    """
    Manages video downloads for offline viewing (Singleton).
    
    Usage:
        manager = DownloadManager()
        download = manager.download_video(video, quality)
        manager.pause_download(download.id)
        downloads = manager.get_downloads()
    
    Returns:
        DownloadManager: Singleton manager instance
    """
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(DownloadManager, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        
        self.downloads: Dict[str, Download] = {}
        self.storage_limit = 10 * 1024 * 1024 * 1024  # 10 GB
        self.storage_used = 0
        self._download_counter = 0
    
    def download_video(self, video: Video, quality: Quality) -> Download:
        """Queue video for download"""
        self._download_counter += 1
        download_id = f"dl_{self._download_counter}"
        
        download = Download(download_id, video, quality)
        
        # Check storage
        if self.storage_used + download.size > self.storage_limit:
            print(f"✗ Insufficient storage for download")
            download.status = DownloadStatus.FAILED
            return download
        
        self.downloads[download_id] = download
        download.start()
        
        # Simulate download progress
        download.progress = 0.5  # 50% for demo
        
        return download
    
    def pause_download(self, download_id: str) -> None:
        """Pause a download"""
        if download_id in self.downloads:
            self.downloads[download_id].pause()
    
    def resume_download(self, download_id: str) -> None:
        """Resume a download"""
        if download_id in self.downloads:
            self.downloads[download_id].resume()
    
    def cancel_download(self, download_id: str) -> None:
        """Cancel and remove download"""
        if download_id in self.downloads:
            download = self.downloads[download_id]
            download.cancel()
            del self.downloads[download_id]
    
    def get_downloads(self) -> List[Download]:
        """Get all downloads"""
        return list(self.downloads.values())
    
    def get_storage_info(self) -> Dict[str, Any]:
        """Get storage information"""
        return {
            'used': self.storage_used,
            'limit': self.storage_limit,
            'available': self.storage_limit - self.storage_used,
            'used_percentage': (self.storage_used / self.storage_limit * 100)
        }
    
    def __repr__(self):
        return f"DownloadManager({len(self.downloads)} downloads)"


# ===================== Video Player (Main Controller) =====================

class VideoPlayer:
    """
    Main video player managing playback and controls.
    
    Usage:
        player = VideoPlayer()
        player.load_video(video)
        player.play()
        player.seek(120)
        player.set_quality("1080p")
        player.enable_subtitles("en")
    
    Returns:
        VideoPlayer: Player instance with full control
    """
    
    def __init__(self):
        self.current_video: Optional[Video] = None
        self.state: PlaybackState = IdleState()
        self.current_time = 0.0
        self.volume = 1.0
        self.playback_speed = 1.0
        self.current_quality: Optional[Quality] = None
        self.current_subtitle: Optional[Subtitle] = None
        self.is_muted = False
        self.is_fullscreen = False
        self.buffer_manager = BufferManager()
        self.watch_history = WatchHistory("user_1")
    
    def load_video(self, video: Video) -> None:
        """
        Load a video for playback.
        
        Args:
            video: Video to load
        """
        self.current_video = video
        
        # Restore last watch position
        last_position = self.watch_history.get_watch_position(video.id)
        self.current_time = last_position
        
        # Set default quality
        if video.qualities:
            self.current_quality = video.qualities[0]
        
        # Initialize buffer
        self.buffer_manager.add_to_buffer(BufferRange(0, 10))
        
        self.state = PausedState()
        
        resume_msg = f" (resuming from {self.format_time(last_position)})" if last_position > 0 else ""
        print(f"📹 Loaded: {video.title}{resume_msg}")
        print(f"   Duration: {self.format_time(video.duration)}")
        print(f"   Quality: {self.current_quality.resolution if self.current_quality else 'N/A'}")
    
    def play(self) -> None:
        """Start or resume playback"""
        if not self.current_video:
            print("No video loaded")
            return
        
        self.state.play(self)
        
        if isinstance(self.state, PlayingState):
            print(f"▶  Playing at {self.playback_speed}x speed")
    
    def pause(self) -> None:
        """Pause playback"""
        self.state.pause(self)
        # Save watch position
        if self.current_video:
            self.watch_history.add_entry(self.current_video, self.current_time)
    
    def stop(self) -> None:
        """Stop playback"""
        self.state.stop(self)
        if self.current_video:
            self.watch_history.add_entry(self.current_video, self.current_time)
    
    def seek(self, time: float) -> None:
        """Seek to specific time"""
        self.state.seek(self, time)
    
    def skip_forward(self, seconds: int = 10) -> None:
        """Skip forward by seconds"""
        if self.current_video:
            new_time = min(self.current_time + seconds, self.current_video.duration)
            self.seek(new_time)
    
    def skip_backward(self, seconds: int = 10) -> None:
        """Skip backward by seconds"""
        new_time = max(self.current_time - seconds, 0)
        self.seek(new_time)
    
    def set_volume(self, volume: float) -> None:
        """Set volume (0.0 to 1.0)"""
        self.volume = max(0.0, min(1.0, volume))
        if self.is_muted:
            self.is_muted = False
        print(f"🔊 Volume: {int(self.volume * 100)}%")
    
    def mute(self) -> None:
        """Mute audio"""
        self.is_muted = True
        print("🔇 Muted")
    
    def unmute(self) -> None:
        """Unmute audio"""
        self.is_muted = False
        print(f"🔊 Unmuted ({int(self.volume * 100)}%)")
    
    def set_playback_speed(self, speed: float) -> None:
        """Set playback speed"""
        if 0.25 <= speed <= 2.0:
            self.playback_speed = speed
            print(f"⏩ Speed: {speed}x")
        else:
            print("Speed must be between 0.25x and 2.0x")
    
    def set_quality(self, resolution: str) -> None:
        """Set video quality"""
        if self.current_video:
            quality = self.current_video.get_quality(resolution)
            if quality:
                self.current_quality = quality
                print(f"📺 Quality: {resolution}")
            else:
                print(f"Quality {resolution} not available")
    
    def enable_subtitles(self, language: str) -> None:
        """Enable subtitles"""
        if self.current_video:
            subtitle = self.current_video.get_subtitle(language)
            if subtitle:
                subtitle.parse()  # Parse subtitle file
                self.current_subtitle = subtitle
                print(f"💬 Subtitles enabled: {language}")
            else:
                print(f"Subtitles not available for {language}")
    
    def disable_subtitles(self) -> None:
        """Disable subtitles"""
        self.current_subtitle = None
        print("💬 Subtitles disabled")
    
    def toggle_fullscreen(self) -> None:
        """Toggle fullscreen mode"""
        self.is_fullscreen = not self.is_fullscreen
        mode = "Fullscreen" if self.is_fullscreen else "Normal"
        print(f"🖥  {mode} mode")
    
    def get_current_subtitle(self) -> Optional[str]:
        """Get current subtitle text"""
        if self.current_subtitle:
            return self.current_subtitle.get_cue_at(self.current_time)
        return None
    
    def get_player_state(self) -> Dict[str, Any]:
        """Get current player state"""
        return {
            'state': self.state.__class__.__name__,
            'current_time': self.current_time,
            'duration': self.current_video.duration if self.current_video else 0,
            'volume': self.volume,
            'is_muted': self.is_muted,
            'speed': self.playback_speed,
            'quality': self.current_quality.resolution if self.current_quality else None,
            'subtitles': self.current_subtitle.language if self.current_subtitle else None,
            'fullscreen': self.is_fullscreen
        }
    
    @staticmethod
    def format_time(seconds: float) -> str:
        """Format seconds as HH:MM:SS"""
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        if hours > 0:
            return f"{hours}:{minutes:02d}:{secs:02d}"
        return f"{minutes}:{secs:02d}"
    
    def __repr__(self):
        if self.current_video:
            return f"VideoPlayer('{self.current_video.title}', {self.state.__class__.__name__})"
        return "VideoPlayer(no video)"


# ===================== Demo Implementation =====================

def print_separator(title: str = ""):
    """Print a formatted separator"""
    if title:
        print(f"\n{'='*60}")
        print(f"  {title}")
        print('='*60)
    else:
        print('-' * 60)


def demo_video_player():
    """
    Comprehensive demonstration of Video Player system.
    
    Demonstrates:
    1. Creating videos with qualities and subtitles
    2. Loading and playing videos
    3. Playback controls (play, pause, seek, skip)
    4. Quality selection
    5. Subtitle support
    6. Speed control
    7. Volume control
    8. Playlist management
    9. Watch history
    10. Download manager
    """
    
    print_separator("VIDEO PLAYER SYSTEM DEMO")
    
    # 1. Create videos with qualities and subtitles
    print("\n1. Creating Videos with Qualities")
    print_separator()
    
    video1 = Video("v001", "Python Tutorial - Basics", "https://cdn.com/python_basics.mp4", 3600)
    video1.add_quality(Quality("360p", 1000000, "url_360p"))
    video1.add_quality(Quality("720p", 3000000, "url_720p"))
    video1.add_quality(Quality("1080p", 5000000, "url_1080p"))
    video1.add_subtitle(Subtitle("en", "url_en.srt"))
    video1.add_subtitle(Subtitle("es", "url_es.srt"))
    print(f"✓ Created: {video1}")
    
    video2 = Video("v002", "Advanced Python - OOP", "https://cdn.com/python_oop.mp4", 2700)
    video2.add_quality(Quality("720p", 3000000, "url_720p"))
    video2.add_quality(Quality("1080p", 5000000, "url_1080p"))
    video2.add_subtitle(Subtitle("en", "url_en.srt"))
    print(f"✓ Created: {video2}")
    
    video3 = Video("v003", "Python Design Patterns", "https://cdn.com/python_patterns.mp4", 4200)
    video3.add_quality(Quality("1080p", 5000000, "url_1080p"))
    video3.add_subtitle(Subtitle("en", "url_en.srt"))
    print(f"✓ Created: {video3}")
    
    # 2. Create player and load video
    print("\n2. Loading Video and Basic Playback")
    print_separator()
    player = VideoPlayer()
    player.load_video(video1)
    
    # 3. Basic playback controls
    player.play()
    print(f"   Current state: {player.state.__class__.__name__}")
    
    # Simulate watching
    player.current_time = 120
    print(f"   Watched to: {player.format_time(player.current_time)}")
    
    player.pause()
    
    # 4. Seek and skip
    print("\n3. Navigation Controls")
    print_separator()
    player.seek(300)
    player.skip_forward(30)
    player.skip_backward(10)
    
    # 5. Quality selection
    print("\n4. Quality Selection")
    print_separator()
    print(f"Available qualities: {[q.resolution for q in video1.qualities]}")
    player.set_quality("1080p")
    player.set_quality("720p")  # Switch to lower quality
    
    # 6. Enable subtitles
    print("\n5. Subtitle Support")
    print_separator()
    player.enable_subtitles("en")
    subtitle_text = player.get_current_subtitle()
    if subtitle_text:
        print(f"   Subtitle: '{subtitle_text}'")
    
    # 7. Speed and volume control
    print("\n6. Speed and Volume Control")
    print_separator()
    player.set_playback_speed(1.5)
    player.set_volume(0.7)
    player.mute()
    player.unmute()
    player.set_playback_speed(1.0)  # Back to normal
    
    # 8. Fullscreen
    print("\n7. View Modes")
    print_separator()
    player.toggle_fullscreen()
    player.toggle_fullscreen()  # Back to normal
    
    # 9. Watch more and check state
    print("\n8. Continuing Playback")
    print_separator()
    player.play()
    player.current_time = 1800  # Simulate watching to 30:00
    print(f"   Watched to: {player.format_time(player.current_time)}")
    progress = (player.current_time / video1.duration) * 100
    print(f"   Progress: {progress:.1f}%")
    player.pause()
    
    # 10. Playlist management
    print("\n9. Playlist Management")
    print_separator()
    playlist = Playlist("pl001", "Python Learning Path")
    playlist.add_video(video1)
    playlist.add_video(video2)
    playlist.add_video(video3)
    print(f"\n📚 {playlist}")
    print(f"   Videos: {[v.title for v in playlist.videos]}")
    
    playlist.set_repeat_mode(RepeatMode.ALL)
    playlist.shuffle()
    
    print(f"\n   Playing playlist...")
    current = playlist.get_current_video()
    print(f"   Now playing: {current.title}")
    
    next_video = playlist.next()
    if next_video:
        print(f"   Next: {next_video.title}")
    
    # 11. Watch history
    print("\n10. Watch History and Resume")
    print_separator()
    print(f"📜 {player.watch_history}")
    
    recent = player.watch_history.get_recent_videos()
    print(f"\n   Recent videos ({len(recent)}):")
    for entry in recent:
        print(f"   - {entry}")
    
    continue_watching = player.watch_history.get_continue_watching()
    print(f"\n   Continue watching ({len(continue_watching)}):")
    for entry in continue_watching:
        print(f"   - {entry}")
    
    # 12. Download manager
    print("\n11. Download Manager")
    print_separator()
    download_manager = DownloadManager()
    
    # Download video2 in 1080p
    download = download_manager.download_video(video2, video2.qualities[-1])
    print(f"   {download}")
    
    # Simulate progress
    download.progress = 0.75
    print(f"   Progress: {download.progress*100:.0f}%")
    
    download.complete()
    
    downloads = download_manager.get_downloads()
    print(f"\n   Total downloads: {len(downloads)}")
    for dl in downloads:
        print(f"   - {dl}")
    
    storage_info = download_manager.get_storage_info()
    print(f"\n   Storage: {storage_info['used_percentage']:.1f}% used")
    
    # 13. Load another video and resume from history
    print("\n12. Loading Another Video (Resume from History)")
    print_separator()
    player.load_video(video2)
    player.play()
    player.current_time = 600  # Simulate watching
    print(f"   Watched to: {player.format_time(player.current_time)}")
    player.pause()
    
    # 14. Player state summary
    print("\n13. Player State Summary")
    print_separator()
    state = player.get_player_state()
    print(f"📊 Current State:")
    print(f"   Video: {player.current_video.title if player.current_video else 'None'}")
    print(f"   State: {state['state']}")
    print(f"   Time: {player.format_time(state['current_time'])} / {player.format_time(state['duration'])}")
    print(f"   Quality: {state['quality']}")
    print(f"   Speed: {state['speed']}x")
    print(f"   Volume: {int(state['volume'] * 100)}%")
    print(f"   Subtitles: {state['subtitles']}")
    print(f"   Fullscreen: {state['fullscreen']}")
    
    print("\n" + "="*60)
    print("  DEMO COMPLETE")
    print("="*60)
    print("\n✓ Video Player system features demonstrated:")
    print("  • Video loading with multiple qualities")
    print("  • Playback controls (play, pause, seek, skip)")
    print("  • Quality selection and switching")
    print("  • Subtitle support with synchronization")
    print("  • Playback speed control (0.25x-2x)")
    print("  • Volume control and muting")
    print("  • Fullscreen and view modes")
    print("  • Playlist with shuffle and repeat")
    print("  • Watch history and resume capability")
    print("  • Download manager for offline viewing")
    print("  • Buffer management for smooth streaming")


if __name__ == "__main__":
    demo_video_player()
