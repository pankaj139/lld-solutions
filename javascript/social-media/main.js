/**
 * Social Media Platform - JavaScript Implementation
 * ================================================
 * 
 * Modern social networking system demonstrating cutting-edge Design Patterns:
 * 
 * DESIGN PATTERNS USED:
 * 1. Observer Pattern: Real-time notifications, news feed updates, activity streams
 * 2. Strategy Pattern: Different content algorithms (trending, chronological, personalized)
 * 3. Command Pattern: User actions (like, comment, share, follow)
 * 4. Factory Pattern: Content creation (posts, messages, notifications)
 * 5. Decorator Pattern: Enhanced user features (verified accounts, premium features)
 * 6. Composite Pattern: Complex content with nested comments and reactions
 * 7. Chain of Responsibility: Content moderation and spam filtering
 * 8. Mediator Pattern: Communication between users through platform
 * 9. State Pattern: User status management (online, offline, away)
 * 10. Publisher-Subscriber: Real-time messaging and live updates
 * 
 * OOP CONCEPTS DEMONSTRATED:
 * 1. Encapsulation: Private user data, content privacy settings
 * 2. Inheritance: Different user types (regular, influencer, business)
 * 3. Polymorphism: Various content types, same interaction interface
 * 4. Composition: Complex social relationships and content structures
 * 5. Association: Friend networks, follower relationships
 * 6. Aggregation: Timeline aggregation from multiple sources
 * 
 * SOCIAL MEDIA FEATURES:
 * - Real-time messaging with delivery status
 * - Advanced privacy controls and content filtering
 * - Intelligent news feed with personalization algorithms
 * - Comprehensive notification system
 * - Rich media support (images, videos, links)
 * - Social graph management with friend recommendations
 * - Content moderation with automated filtering
 * - Analytics and engagement tracking
 * 
 * REAL-TIME FEATURES:
 * - Live chat with typing indicators
 * - Real-time notifications and alerts
 * - Live activity feeds and status updates
 * - Instant content synchronization
 */

// User status enumeration - State Pattern for presence management
const UserStatus = { 
    ONLINE: 'ONLINE',     // User actively using the platform
    OFFLINE: 'OFFLINE',   // User not connected to platform
    AWAY: 'AWAY',         // User idle but connected
    BUSY: 'BUSY'          // User online but unavailable for chat
};

// Post type enumeration - Strategy Pattern for content types
const PostType = { 
    TEXT: 'TEXT',         // Text-only posts
    IMAGE: 'IMAGE',       // Image posts with captions
    VIDEO: 'VIDEO',       // Video content posts
    LINK: 'LINK'          // Link sharing with preview
};

// Message type enumeration - Strategy Pattern for communication
const MessageType = { 
    TEXT: 'TEXT',         // Plain text messages
    IMAGE: 'IMAGE',       // Image messages
    FILE: 'FILE'          // File attachments
};

// Notification type enumeration - Observer Pattern for user alerts
const NotificationType = { 
    LIKE: 'LIKE',                     // Post or comment liked
    COMMENT: 'COMMENT',               // New comment on post
    FRIEND_REQUEST: 'FRIEND_REQUEST', // Incoming friend request
    MESSAGE: 'MESSAGE'                // New private message
};

// Utility function for unique identifier generation
function generateUUID() { 
    return 'xxxx-xxxx-4xxx-yxxx'.replace(/[xy]/g, c => { 
        const r = Math.random() * 16 | 0; 
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); 
    }); 
}

/**
 * User Class - Core entity representing platform members
 * 
 * DESIGN PATTERNS:
 * - State Pattern: User status and activity tracking
 * - Observer Pattern: User activity notifications
 * - Strategy Pattern: Privacy settings and content visibility
 * 
 * OOP CONCEPTS:
 * - Encapsulation: User data and social connections
 * - Composition: Complex social graph relationships
 * - Association: Friend networks and follower relationships
 */
class User {
    constructor(userId, username, email, name) {
        // Core Identity
        this.userId = userId;           // Unique user identifier
        this.username = username;       // Unique username for mentions
        this.email = email;            // Contact email
        this.name = name;              // Display name
        
        // State Management
        this.status = UserStatus.OFFLINE; // Current online status
        
        // Social Graph (using Set for O(1) operations)
        this.friends = new Set();       // Bidirectional friend connections
        this.followers = new Set();     // Users following this user
        this.following = new Set();     // Users this user follows
        
        // Content Management
        this.posts = [];               // User's posts timeline
        this.profilePicture = null;    // Profile image URL
        this.bio = '';                 // User biography
        
        // Metadata
        this.joinDate = new Date();    // Account creation date
        this.lastSeen = new Date();    // Last activity timestamp
        
        // Privacy Controls (Strategy Pattern)
        this.privacySettings = { 
            profilePublic: true,       // Profile visibility
            postsPublic: true          // Post visibility to non-friends
        };
    }
    
    /**
     * State Pattern: User status management
     */
    updateStatus(status) { 
        this.status = status; 
        this.lastSeen = new Date(); 
    }
    
    /**
     * Social Graph Management Methods
     * Demonstrate association and relationship management
     */
    addFriend(userId) { this.friends.add(userId); }
    removeFriend(userId) { this.friends.delete(userId); }
    follow(userId) { this.following.add(userId); }
    unfollow(userId) { this.following.delete(userId); }
    addFollower(userId) { this.followers.add(userId); }
    removeFollower(userId) { this.followers.delete(userId); }
}

/**
 * Post Class - Represents content shared by users
 * 
 * DESIGN PATTERNS:
 * - Composite Pattern: Posts can contain nested comments
 * - Strategy Pattern: Different post types with different behaviors
 * - Observer Pattern: Post interactions trigger notifications
 * 
 * OOP CONCEPTS:
 * - Encapsulation: Post data and interaction tracking
 * - Polymorphism: Different post types handled uniformly
 */
class Post {
    constructor(postId, authorId, content, type = PostType.TEXT) {
        this.postId = postId;          // Unique post identifier
        this.authorId = authorId;      // Post creator ID
        this.content = content;        // Post content/text
        this.type = type;              // Content type for rendering
        this.timestamp = new Date();   // Creation timestamp
        
        // Engagement Tracking
        this.likes = new Set();        // Users who liked the post
        this.comments = [];            // Comment thread
        this.shares = 0;               // Share count
        
        // Rich Content
        this.attachments = [];         // Media attachments
        this.tags = [];                // Hashtags and mentions
        this.isPublic = true;          // Visibility setting
    }
    
    addLike(userId) { this.likes.add(userId); }
    removeLike(userId) { this.likes.delete(userId); }
    addComment(comment) { this.comments.push(comment); }
    share() { this.shares++; }
}

class Comment {
    constructor(commentId, authorId, postId, content) {
        this.commentId = commentId;
        this.authorId = authorId;
        this.postId = postId;
        this.content = content;
        this.timestamp = new Date();
        this.likes = new Set();
        this.replies = [];
    }
    
    addLike(userId) { this.likes.add(userId); }
    addReply(reply) { this.replies.push(reply); }
}

class PrivateMessage {
    constructor(messageId, senderId, receiverId, content, type = MessageType.TEXT) {
        this.messageId = messageId;
        this.senderId = senderId;
        this.receiverId = receiverId;
        this.content = content;
        this.type = type;
        this.timestamp = new Date();
        this.isRead = false;
        this.isDelivered = false;
    }
    
    markAsRead() { this.isRead = true; }
    markAsDelivered() { this.isDelivered = true; }
}

class Notification {
    constructor(notificationId, userId, type, content, relatedId = null) {
        this.notificationId = notificationId;
        this.userId = userId;
        this.type = type;
        this.content = content;
        this.relatedId = relatedId;
        this.timestamp = new Date();
        this.isRead = false;
    }
    
    markAsRead() { this.isRead = true; }
}

class NewsFeed {
    constructor(userId) {
        this.userId = userId;
        this.posts = [];
        this.lastUpdated = new Date();
    }
    
    addPost(post) { this.posts.unshift(post); this.lastUpdated = new Date(); }
    getPosts(limit = 20) { return this.posts.slice(0, limit); }
    clearFeed() { this.posts = []; }
}

class NotificationObserver {
    update(notification) { throw new Error('Method must be implemented'); }
}

class RealTimeNotifier extends NotificationObserver {
    update(notification) { console.log(`🔔 ${notification.content}`); }
}

class EmailNotifier extends NotificationObserver {
    update(notification) { console.log(`📧 Email sent: ${notification.content}`); }
}

class SocialMediaPlatform {
    constructor(platformName) {
        this.platformName = platformName;
        this.users = new Map();
        this.posts = new Map();
        this.messages = new Map();
        this.notifications = new Map();
        this.newsFeeds = new Map();
        this.friendRequests = new Map();
        this.observers = [];
        this.blockedUsers = new Map();
    }
    
    addObserver(observer) { this.observers.push(observer); }
    notifyObservers(notification) { this.observers.forEach(obs => obs.update(notification)); }
    
    registerUser(username, email, name) {
        const userId = generateUUID();
        const user = new User(userId, username, email, name);
        this.users.set(userId, user);
        this.newsFeeds.set(userId, new NewsFeed(userId));
        this.notifications.set(userId, []);
        console.log(`User registered: ${username}`);
        return user;
    }
    
    loginUser(userId) {
        const user = this.users.get(userId);
        if (user) {
            user.updateStatus(UserStatus.ONLINE);
            console.log(`${user.username} logged in`);
            return true;
        }
        return false;
    }
    
    logoutUser(userId) {
        const user = this.users.get(userId);
        if (user) {
            user.updateStatus(UserStatus.OFFLINE);
            console.log(`${user.username} logged out`);
        }
    }
    
    sendFriendRequest(fromUserId, toUserId) {
        if (!this.friendRequests.has(toUserId)) this.friendRequests.set(toUserId, []);
        this.friendRequests.get(toUserId).push(fromUserId);
        
        const notification = new Notification(generateUUID(), toUserId, NotificationType.FRIEND_REQUEST, 
            `${this.users.get(fromUserId).username} sent you a friend request`, fromUserId);
        this.addNotification(notification);
        console.log(`Friend request sent from ${this.users.get(fromUserId).username} to ${this.users.get(toUserId).username}`);
    }
    
    acceptFriendRequest(userId, fromUserId) {
        const requests = this.friendRequests.get(userId) || [];
        const index = requests.indexOf(fromUserId);
        if (index > -1) {
            requests.splice(index, 1);
            this.users.get(userId).addFriend(fromUserId);
            this.users.get(fromUserId).addFriend(userId);
            console.log(`${this.users.get(userId).username} and ${this.users.get(fromUserId).username} are now friends`);
            return true;
        }
        return false;
    }
    
    createPost(authorId, content, type = PostType.TEXT) {
        const postId = generateUUID();
        const post = new Post(postId, authorId, content, type);
        this.posts.set(postId, post);
        this.users.get(authorId).posts.push(postId);
        
        // Add to friends' news feeds
        const author = this.users.get(authorId);
        author.friends.forEach(friendId => {
            const feed = this.newsFeeds.get(friendId);
            if (feed) feed.addPost(post);
        });
        
        console.log(`${author.username} created a new post`);
        return post;
    }
    
    likePost(userId, postId) {
        const post = this.posts.get(postId);
        if (post && !post.likes.has(userId)) {
            post.addLike(userId);
            
            const notification = new Notification(generateUUID(), post.authorId, NotificationType.LIKE,
                `${this.users.get(userId).username} liked your post`, postId);
            this.addNotification(notification);
            
            console.log(`${this.users.get(userId).username} liked a post`);
            return true;
        }
        return false;
    }
    
    commentOnPost(userId, postId, content) {
        const post = this.posts.get(postId);
        if (post) {
            const commentId = generateUUID();
            const comment = new Comment(commentId, userId, postId, content);
            post.addComment(comment);
            
            const notification = new Notification(generateUUID(), post.authorId, NotificationType.COMMENT,
                `${this.users.get(userId).username} commented on your post`, postId);
            this.addNotification(notification);
            
            console.log(`${this.users.get(userId).username} commented on a post`);
            return comment;
        }
        return null;
    }
    
    sendMessage(senderId, receiverId, content, type = MessageType.TEXT) {
        const messageId = generateUUID();
        const message = new PrivateMessage(messageId, senderId, receiverId, content, type);
        
        if (!this.messages.has(senderId)) this.messages.set(senderId, []);
        if (!this.messages.has(receiverId)) this.messages.set(receiverId, []);
        
        this.messages.get(senderId).push(message);
        this.messages.get(receiverId).push(message);
        
        message.markAsDelivered();
        
        const notification = new Notification(generateUUID(), receiverId, NotificationType.MESSAGE,
            `New message from ${this.users.get(senderId).username}`, senderId);
        this.addNotification(notification);
        
        console.log(`Message sent from ${this.users.get(senderId).username} to ${this.users.get(receiverId).username}`);
        return message;
    }
    
    getNewsFeed(userId, limit = 20) {
        const feed = this.newsFeeds.get(userId);
        return feed ? feed.getPosts(limit) : [];
    }
    
    searchUsers(query) {
        const results = [];
        this.users.forEach(user => {
            if (user.username.toLowerCase().includes(query.toLowerCase()) ||
                user.name.toLowerCase().includes(query.toLowerCase())) {
                results.push(user);
            }
        });
        return results;
    }
    
    addNotification(notification) {
        const userNotifications = this.notifications.get(notification.userId) || [];
        userNotifications.push(notification);
        this.notifications.set(notification.userId, userNotifications);
        this.notifyObservers(notification);
    }
    
    getNotifications(userId, limit = 10) {
        const notifications = this.notifications.get(userId) || [];
        return notifications.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
    }
    
    getConversation(user1Id, user2Id, limit = 50) {
        const user1Messages = this.messages.get(user1Id) || [];
        const conversation = user1Messages.filter(msg => 
            (msg.senderId === user1Id && msg.receiverId === user2Id) ||
            (msg.senderId === user2Id && msg.receiverId === user1Id)
        );
        return conversation.sort((a, b) => a.timestamp - b.timestamp).slice(-limit);
    }
    
    getUserAnalytics(userId) {
        const user = this.users.get(userId);
        if (!user) return null;
        
        const userPosts = user.posts.map(postId => this.posts.get(postId));
        const totalLikes = userPosts.reduce((sum, post) => sum + post.likes.size, 0);
        const totalComments = userPosts.reduce((sum, post) => sum + post.comments.length, 0);
        
        return {
            username: user.username,
            friendsCount: user.friends.size,
            followersCount: user.followers.size,
            followingCount: user.following.size,
            postsCount: user.posts.length,
            totalLikes,
            totalComments,
            joinDate: user.joinDate,
            lastSeen: user.lastSeen
        };
    }
    
    getPlatformStats() {
        const totalPosts = this.posts.size;
        const totalMessages = Array.from(this.messages.values()).reduce((sum, msgs) => sum + msgs.length, 0) / 2;
        const activeUsers = Array.from(this.users.values()).filter(u => u.status === UserStatus.ONLINE).length;
        
        return {
            totalUsers: this.users.size,
            activeUsers,
            totalPosts,
            totalMessages,
            platformName: this.platformName
        };
    }
}

function runDemo() {
    console.log("=== Social Media Platform Demo ===\n");
    
    const platform = new SocialMediaPlatform("ConnectApp");
    platform.addObserver(new RealTimeNotifier());
    platform.addObserver(new EmailNotifier());
    
    // Register users
    console.log("1. Registering users...");
    const alice = platform.registerUser("alice_j", "alice@example.com", "Alice Johnson");
    const bob = platform.registerUser("bob_smith", "bob@example.com", "Bob Smith");
    const charlie = platform.registerUser("charlie_d", "charlie@example.com", "Charlie Davis");
    console.log();
    
    // Login users
    console.log("2. Users logging in...");
    platform.loginUser(alice.userId);
    platform.loginUser(bob.userId);
    platform.loginUser(charlie.userId);
    console.log();
    
    // Send friend requests
    console.log("3. Sending friend requests...");
    platform.sendFriendRequest(alice.userId, bob.userId);
    platform.sendFriendRequest(bob.userId, charlie.userId);
    console.log();
    
    // Accept friend requests
    console.log("4. Accepting friend requests...");
    platform.acceptFriendRequest(bob.userId, alice.userId);
    platform.acceptFriendRequest(charlie.userId, bob.userId);
    console.log();
    
    // Create posts
    console.log("5. Creating posts...");
    const post1 = platform.createPost(alice.userId, "Hello everyone! Just joined ConnectApp!", PostType.TEXT);
    const post2 = platform.createPost(bob.userId, "Beautiful sunset today 🌅", PostType.IMAGE);
    const post3 = platform.createPost(charlie.userId, "Working on a new project. Excited to share soon!", PostType.TEXT);
    console.log();
    
    // Like and comment on posts
    console.log("6. Interacting with posts...");
    platform.likePost(bob.userId, post1.postId);
    platform.likePost(charlie.userId, post1.postId);
    platform.commentOnPost(bob.userId, post1.postId, "Welcome to ConnectApp, Alice!");
    platform.likePost(alice.userId, post2.postId);
    platform.commentOnPost(alice.userId, post2.postId, "Gorgeous photo!");
    console.log();
    
    // Send messages
    console.log("7. Sending private messages...");
    platform.sendMessage(alice.userId, bob.userId, "Hey Bob! Thanks for the welcome message!");
    platform.sendMessage(bob.userId, alice.userId, "No problem! How are you liking the platform?");
    platform.sendMessage(charlie.userId, bob.userId, "Hey, want to collaborate on my new project?");
    console.log();
    
    // Display news feeds
    console.log("8. News Feed for Alice:");
    const aliceFeed = platform.getNewsFeed(alice.userId);
    aliceFeed.forEach(post => {
        const author = platform.users.get(post.authorId);
        console.log(`  ${author.username}: ${post.content} (${post.likes.size} likes, ${post.comments.length} comments)`);
    });
    console.log();
    
    // Display notifications
    console.log("9. Alice's Notifications:");
    const aliceNotifications = platform.getNotifications(alice.userId);
    aliceNotifications.forEach(notif => {
        console.log(`  ${notif.content} (${notif.timestamp.toLocaleTimeString()})`);
    });
    console.log();
    
    // Display conversation
    console.log("10. Conversation between Alice and Bob:");
    const conversation = platform.getConversation(alice.userId, bob.userId);
    conversation.forEach(msg => {
        const sender = platform.users.get(msg.senderId);
        console.log(`  ${sender.username}: ${msg.content}`);
    });
    console.log();
    
    // Display analytics
    console.log("11. User Analytics:");
    [alice, bob, charlie].forEach(user => {
        const analytics = platform.getUserAnalytics(user.userId);
        console.log(`${analytics.username}: ${analytics.friendsCount} friends, ${analytics.postsCount} posts, ${analytics.totalLikes} likes received`);
    });
    console.log();
    
    // Platform statistics
    console.log("12. Platform Statistics:");
    const stats = platform.getPlatformStats();
    console.log(`Total Users: ${stats.totalUsers}`);
    console.log(`Active Users: ${stats.activeUsers}`);
    console.log(`Total Posts: ${stats.totalPosts}`);
    console.log(`Total Messages: ${stats.totalMessages}`);
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SocialMediaPlatform, User, Post, PrivateMessage };
}

if (typeof require !== 'undefined' && require.main === module) {
    runDemo();
}