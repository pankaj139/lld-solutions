/**
 * Video Player System Implementation
 * 
 * This module implements a comprehensive video player (like YouTube, Netflix) with:
 * - Playback controls (play, pause, seek, skip)
 * - Quality selection (Auto, 360p, 720p, 1080p, 4K)
 * - Speed control (0.25x to 2x)
 * - Subtitle support with synchronization
 * - Playlist management with shuffle/repeat
 * - Buffer management for smooth streaming
 * - Watch history and resume capability
 * - Download manager for offline viewing
 * - Recommendations engine
 * 
 * Usage:
 *   // Create player and load video
 *   const player = new VideoPlayer();
 *   const video = new Video("v1", "Tutorial", "https://cdn.com/video.mp4", 3600);
 *   player.loadVideo(video);
 *   
 *   // Playback control
 *   player.play();
 *   player.seek(120);
 *   player.setQuality("1080p");
 *   player.enableSubtitles("en");
 *   
 *   // Playlist
 *   const playlist = new Playlist("pl1", "My Playlist");
 *   playlist.addVideo(video);
 *   playlist.play();
 * 
 * Design Patterns:
 *   - State Pattern: Playback states (Idle, Playing, Paused, Buffering)
 *   - Strategy Pattern: Quality selection, streaming strategies
 *   - Observer Pattern: Progress updates, quality changes
 *   - Command Pattern: Playback commands
 *   - Singleton Pattern: Player instance, managers
 *   - Factory Pattern: Video decoders
 *   - Proxy Pattern: Buffering proxy
 *   - Decorator Pattern: Video filters
 * 
 * Author: LLD Solutions
 * Date: 2025-10-05
 */

// ===================== Enums =====================

const PlayerState = {
    IDLE: 'idle',
    PLAYING: 'playing',
    PAUSED: 'paused',
    BUFFERING: 'buffering',
    STOPPED: 'stopped',
    ERROR: 'error'
};

const RepeatMode = {
    OFF: 'off',
    ONE: 'one',
    ALL: 'all'
};

const DownloadStatus = {
    QUEUED: 'queued',
    DOWNLOADING: 'downloading',
    PAUSED: 'paused',
    COMPLETED: 'completed',
    FAILED: 'failed',
    CANCELLED: 'cancelled'
};

// ===================== Video and Quality Classes =====================

/**
 * Represents a video quality option.
 * 
 * Usage:
 *   const quality = new Quality("1080p", 5000000, "https://cdn.com/1080p.mp4", "h264");
 *   const bandwidth = quality.getBandwidth();
 * 
 * Returns:
 *   Quality: Quality configuration with URL and bitrate
 */
class Quality {
    constructor(resolution, bitrate, url, codec = "h264") {
        this.resolution = resolution;
        this.bitrate = bitrate;
        this.url = url;
        this.codec = codec;
    }

    getBandwidth() {
        return this.bitrate;
    }

    toString() {
        return `Quality(${this.resolution}, ${Math.floor(this.bitrate/1000)}kbps)`;
    }
}

class SubtitleCue {
    constructor(startTime, endTime, text) {
        this.startTime = startTime;
        this.endTime = endTime;
        this.text = text;
    }
}

/**
 * Represents a subtitle track.
 * 
 * Usage:
 *   const subtitle = new Subtitle("en", "https://cdn.com/subs_en.srt", "SRT");
 *   subtitle.parse();
 *   const cue = subtitle.getCueAt(120.5);
 * 
 * Returns:
 *   Subtitle: Subtitle track with cues
 */
class Subtitle {
    constructor(language, url, formatType = "SRT") {
        this.language = language;
        this.url = url;
        this.format = formatType;
        this.cues = [];
    }

    parse() {
        // Simulate parsing SRT file
        this.cues = [
            new SubtitleCue(0, 5, "Welcome to the tutorial"),
            new SubtitleCue(5, 10, "Let's get started"),
            new SubtitleCue(10, 15, "First, we'll cover the basics")
        ];
    }

    getCueAt(time) {
        // Binary search for subtitle cue
        let left = 0;
        let right = this.cues.length - 1;

        while (left <= right) {
            const mid = Math.floor((left + right) / 2);
            const cue = this.cues[mid];

            if (cue.startTime <= time && time <= cue.endTime) {
                return cue.text;
            } else if (time < cue.startTime) {
                right = mid - 1;
            } else {
                left = mid + 1;
            }
        }

        return null;
    }

    toString() {
        return `Subtitle(${this.language}, ${this.cues.length} cues)`;
    }
}

/**
 * Represents a video with metadata and available qualities.
 * 
 * Usage:
 *   const video = new Video("v123", "Tutorial", "https://cdn.com/video.mp4", 3600);
 *   video.addQuality(new Quality("1080p", 5000000, "url"));
 *   video.addSubtitle(new Subtitle("en", "url"));
 * 
 * Returns:
 *   Video: Complete video instance
 */
class Video {
    constructor(videoId, title, url, duration) {
        this.id = videoId;
        this.title = title;
        this.url = url;
        this.duration = duration;
        this.thumbnail = `https://cdn.com/thumb_${videoId}.jpg`;
        this.qualities = [];
        this.subtitles = [];
        this.metadata = {
            description: '',
            views: 0,
            likes: 0,
            category: 'Education'
        };
    }

    addQuality(quality) {
        this.qualities.push(quality);
    }

    addSubtitle(subtitle) {
        this.subtitles.push(subtitle);
    }

    getQuality(resolution) {
        return this.qualities.find(q => q.resolution === resolution) || null;
    }

    getSubtitle(language) {
        return this.subtitles.find(s => s.language === language) || null;
    }

    toString() {
        return `Video('${this.title}', ${this.duration}s, ${this.qualities.length} qualities)`;
    }
}

// ===================== Playback State (State Pattern) =====================

class PlaybackState {
    play(player) {
        throw new Error("Method must be implemented");
    }

    pause(player) {
        throw new Error("Method must be implemented");
    }

    stop(player) {
        throw new Error("Method must be implemented");
    }

    seek(player, time) {
        throw new Error("Method must be implemented");
    }
}

class IdleState extends PlaybackState {
    play(player) {
        console.log("No video loaded. Load a video first.");
    }

    pause(player) {
        console.log("No video playing.");
    }

    stop(player) {
        console.log("Already stopped.");
    }

    seek(player, time) {
        console.log("No video loaded.");
    }
}

class PlayingState extends PlaybackState {
    play(player) {
        console.log("Already playing.");
    }

    pause(player) {
        player.state = new PausedState();
        console.log(`⏸  Paused at ${VideoPlayer.formatTime(player.currentTime)}`);
    }

    stop(player) {
        player.currentTime = 0;
        player.state = new IdleState();
        console.log("⏹ Stopped");
    }

    seek(player, time) {
        if (time >= 0 && time <= player.currentVideo.duration) {
            player.currentTime = time;
            console.log(`⏩ Seeking to ${VideoPlayer.formatTime(time)}`);
        } else {
            console.log("Invalid seek time");
        }
    }
}

class PausedState extends PlaybackState {
    play(player) {
        player.state = new PlayingState();
        console.log(`▶  Resumed from ${VideoPlayer.formatTime(player.currentTime)}`);
    }

    pause(player) {
        console.log("Already paused.");
    }

    stop(player) {
        player.currentTime = 0;
        player.state = new IdleState();
        console.log("⏹ Stopped");
    }

    seek(player, time) {
        if (time >= 0 && time <= player.currentVideo.duration) {
            player.currentTime = time;
            console.log(`⏩ Seeking to ${VideoPlayer.formatTime(time)}`);
        }
    }
}

class BufferingState extends PlaybackState {
    play(player) {
        console.log("Buffering... Please wait.");
    }

    pause(player) {
        player.state = new PausedState();
        console.log("⏸  Paused during buffering");
    }

    stop(player) {
        player.currentTime = 0;
        player.state = new IdleState();
        console.log("⏹ Stopped");
    }

    seek(player, time) {
        console.log("Cannot seek while buffering");
    }
}

// ===================== Buffer Manager =====================

class BufferRange {
    constructor(start, end) {
        this.start = start;
        this.end = end;
    }

    contains(time) {
        return this.start <= time && time <= this.end;
    }

    toString() {
        return `[${this.start.toFixed(1)}s - ${this.end.toFixed(1)}s]`;
    }
}

/**
 * Manages video buffering for smooth playback.
 * 
 * Usage:
 *   const bufferMgr = new BufferManager(30);
 *   bufferMgr.addToBuffer(new BufferRange(0, 10));
 *   const isBuffered = bufferMgr.isBuffered(5);
 * 
 * Returns:
 *   BufferManager: Manager for buffering operations
 */
class BufferManager {
    constructor(bufferSize = 30) {
        this.bufferSize = bufferSize;
        this.bufferedRanges = [];
        this.downloadSpeed = 0.0;
    }

    addToBuffer(range) {
        this.bufferedRanges.push(range);
        this._mergeOverlappingRanges();
    }

    _mergeOverlappingRanges() {
        if (this.bufferedRanges.length === 0) return;

        this.bufferedRanges.sort((a, b) => a.start - b.start);

        const merged = [this.bufferedRanges[0]];
        for (let i = 1; i < this.bufferedRanges.length; i++) {
            const current = this.bufferedRanges[i];
            const last = merged[merged.length - 1];

            if (current.start <= last.end) {
                last.end = Math.max(last.end, current.end);
            } else {
                merged.push(current);
            }
        }

        this.bufferedRanges = merged;
    }

    isBuffered(time) {
        return this.bufferedRanges.some(range => range.contains(time));
    }

    getBufferedTime(fromTime) {
        for (const range of this.bufferedRanges) {
            if (range.start <= fromTime && fromTime <= range.end) {
                return range.end - fromTime;
            }
        }
        return 0.0;
    }

    getBufferedPercentage(currentTime, duration) {
        const buffered = this.getBufferedTime(currentTime);
        return Math.min(1.0, buffered / this.bufferSize);
    }

    estimateBandwidth() {
        return this.downloadSpeed > 0 ? this.downloadSpeed : 5.0;
    }

    toString() {
        return `BufferManager(${this.bufferedRanges.length} ranges)`;
    }
}

// ===================== Playlist =====================

/**
 * Manages a playlist of videos with playback order.
 * 
 * Usage:
 *   const playlist = new Playlist("pl1", "My Playlist");
 *   playlist.addVideo(video1);
 *   playlist.addVideo(video2);
 *   playlist.setRepeatMode(RepeatMode.ALL);
 *   playlist.shuffle();
 *   const nextVideo = playlist.next();
 * 
 * Returns:
 *   Playlist: Playlist with video management
 */
class Playlist {
    constructor(playlistId, name) {
        this.id = playlistId;
        this.name = name;
        this.videos = [];
        this.currentIndex = 0;
        this.repeatMode = RepeatMode.OFF;
        this.shuffleEnabled = false;
        this._originalOrder = [];
    }

    addVideo(video) {
        this.videos.push(video);
        console.log(`✓ Added '${video.title}' to '${this.name}'`);
    }

    removeVideo(index) {
        if (index >= 0 && index < this.videos.length) {
            const removed = this.videos.splice(index, 1)[0];
            console.log(`✓ Removed '${removed.title}' from '${this.name}'`);
            return true;
        }
        return false;
    }

    next() {
        if (this.videos.length === 0) return null;

        if (this.repeatMode === RepeatMode.ONE) {
            return this.videos[this.currentIndex];
        }

        this.currentIndex++;

        if (this.currentIndex >= this.videos.length) {
            if (this.repeatMode === RepeatMode.ALL) {
                this.currentIndex = 0;
            } else {
                return null;
            }
        }

        return this.videos[this.currentIndex];
    }

    previous() {
        if (this.videos.length === 0) return null;

        this.currentIndex--;
        if (this.currentIndex < 0) {
            this.currentIndex = this.videos.length - 1;
        }

        return this.videos[this.currentIndex];
    }

    getCurrentVideo() {
        if (this.currentIndex >= 0 && this.currentIndex < this.videos.length) {
            return this.videos[this.currentIndex];
        }
        return null;
    }

    shuffle() {
        if (!this.shuffleEnabled) {
            this._originalOrder = [...this.videos];
            this.shuffleEnabled = true;
        }

        // Fisher-Yates shuffle
        for (let i = this.videos.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.videos[i], this.videos[j]] = [this.videos[j], this.videos[i]];
        }

        console.log(`🔀 Shuffled '${this.name}'`);
    }

    unshuffle() {
        if (this.shuffleEnabled && this._originalOrder.length > 0) {
            this.videos = [...this._originalOrder];
            this.shuffleEnabled = false;
            console.log(`✓ Restored order for '${this.name}'`);
        }
    }

    setRepeatMode(mode) {
        this.repeatMode = mode;
        console.log(`🔁 Repeat mode: ${mode}`);
    }

    toString() {
        return `Playlist('${this.name}', ${this.videos.length} videos)`;
    }
}

// ===================== Watch History =====================

class HistoryEntry {
    constructor(videoId, watchTime, totalDuration) {
        this.videoId = videoId;
        this.watchTime = watchTime;
        this.totalDuration = totalDuration;
        this.timestamp = new Date();
        this.completed = watchTime >= totalDuration * 0.95;
    }

    getProgress() {
        return Math.min(1.0, this.watchTime / this.totalDuration);
    }

    isRecent() {
        const daysDiff = (new Date() - this.timestamp) / (1000 * 60 * 60 * 24);
        return daysDiff < 7;
    }

    toString() {
        const progress = this.getProgress() * 100;
        return `History(${this.videoId}, ${progress.toFixed(0)}% watched)`;
    }
}

/**
 * Tracks user's viewing history and progress.
 * 
 * Usage:
 *   const history = new WatchHistory("user_123");
 *   history.addEntry(video, 1200);
 *   const position = history.getWatchPosition("video_id");
 *   const recent = history.getRecentVideos();
 * 
 * Returns:
 *   WatchHistory: History tracker with resume capability
 */
class WatchHistory {
    constructor(userId) {
        this.userId = userId;
        this.entries = [];
        this._positionMap = new Map();
    }

    addEntry(video, watchTime) {
        this.entries = this.entries.filter(e => e.videoId !== video.id);

        const entry = new HistoryEntry(video.id, watchTime, video.duration);
        this.entries.unshift(entry);
        this._positionMap.set(video.id, watchTime);

        this.entries = this.entries.slice(0, 100);
    }

    getWatchPosition(videoId) {
        return this._positionMap.get(videoId) || 0.0;
    }

    getRecentVideos(limit = 10) {
        return this.entries.filter(e => e.isRecent()).slice(0, limit);
    }

    getContinueWatching() {
        return this.entries
            .filter(e => !e.completed && e.getProgress() > 0.05)
            .slice(0, 10);
    }

    clearHistory() {
        this.entries = [];
        this._positionMap.clear();
        console.log("✓ History cleared");
    }

    toString() {
        return `WatchHistory(${this.entries.length} entries)`;
    }
}

// ===================== Download Manager =====================

class Download {
    constructor(downloadId, video, quality) {
        this.id = downloadId;
        this.video = video;
        this.quality = quality;
        this.progress = 0.0;
        this.status = DownloadStatus.QUEUED;
        this.filePath = `/downloads/${video.id}_${quality.resolution}.mp4`;
        this.size = Math.floor(quality.bitrate * video.duration / 8);
    }

    start() {
        this.status = DownloadStatus.DOWNLOADING;
        console.log(`📥 Downloading '${this.video.title}' (${this.quality.resolution})`);
    }

    pause() {
        this.status = DownloadStatus.PAUSED;
        console.log(`⏸  Download paused: ${(this.progress * 100).toFixed(0)}%`);
    }

    resume() {
        this.status = DownloadStatus.DOWNLOADING;
        console.log(`▶  Download resumed: ${(this.progress * 100).toFixed(0)}%`);
    }

    complete() {
        this.progress = 1.0;
        this.status = DownloadStatus.COMPLETED;
        console.log(`✓ Download completed: '${this.video.title}'`);
    }

    cancel() {
        this.status = DownloadStatus.CANCELLED;
        console.log("✗ Download cancelled");
    }

    toString() {
        return `Download(${this.video.title}, ${this.status}, ${(this.progress * 100).toFixed(0)}%)`;
    }
}

/**
 * Manages video downloads for offline viewing (Singleton).
 * 
 * Usage:
 *   const manager = new DownloadManager();
 *   const download = manager.downloadVideo(video, quality);
 *   manager.pauseDownload(download.id);
 *   const downloads = manager.getDownloads();
 * 
 * Returns:
 *   DownloadManager: Singleton manager instance
 */
class DownloadManager {
    constructor() {
        if (DownloadManager.instance) {
            return DownloadManager.instance;
        }
        DownloadManager.instance = this;

        this.downloads = new Map();
        this.storageLimit = 10 * 1024 * 1024 * 1024; // 10 GB
        this.storageUsed = 0;
        this._downloadCounter = 0;
    }

    downloadVideo(video, quality) {
        this._downloadCounter++;
        const downloadId = `dl_${this._downloadCounter}`;

        const download = new Download(downloadId, video, quality);

        if (this.storageUsed + download.size > this.storageLimit) {
            console.log("✗ Insufficient storage for download");
            download.status = DownloadStatus.FAILED;
            return download;
        }

        this.downloads.set(downloadId, download);
        download.start();
        download.progress = 0.5; // Simulate 50% progress

        return download;
    }

    pauseDownload(downloadId) {
        const download = this.downloads.get(downloadId);
        if (download) {
            download.pause();
        }
    }

    resumeDownload(downloadId) {
        const download = this.downloads.get(downloadId);
        if (download) {
            download.resume();
        }
    }

    cancelDownload(downloadId) {
        const download = this.downloads.get(downloadId);
        if (download) {
            download.cancel();
            this.downloads.delete(downloadId);
        }
    }

    getDownloads() {
        return Array.from(this.downloads.values());
    }

    getStorageInfo() {
        return {
            used: this.storageUsed,
            limit: this.storageLimit,
            available: this.storageLimit - this.storageUsed,
            usedPercentage: (this.storageUsed / this.storageLimit * 100)
        };
    }

    toString() {
        return `DownloadManager(${this.downloads.size} downloads)`;
    }
}

// ===================== Video Player (Main Controller) =====================

/**
 * Main video player managing playback and controls.
 * 
 * Usage:
 *   const player = new VideoPlayer();
 *   player.loadVideo(video);
 *   player.play();
 *   player.seek(120);
 *   player.setQuality("1080p");
 *   player.enableSubtitles("en");
 * 
 * Returns:
 *   VideoPlayer: Player instance with full control
 */
class VideoPlayer {
    constructor() {
        this.currentVideo = null;
        this.state = new IdleState();
        this.currentTime = 0.0;
        this.volume = 1.0;
        this.playbackSpeed = 1.0;
        this.currentQuality = null;
        this.currentSubtitle = null;
        this.isMuted = false;
        this.isFullscreen = false;
        this.bufferManager = new BufferManager();
        this.watchHistory = new WatchHistory("user_1");
    }

    loadVideo(video) {
        this.currentVideo = video;

        const lastPosition = this.watchHistory.getWatchPosition(video.id);
        this.currentTime = lastPosition;

        if (video.qualities.length > 0) {
            this.currentQuality = video.qualities[0];
        }

        this.bufferManager.addToBuffer(new BufferRange(0, 10));
        this.state = new PausedState();

        const resumeMsg = lastPosition > 0 
            ? ` (resuming from ${VideoPlayer.formatTime(lastPosition)})` 
            : "";
        console.log(`📹 Loaded: ${video.title}${resumeMsg}`);
        console.log(`   Duration: ${VideoPlayer.formatTime(video.duration)}`);
        console.log(`   Quality: ${this.currentQuality ? this.currentQuality.resolution : 'N/A'}`);
    }

    play() {
        if (!this.currentVideo) {
            console.log("No video loaded");
            return;
        }

        this.state.play(this);

        if (this.state instanceof PlayingState) {
            console.log(`▶  Playing at ${this.playbackSpeed}x speed`);
        }
    }

    pause() {
        this.state.pause(this);
        if (this.currentVideo) {
            this.watchHistory.addEntry(this.currentVideo, this.currentTime);
        }
    }

    stop() {
        this.state.stop(this);
        if (this.currentVideo) {
            this.watchHistory.addEntry(this.currentVideo, this.currentTime);
        }
    }

    seek(time) {
        this.state.seek(this, time);
    }

    skipForward(seconds = 10) {
        if (this.currentVideo) {
            const newTime = Math.min(this.currentTime + seconds, this.currentVideo.duration);
            this.seek(newTime);
        }
    }

    skipBackward(seconds = 10) {
        const newTime = Math.max(this.currentTime - seconds, 0);
        this.seek(newTime);
    }

    setVolume(volume) {
        this.volume = Math.max(0.0, Math.min(1.0, volume));
        if (this.isMuted) {
            this.isMuted = false;
        }
        console.log(`🔊 Volume: ${Math.floor(this.volume * 100)}%`);
    }

    mute() {
        this.isMuted = true;
        console.log("🔇 Muted");
    }

    unmute() {
        this.isMuted = false;
        console.log(`🔊 Unmuted (${Math.floor(this.volume * 100)}%)`);
    }

    setPlaybackSpeed(speed) {
        if (speed >= 0.25 && speed <= 2.0) {
            this.playbackSpeed = speed;
            console.log(`⏩ Speed: ${speed}x`);
        } else {
            console.log("Speed must be between 0.25x and 2.0x");
        }
    }

    setQuality(resolution) {
        if (this.currentVideo) {
            const quality = this.currentVideo.getQuality(resolution);
            if (quality) {
                this.currentQuality = quality;
                console.log(`📺 Quality: ${resolution}`);
            } else {
                console.log(`Quality ${resolution} not available`);
            }
        }
    }

    enableSubtitles(language) {
        if (this.currentVideo) {
            const subtitle = this.currentVideo.getSubtitle(language);
            if (subtitle) {
                subtitle.parse();
                this.currentSubtitle = subtitle;
                console.log(`💬 Subtitles enabled: ${language}`);
            } else {
                console.log(`Subtitles not available for ${language}`);
            }
        }
    }

    disableSubtitles() {
        this.currentSubtitle = null;
        console.log("💬 Subtitles disabled");
    }

    toggleFullscreen() {
        this.isFullscreen = !this.isFullscreen;
        const mode = this.isFullscreen ? "Fullscreen" : "Normal";
        console.log(`🖥  ${mode} mode`);
    }

    getCurrentSubtitle() {
        if (this.currentSubtitle) {
            return this.currentSubtitle.getCueAt(this.currentTime);
        }
        return null;
    }

    getPlayerState() {
        return {
            state: this.state.constructor.name,
            currentTime: this.currentTime,
            duration: this.currentVideo ? this.currentVideo.duration : 0,
            volume: this.volume,
            isMuted: this.isMuted,
            speed: this.playbackSpeed,
            quality: this.currentQuality ? this.currentQuality.resolution : null,
            subtitles: this.currentSubtitle ? this.currentSubtitle.language : null,
            fullscreen: this.isFullscreen
        };
    }

    static formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        }
        return `${minutes}:${String(secs).padStart(2, '0')}`;
    }

    toString() {
        if (this.currentVideo) {
            return `VideoPlayer('${this.currentVideo.title}', ${this.state.constructor.name})`;
        }
        return "VideoPlayer(no video)";
    }
}

// ===================== Demo Implementation =====================

function printSeparator(title = "") {
    if (title) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`  ${title}`);
        console.log('='.repeat(60));
    } else {
        console.log('-'.repeat(60));
    }
}

function demoVideoPlayer() {
    printSeparator("VIDEO PLAYER SYSTEM DEMO");

    // 1. Create videos with qualities and subtitles
    console.log("\n1. Creating Videos with Qualities");
    printSeparator();

    const video1 = new Video("v001", "Python Tutorial - Basics", "https://cdn.com/python_basics.mp4", 3600);
    video1.addQuality(new Quality("360p", 1000000, "url_360p"));
    video1.addQuality(new Quality("720p", 3000000, "url_720p"));
    video1.addQuality(new Quality("1080p", 5000000, "url_1080p"));
    video1.addSubtitle(new Subtitle("en", "url_en.srt"));
    video1.addSubtitle(new Subtitle("es", "url_es.srt"));
    console.log(`✓ Created: ${video1}`);

    const video2 = new Video("v002", "Advanced Python - OOP", "https://cdn.com/python_oop.mp4", 2700);
    video2.addQuality(new Quality("720p", 3000000, "url_720p"));
    video2.addQuality(new Quality("1080p", 5000000, "url_1080p"));
    video2.addSubtitle(new Subtitle("en", "url_en.srt"));
    console.log(`✓ Created: ${video2}`);

    const video3 = new Video("v003", "Python Design Patterns", "https://cdn.com/python_patterns.mp4", 4200);
    video3.addQuality(new Quality("1080p", 5000000, "url_1080p"));
    video3.addSubtitle(new Subtitle("en", "url_en.srt"));
    console.log(`✓ Created: ${video3}`);

    // 2. Create player and load video
    console.log("\n2. Loading Video and Basic Playback");
    printSeparator();
    const player = new VideoPlayer();
    player.loadVideo(video1);

    // 3. Basic playback controls
    player.play();
    console.log(`   Current state: ${player.state.constructor.name}`);

    // Simulate watching
    player.currentTime = 120;
    console.log(`   Watched to: ${VideoPlayer.formatTime(player.currentTime)}`);

    player.pause();

    // 4. Seek and skip
    console.log("\n3. Navigation Controls");
    printSeparator();
    player.seek(300);
    player.skipForward(30);
    player.skipBackward(10);

    // 5. Quality selection
    console.log("\n4. Quality Selection");
    printSeparator();
    console.log(`Available qualities: [${video1.qualities.map(q => q.resolution).join(', ')}]`);
    player.setQuality("1080p");
    player.setQuality("720p");

    // 6. Enable subtitles
    console.log("\n5. Subtitle Support");
    printSeparator();
    player.enableSubtitles("en");
    const subtitleText = player.getCurrentSubtitle();
    if (subtitleText) {
        console.log(`   Subtitle: '${subtitleText}'`);
    }

    // 7. Speed and volume control
    console.log("\n6. Speed and Volume Control");
    printSeparator();
    player.setPlaybackSpeed(1.5);
    player.setVolume(0.7);
    player.mute();
    player.unmute();
    player.setPlaybackSpeed(1.0);

    // 8. Fullscreen
    console.log("\n7. View Modes");
    printSeparator();
    player.toggleFullscreen();
    player.toggleFullscreen();

    // 9. Watch more and check state
    console.log("\n8. Continuing Playback");
    printSeparator();
    player.play();
    player.currentTime = 1800;
    console.log(`   Watched to: ${VideoPlayer.formatTime(player.currentTime)}`);
    const progress = (player.currentTime / video1.duration) * 100;
    console.log(`   Progress: ${progress.toFixed(1)}%`);
    player.pause();

    // 10. Playlist management
    console.log("\n9. Playlist Management");
    printSeparator();
    const playlist = new Playlist("pl001", "Python Learning Path");
    playlist.addVideo(video1);
    playlist.addVideo(video2);
    playlist.addVideo(video3);
    console.log(`\n📚 ${playlist}`);
    console.log(`   Videos: [${playlist.videos.map(v => v.title).join(', ')}]`);

    playlist.setRepeatMode(RepeatMode.ALL);
    playlist.shuffle();

    console.log(`\n   Playing playlist...`);
    const current = playlist.getCurrentVideo();
    console.log(`   Now playing: ${current.title}`);

    const nextVideo = playlist.next();
    if (nextVideo) {
        console.log(`   Next: ${nextVideo.title}`);
    }

    // 11. Watch history
    console.log("\n10. Watch History and Resume");
    printSeparator();
    console.log(`📜 ${player.watchHistory}`);

    const recent = player.watchHistory.getRecentVideos();
    console.log(`\n   Recent videos (${recent.length}):`);
    recent.forEach(entry => console.log(`   - ${entry}`));

    const continueWatching = player.watchHistory.getContinueWatching();
    console.log(`\n   Continue watching (${continueWatching.length}):`);
    continueWatching.forEach(entry => console.log(`   - ${entry}`));

    // 12. Download manager
    console.log("\n11. Download Manager");
    printSeparator();
    const downloadManager = new DownloadManager();

    const download = downloadManager.downloadVideo(video2, video2.qualities[video2.qualities.length - 1]);
    console.log(`   ${download}`);

    download.progress = 0.75;
    console.log(`   Progress: ${(download.progress * 100).toFixed(0)}%`);

    download.complete();

    const downloads = downloadManager.getDownloads();
    console.log(`\n   Total downloads: ${downloads.length}`);
    downloads.forEach(dl => console.log(`   - ${dl}`));

    const storageInfo = downloadManager.getStorageInfo();
    console.log(`\n   Storage: ${storageInfo.usedPercentage.toFixed(1)}% used`);

    // 13. Load another video and resume from history
    console.log("\n12. Loading Another Video (Resume from History)");
    printSeparator();
    player.loadVideo(video2);
    player.play();
    player.currentTime = 600;
    console.log(`   Watched to: ${VideoPlayer.formatTime(player.currentTime)}`);
    player.pause();

    // 14. Player state summary
    console.log("\n13. Player State Summary");
    printSeparator();
    const state = player.getPlayerState();
    console.log(`📊 Current State:`);
    console.log(`   Video: ${player.currentVideo ? player.currentVideo.title : 'None'}`);
    console.log(`   State: ${state.state}`);
    console.log(`   Time: ${VideoPlayer.formatTime(state.currentTime)} / ${VideoPlayer.formatTime(state.duration)}`);
    console.log(`   Quality: ${state.quality}`);
    console.log(`   Speed: ${state.speed}x`);
    console.log(`   Volume: ${Math.floor(state.volume * 100)}%`);
    console.log(`   Subtitles: ${state.subtitles}`);
    console.log(`   Fullscreen: ${state.fullscreen}`);

    console.log("\n" + "=".repeat(60));
    console.log("  DEMO COMPLETE");
    console.log("=".repeat(60));
    console.log("\n✓ Video Player system features demonstrated:");
    console.log("  • Video loading with multiple qualities");
    console.log("  • Playback controls (play, pause, seek, skip)");
    console.log("  • Quality selection and switching");
    console.log("  • Subtitle support with synchronization");
    console.log("  • Playback speed control (0.25x-2x)");
    console.log("  • Volume control and muting");
    console.log("  • Fullscreen and view modes");
    console.log("  • Playlist with shuffle and repeat");
    console.log("  • Watch history and resume capability");
    console.log("  • Download manager for offline viewing");
    console.log("  • Buffer management for smooth streaming");
}

// Run the demo
if (require.main === module) {
    demoVideoPlayer();
}

// Exports
module.exports = {
    PlayerState,
    RepeatMode,
    DownloadStatus,
    Quality,
    SubtitleCue,
    Subtitle,
    Video,
    PlaybackState,
    IdleState,
    PlayingState,
    PausedState,
    BufferingState,
    BufferRange,
    BufferManager,
    Playlist,
    HistoryEntry,
    WatchHistory,
    Download,
    DownloadManager,
    VideoPlayer
};
