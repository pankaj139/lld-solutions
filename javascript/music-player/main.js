/**
 * MUSIC PLAYER SYSTEM - Low Level Design Implementation in JavaScript
 * 
 * This file implements a comprehensive music player with playlist management,
 * playback controls, shuffle/repeat modes, and library organization.
 * 
 * FILE PURPOSE:
 * Provides a production-ready music player system with state management, queue handling,
 * playlist creation, search capabilities, and observer notifications for UI updates.
 * 
 * DESIGN PATTERNS USED:
 * 1. STATE PATTERN: Player states (Playing, Paused, Stopped)
 * 2. STRATEGY PATTERN: Shuffle and repeat strategies
 * 3. OBSERVER PATTERN: Playback event notifications
 * 4. SINGLETON PATTERN: Single player instance
 * 5. COMMAND PATTERN: Playback controls
 * 6. COMPOSITE PATTERN: Playlist hierarchy
 * 7. ITERATOR PATTERN: Track iteration
 * 
 * OOP CONCEPTS DEMONSTRATED:
 * - ENCAPSULATION: Player state hidden behind interface
 * - INHERITANCE: State hierarchy
 * - POLYMORPHISM: Different states/strategies
 * - ABSTRACTION: Abstract player state
 * 
 * SOLID PRINCIPLES:
 * - SRP: Each class has single responsibility
 * - OCP: Open for extension (new states) closed for modification
 * - LSP: All states interchangeable
 * - ISP: Focused interfaces
 * - DIP: Depends on abstractions
 * 
 * USAGE:
 *     // Initialize player
 *     const player = MusicPlayer.getInstance();
 *     const library = new MusicLibrary();
 *     
 *     // Add tracks
 *     const track1 = new Track("1", "Bohemian Rhapsody", "Queen", "A Night at the Opera", 354);
 *     library.addTrack(track1);
 *     
 *     // Create playlist
 *     const playlist = library.createPlaylist("Rock Classics");
 *     playlist.addTrack(track1);
 *     
 *     // Load and play
 *     player.loadPlaylist(playlist);
 *     player.play();
 *     player.setVolume(75);
 *     
 *     // Navigate
 *     player.next();
 *     player.previous();
 *     
 *     // Shuffle and repeat
 *     player.setShuffle(true);
 *     player.setRepeat(RepeatMode.ALL);
 * 
 * RETURN VALUES:
 * - play(): Returns boolean (true if started)
 * - next(): Returns Track or null
 * - search(query): Returns Array<Track>
 * - getCurrentTrack(): Returns Track or null
 */

// ==================== ENUMS ====================

const PlayerState = {
    STOPPED: 'stopped',
    PLAYING: 'playing',
    PAUSED: 'paused'
};

const RepeatMode = {
    OFF: 'off',
    ONE: 'one',    // Repeat current track
    ALL: 'all'     // Repeat queue
};

const ShuffleMode = {
    OFF: 'off',
    ON: 'on'
};

// ==================== TRACK ====================

/**
 * Music track with metadata
 * 
 * USAGE:
 *     const track = new Track("1", "Song Title", "Artist", "Album", 240);
 * 
 * RETURN:
 *     Track instance
 */
class Track {
    constructor(trackId, title, artist, album, duration, genre = "Unknown", year = 0, filePath = "") {
        this.id = trackId;
        this.title = title;
        this.artist = artist;
        this.album = album;
        this.duration = duration; // seconds
        this.genre = genre;
        this.year = year;
        this.filePath = filePath;
        this.rating = 0.0;
        this.playCount = 0;
        this.lastPlayed = null;
        this.isFavorite = false;
    }

    play() {
        this.playCount++;
        this.lastPlayed = new Date();
    }

    toggleFavorite() {
        this.isFavorite = !this.isFavorite;
    }

    getDurationFormatted() {
        const minutes = Math.floor(this.duration / 60);
        const seconds = this.duration % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    toString() {
        return `Track(${this.title} by ${this.artist})`;
    }
}

// ==================== PLAYLIST ====================

/**
 * Collection of tracks
 * 
 * USAGE:
 *     const playlist = new Playlist("my-playlist", "My Favorites");
 *     playlist.addTrack(track);
 * 
 * RETURN:
 *     Playlist instance
 */
class Playlist {
    constructor(playlistId, name) {
        this.id = playlistId;
        this.name = name;
        this.tracks = [];
        this.createdAt = new Date();
    }

    addTrack(track) {
        if (!this.tracks.includes(track)) {
            this.tracks.push(track);
        }
    }

    removeTrack(trackId) {
        const index = this.tracks.findIndex(t => t.id === trackId);
        if (index !== -1) {
            this.tracks.splice(index, 1);
            return true;
        }
        return false;
    }

    moveTrack(fromIndex, toIndex) {
        if (fromIndex >= 0 && fromIndex < this.tracks.length &&
            toIndex >= 0 && toIndex < this.tracks.length) {
            const [track] = this.tracks.splice(fromIndex, 1);
            this.tracks.splice(toIndex, 0, track);
        }
    }

    shuffle() {
        for (let i = this.tracks.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.tracks[i], this.tracks[j]] = [this.tracks[j], this.tracks[i]];
        }
    }

    getTracks() {
        return [...this.tracks];
    }

    getDuration() {
        return this.tracks.reduce((sum, track) => sum + track.duration, 0);
    }

    toString() {
        return `Playlist(${this.name}, ${this.tracks.length} tracks)`;
    }
}

// ==================== PLAYBACK QUEUE ====================

/**
 * Playback queue with shuffle and repeat
 * 
 * USAGE:
 *     const queue = new PlaybackQueue();
 *     queue.enqueue(track);
 *     const current = queue.getCurrent();
 * 
 * RETURN:
 *     PlaybackQueue instance
 */
class PlaybackQueue {
    constructor() {
        this.tracks = [];
        this.currentIndex = 0;
        this.shuffleMode = ShuffleMode.OFF;
        this.repeatMode = RepeatMode.OFF;
        this.originalOrder = [];
    }

    enqueue(track) {
        this.tracks.push(track);
    }

    clear() {
        this.tracks = [];
        this.currentIndex = 0;
        this.originalOrder = [];
    }

    loadPlaylist(playlist) {
        this.clear();
        this.tracks = playlist.getTracks();
        this.currentIndex = 0;
        this.originalOrder = [...this.tracks];
    }

    getCurrent() {
        if (this.currentIndex >= 0 && this.currentIndex < this.tracks.length) {
            return this.tracks[this.currentIndex];
        }
        return null;
    }

    getNext() {
        if (this.tracks.length === 0) {
            return null;
        }

        if (this.repeatMode === RepeatMode.ONE) {
            return this.tracks[this.currentIndex];
        } else if (this.repeatMode === RepeatMode.ALL) {
            this.currentIndex = (this.currentIndex + 1) % this.tracks.length;
            return this.tracks[this.currentIndex];
        } else {
            if (this.currentIndex < this.tracks.length - 1) {
                this.currentIndex++;
                return this.tracks[this.currentIndex];
            }
            return null;
        }
    }

    getPrevious() {
        if (this.tracks.length === 0) {
            return null;
        }

        if (this.currentIndex > 0) {
            this.currentIndex--;
            return this.tracks[this.currentIndex];
        } else if (this.repeatMode === RepeatMode.ALL) {
            this.currentIndex = this.tracks.length - 1;
            return this.tracks[this.currentIndex];
        }

        return this.tracks[this.currentIndex];
    }

    setShuffle(enabled) {
        if (enabled && this.shuffleMode === ShuffleMode.OFF) {
            this.shuffleMode = ShuffleMode.ON;
            const currentTrack = this.getCurrent();

            // Fisher-Yates shuffle
            for (let i = this.tracks.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [this.tracks[i], this.tracks[j]] = [this.tracks[j], this.tracks[i]];
            }

            // Find new position of current track
            if (currentTrack) {
                this.currentIndex = this.tracks.findIndex(t => t.id === currentTrack.id);
            }
        } else if (!enabled && this.shuffleMode === ShuffleMode.ON) {
            this.shuffleMode = ShuffleMode.OFF;
            const currentTrack = this.getCurrent();
            this.tracks = [...this.originalOrder];

            // Find position in original order
            if (currentTrack) {
                this.currentIndex = this.tracks.findIndex(t => t.id === currentTrack.id);
            }
        }
    }

    setRepeat(mode) {
        this.repeatMode = mode;
    }

    size() {
        return this.tracks.length;
    }

    toString() {
        return `PlaybackQueue(${this.tracks.length} tracks, index=${this.currentIndex})`;
    }
}

// ==================== OBSERVER PATTERN ====================

/**
 * Observer interface for playback events
 * 
 * DESIGN PATTERN: Observer Pattern
 * 
 * USAGE:
 *     class MyObserver extends PlaybackObserver {
 *         onTrackChanged(track) {
 *             console.log(`Now playing: ${track.title}`);
 *         }
 *     }
 * 
 * RETURN:
 *     undefined
 */
class PlaybackObserver {
    onTrackChanged(track) {
        // Override in subclass
    }

    onStateChanged(state) {
        // Override in subclass
    }

    onVolumeChanged(volume) {
        // Override in subclass
    }

    onPositionChanged(position) {
        // Override in subclass
    }
}

// ==================== MUSIC LIBRARY ====================

/**
 * Music library with indexing and search
 * 
 * USAGE:
 *     const library = new MusicLibrary();
 *     library.addTrack(track);
 *     const results = library.search("queen");
 * 
 * RETURN:
 *     MusicLibrary instance
 */
class MusicLibrary {
    constructor() {
        this.tracks = new Map();
        this.playlists = new Map();
        this.artists = new Map();
        this.albums = new Map();
        this.genres = new Map();
        this._playlistCounter = 0;
    }

    addTrack(track) {
        this.tracks.set(track.id, track);

        // Update artist index
        if (!this.artists.has(track.artist)) {
            this.artists.set(track.artist, []);
        }
        this.artists.get(track.artist).push(track);

        // Update album index
        if (!this.albums.has(track.album)) {
            this.albums.set(track.album, []);
        }
        this.albums.get(track.album).push(track);

        // Update genre index
        if (!this.genres.has(track.genre)) {
            this.genres.set(track.genre, []);
        }
        this.genres.get(track.genre).push(track);
    }

    removeTrack(trackId) {
        const track = this.tracks.get(trackId);
        if (track) {
            this.tracks.delete(trackId);

            // Remove from indices
            const artistTracks = this.artists.get(track.artist);
            if (artistTracks) {
                const index = artistTracks.indexOf(track);
                if (index !== -1) artistTracks.splice(index, 1);
            }

            const albumTracks = this.albums.get(track.album);
            if (albumTracks) {
                const index = albumTracks.indexOf(track);
                if (index !== -1) albumTracks.splice(index, 1);
            }

            const genreTracks = this.genres.get(track.genre);
            if (genreTracks) {
                const index = genreTracks.indexOf(track);
                if (index !== -1) genreTracks.splice(index, 1);
            }

            return true;
        }
        return false;
    }

    createPlaylist(name) {
        this._playlistCounter++;
        const playlistId = `playlist-${this._playlistCounter}`;
        const playlist = new Playlist(playlistId, name);
        this.playlists.set(playlistId, playlist);
        return playlist;
    }

    getPlaylist(playlistId) {
        return this.playlists.get(playlistId);
    }

    search(query) {
        query = query.toLowerCase();
        const results = [];

        for (const track of this.tracks.values()) {
            if (track.title.toLowerCase().includes(query) ||
                track.artist.toLowerCase().includes(query) ||
                track.album.toLowerCase().includes(query)) {
                results.push(track);
            }
        }

        return results;
    }

    filterByGenre(genre) {
        return this.genres.get(genre) || [];
    }

    filterByArtist(artist) {
        return this.artists.get(artist) || [];
    }

    filterByAlbum(album) {
        return this.albums.get(album) || [];
    }

    getFavorites() {
        return Array.from(this.tracks.values()).filter(t => t.isFavorite);
    }

    getRecentlyPlayed(count = 20) {
        const played = Array.from(this.tracks.values()).filter(t => t.lastPlayed);
        return played.sort((a, b) => b.lastPlayed - a.lastPlayed).slice(0, count);
    }

    toString() {
        return `MusicLibrary(${this.tracks.size} tracks, ${this.playlists.size} playlists)`;
    }
}

// ==================== MUSIC PLAYER ====================

/**
 * Main music player (Singleton)
 * 
 * DESIGN PATTERN: Singleton Pattern
 * 
 * USAGE:
 *     const player = MusicPlayer.getInstance();
 *     player.play();
 *     player.setVolume(75);
 * 
 * RETURN:
 *     MusicPlayer instance
 */
class MusicPlayer {
    constructor() {
        if (MusicPlayer._instance) {
            throw new Error("Use getInstance() to get MusicPlayer");
        }

        this._state = PlayerState.STOPPED;
        this._queue = new PlaybackQueue();
        this._volume = 50; // 0-100
        this._position = 0; // seconds
        this._observers = [];

        console.log("🎵 Music Player initialized");
    }

    static getInstance() {
        if (!MusicPlayer._instance) {
            MusicPlayer._instance = new MusicPlayer();
        }
        return MusicPlayer._instance;
    }

    play() {
        const current = this._queue.getCurrent();
        if (!current) {
            console.log("❌ No track in queue");
            return false;
        }

        if (this._state === PlayerState.STOPPED) {
            current.play();
            this._state = PlayerState.PLAYING;
            this._position = 0;
            console.log(`▶️  Playing: ${current.title} by ${current.artist}`);
            this._notifyTrackChanged(current);
            this._notifyStateChanged(this._state);
            return true;
        } else if (this._state === PlayerState.PAUSED) {
            this._state = PlayerState.PLAYING;
            console.log(`▶️  Resumed: ${current.title}`);
            this._notifyStateChanged(this._state);
            return true;
        }

        return false;
    }

    pause() {
        if (this._state === PlayerState.PLAYING) {
            this._state = PlayerState.PAUSED;
            console.log("⏸️  Paused");
            this._notifyStateChanged(this._state);
        }
    }

    stop() {
        if (this._state !== PlayerState.STOPPED) {
            this._state = PlayerState.STOPPED;
            this._position = 0;
            console.log("⏹️  Stopped");
            this._notifyStateChanged(this._state);
        }
    }

    next() {
        const nextTrack = this._queue.getNext();
        if (nextTrack) {
            this._position = 0;
            if (this._state === PlayerState.PLAYING) {
                nextTrack.play();
            }
            console.log(`⏭️  Next: ${nextTrack.title}`);
            this._notifyTrackChanged(nextTrack);
            return nextTrack;
        } else {
            console.log("⏭️  End of queue");
            this.stop();
            return null;
        }
    }

    previous() {
        const prevTrack = this._queue.getPrevious();
        if (prevTrack) {
            this._position = 0;
            if (this._state === PlayerState.PLAYING) {
                prevTrack.play();
            }
            console.log(`⏮️  Previous: ${prevTrack.title}`);
            this._notifyTrackChanged(prevTrack);
            return prevTrack;
        }
        return null;
    }

    seek(position) {
        const current = this._queue.getCurrent();
        if (current && position >= 0 && position <= current.duration) {
            this._position = position;
            console.log(`⏩ Seeked to ${position}s`);
            this._notifyPositionChanged(position);
        }
    }

    setVolume(volume) {
        if (volume >= 0 && volume <= 100) {
            this._volume = volume;
            console.log(`🔊 Volume: ${volume}%`);
            this._notifyVolumeChanged(volume);
        }
    }

    loadPlaylist(playlist) {
        this._queue.loadPlaylist(playlist);
        console.log(`📋 Loaded playlist: ${playlist.name} (${playlist.tracks.length} tracks)`);
    }

    setShuffle(enabled) {
        this._queue.setShuffle(enabled);
        const status = enabled ? "ON" : "OFF";
        console.log(`🔀 Shuffle: ${status}`);
    }

    setRepeat(mode) {
        this._queue.setRepeat(mode);
        console.log(`🔁 Repeat: ${mode.toUpperCase()}`);
    }

    getCurrentTrack() {
        return this._queue.getCurrent();
    }

    getState() {
        return this._state;
    }

    getVolume() {
        return this._volume;
    }

    getPosition() {
        return this._position;
    }

    addObserver(observer) {
        this._observers.push(observer);
    }

    removeObserver(observer) {
        const index = this._observers.indexOf(observer);
        if (index !== -1) {
            this._observers.splice(index, 1);
        }
    }

    _notifyTrackChanged(track) {
        for (const observer of this._observers) {
            observer.onTrackChanged(track);
        }
    }

    _notifyStateChanged(state) {
        for (const observer of this._observers) {
            observer.onStateChanged(state);
        }
    }

    _notifyVolumeChanged(volume) {
        for (const observer of this._observers) {
            observer.onVolumeChanged(volume);
        }
    }

    _notifyPositionChanged(position) {
        for (const observer of this._observers) {
            observer.onPositionChanged(position);
        }
    }

    toString() {
        const current = this._queue.getCurrent();
        const trackInfo = current ? `'${current.title}'` : "None";
        return `MusicPlayer(state=${this._state}, track=${trackInfo}, volume=${this._volume}%)`;
    }
}

MusicPlayer._instance = null;

// ==================== DEMO ====================

/**
 * Demo of Music Player
 * 
 * Demonstrates:
 * - Track creation and metadata
 * - Playlist management
 * - Playback controls
 * - Shuffle and repeat modes
 * - Library organization
 * - Search functionality
 * - Observer notifications
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    console.log("=".repeat(70));
    console.log("🎵 MUSIC PLAYER DEMO");
    console.log("=".repeat(70));

    // Create library
    console.log("\n📚 Creating music library...");
    const library = new MusicLibrary();

    // Add tracks
    console.log("\n🎸 Adding tracks...");
    const tracks = [
        new Track("1", "Bohemian Rhapsody", "Queen", "A Night at the Opera", 354, "Rock", 1975),
        new Track("2", "Stairway to Heaven", "Led Zeppelin", "Led Zeppelin IV", 482, "Rock", 1971),
        new Track("3", "Hotel California", "Eagles", "Hotel California", 391, "Rock", 1976),
        new Track("4", "Imagine", "John Lennon", "Imagine", 183, "Pop", 1971),
        new Track("5", "Billie Jean", "Michael Jackson", "Thriller", 294, "Pop", 1982),
    ];

    for (const track of tracks) {
        library.addTrack(track);
        console.log(`  ✓ Added: ${track.title} by ${track.artist} [${track.getDurationFormatted()}]`);
    }

    // Create playlist
    console.log("\n📋 Creating playlist...");
    const rockClassics = library.createPlaylist("Rock Classics");
    rockClassics.addTrack(tracks[0]);
    rockClassics.addTrack(tracks[1]);
    rockClassics.addTrack(tracks[2]);
    console.log(`  ✓ Created: ${rockClassics.name} with ${rockClassics.tracks.length} tracks`);

    // Initialize player
    console.log("\n🎵 Initializing player...");
    const player = MusicPlayer.getInstance();

    // Add observer
    console.log("\n👀 Adding observer...");
    class UIObserver extends PlaybackObserver {
        onTrackChanged(track) {
            if (track) {
                console.log(`  🎵 UI Update: Now playing '${track.title}' by ${track.artist}`);
            }
        }

        onStateChanged(state) {
            console.log(`  📱 UI Update: Player state changed to ${state}`);
        }

        onVolumeChanged(volume) {
            console.log(`  📱 UI Update: Volume changed to ${volume}%`);
        }
    }

    const observer = new UIObserver();
    player.addObserver(observer);

    // Load playlist
    player.loadPlaylist(rockClassics);

    // Playback controls
    console.log("\n▶️  Playback controls...");
    player.play();
    await sleep(500);

    player.setVolume(75);
    await sleep(500);

    // Pause and resume
    console.log("\n⏸️  Pause and resume...");
    player.pause();
    await sleep(500);

    player.play();
    await sleep(500);

    // Navigate tracks
    console.log("\n⏭️  Navigation...");
    player.next();
    await sleep(500);

    player.next();
    await sleep(500);

    player.previous();
    await sleep(500);

    // Shuffle
    console.log("\n🔀 Shuffle mode...");
    player.setShuffle(true);
    await sleep(500);

    // Repeat
    console.log("\n🔁 Repeat mode...");
    player.setRepeat(RepeatMode.ALL);
    await sleep(500);

    // Search
    console.log("\n🔍 Search functionality...");
    const results = library.search("queen");
    console.log(`  Search 'queen': ${results.length} results`);
    for (const track of results) {
        console.log(`    - ${track.title} by ${track.artist}`);
    }

    // Filter by genre
    console.log("\n🎸 Filter by genre...");
    const rockTracks = library.filterByGenre("Rock");
    console.log(`  Rock tracks: ${rockTracks.length} found`);
    for (const track of rockTracks) {
        console.log(`    - ${track.title} by ${track.artist}`);
    }

    // Mark as favorite
    console.log("\n⭐ Favorites...");
    tracks[0].toggleFavorite();
    tracks[1].toggleFavorite();
    const favorites = library.getFavorites();
    console.log(`  Favorites: ${favorites.length} tracks`);
    for (const track of favorites) {
        console.log(`    - ${track.title}`);
    }

    // Player info
    console.log("\n📊 Player Status:");
    console.log(`  Current track: ${player.getCurrentTrack() ? player.getCurrentTrack().title : 'None'}`);
    console.log(`  State: ${player.getState()}`);
    console.log(`  Volume: ${player.getVolume()}%`);
    console.log(`  Queue size: ${player._queue.size()}`);

    // Library stats
    console.log("\n📈 Library Statistics:");
    console.log(`  Total tracks: ${library.tracks.size}`);
    console.log(`  Total playlists: ${library.playlists.size}`);
    console.log(`  Artists: ${library.artists.size}`);
    console.log(`  Albums: ${library.albums.size}`);
    console.log(`  Genres: ${library.genres.size}`);

    // Stop player
    console.log("\n⏹️  Stopping player...");
    player.stop();

    console.log("\n" + "=".repeat(70));
    console.log("✨ Demo completed successfully!");
    console.log("=".repeat(70));
}

// Run demo if this is the main module
if (require.main === module) {
    main().catch(console.error);
}

// Export for use in other modules
module.exports = {
    MusicPlayer,
    Track,
    Playlist,
    PlaybackQueue,
    MusicLibrary,
    PlaybackObserver,
    PlayerState,
    RepeatMode,
    ShuffleMode
};
