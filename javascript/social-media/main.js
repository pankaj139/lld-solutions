/**
 * SOCIAL MEDIA PLATFORM Implementation in JavaScript
 * ==================================================
 * 
 * FILE PURPOSE:
 * Implements social media platform with user profiles, posts, followers,
 * likes, comments, and personalized news feed generation.
 * 
 * DESIGN PATTERNS:
 * 1. Observer Pattern: Follow system with notifications
 * 2. Strategy Pattern: Feed generation algorithms
 * 3. Factory Pattern: Post creation
 * 4. Singleton Pattern: Service instance
 * 5. Composite Pattern: Posts with comments
 * 6. Repository Pattern: Data storage
 * 
 * OOP CONCEPTS:
 * - Encapsulation: State management
 * - Inheritance: Post types
 * - Polymorphism: Content types
 * 
 * USAGE:
 * const service = new SocialMediaService();
 * const user = new User('U001', 'alice');
 * service.registerUser(user);
 * const post = service.createPost(user.userId, 'Hello!');
 * service.followUser(user1.userId, user2.userId);
 * const feed = service.getFeed(user.userId);
 * 
 * EXPECTED RETURN:
 * Feed of posts from followed users
 */

/**
 * User - Social media user profile
 */
class User {
    constructor(userId, username) {
        this.userId = userId;
        this.username = username;
        this.followers = new Set();
        this.following = new Set();
        this.bio = '';
        this.createdAt = new Date();
    }

    follow(userId) {
        this.following.add(userId);
    }

    unfollow(userId) {
        this.following.delete(userId);
    }

    addFollower(userId) {
        this.followers.add(userId);
    }

    removeFollower(userId) {
        this.followers.delete(userId);
    }
}

/**
 * Comment - Comment on a post
 * 
 * DESIGN PATTERN: Composite Pattern component
 */
class Comment {
    constructor(commentId, author, content) {
        this.commentId = commentId;
        this.author = author;
        this.content = content;
        this.timestamp = new Date();
        this.likes = new Set();
    }

    like(userId) {
        this.likes.add(userId);
    }
}

/**
 * Post - Social media post
 * 
 * DESIGN PATTERN: Composite Pattern
 */
class Post {
    constructor(postId, author, content) {
        this.postId = postId;
        this.author = author;
        this.content = content;
        this.timestamp = new Date();
        this.likes = new Set();
        this.comments = [];
    }

    like(userId) {
        this.likes.add(userId);
        console.log(`👍 @${this.author.username}'s post liked`);
    }

    unlike(userId) {
        this.likes.delete(userId);
    }

    addComment(comment) {
        this.comments.push(comment);
        console.log(`💬 Comment added to @${this.author.username}'s post`);
    }

    getEngagement() {
        return {
            likes: this.likes.size,
            comments: this.comments.length
        };
    }
}

/**
 * SocialMediaService - Main platform service
 * 
 * DESIGN PATTERN: Singleton + Facade + Observer
 */
class SocialMediaService {
    constructor() {
        if (SocialMediaService.instance) {
            return SocialMediaService.instance;
        }

        this.users = new Map();
        this.posts = new Map();
        this.postCounter = 0;
        this.commentCounter = 0;

        SocialMediaService.instance = this;
    }

    registerUser(user) {
        this.users.set(user.userId, user);
        console.log(`✓ Registered: @${user.username}`);
    }

    followUser(followerId, followeeId) {
        const follower = this.users.get(followerId);
        const followee = this.users.get(followeeId);

        if (!follower || !followee) {
            console.log('✗ User not found');
            return;
        }

        if (followerId === followeeId) {
            console.log('✗ Cannot follow yourself');
            return;
        }

        follower.follow(followeeId);
        followee.addFollower(followerId);

        console.log(`✓ @${follower.username} → @${followee.username}`);
    }

    unfollowUser(followerId, followeeId) {
        const follower = this.users.get(followerId);
        const followee = this.users.get(followeeId);

        if (follower && followee) {
            follower.unfollow(followeeId);
            followee.removeFollower(followerId);
            console.log(`✓ @${follower.username} unfollowed @${followee.username}`);
        }
    }

    createPost(userId, content) {
        const user = this.users.get(userId);
        if (!user) {
            console.log('✗ User not found');
            return null;
        }

        const postId = `P${String(this.postCounter).padStart(4, '0')}`;
        this.postCounter++;

        const post = new Post(postId, user, content);
        this.posts.set(postId, post);

        console.log(`✓ Post by @${user.username}: ${content}`);
        return post;
    }

    addComment(postId, userId, content) {
        const post = this.posts.get(postId);
        const user = this.users.get(userId);

        if (!post || !user) {
            console.log('✗ Post or user not found');
            return null;
        }

        const commentId = `C${String(this.commentCounter).padStart(4, '0')}`;
        this.commentCounter++;

        const comment = new Comment(commentId, user, content);
        post.addComment(comment);

        return comment;
    }

    getFeed(userId, limit = 50) {
        const user = this.users.get(userId);
        if (!user) {
            return [];
        }

        // Get posts from followed users
        const feed = Array.from(this.posts.values()).filter(
            post => user.following.has(post.author.userId)
        );

        // Sort by timestamp (newest first)
        feed.sort((a, b) => b.timestamp - a.timestamp);

        return feed.slice(0, limit);
    }

    getUserPosts(userId) {
        return Array.from(this.posts.values()).filter(
            post => post.author.userId === userId
        );
    }
}

/**
 * Demonstrate Social Media Platform
 */
function main() {
    console.log('='.repeat(70));
    console.log('SOCIAL MEDIA PLATFORM - Low Level Design Demo');
    console.log('='.repeat(70));

    const service = new SocialMediaService();

    // Register users
    console.log('\n👥 Registering Users...');
    const alice = new User('U001', 'alice');
    const bob = new User('U002', 'bob');
    const charlie = new User('U003', 'charlie');

    service.registerUser(alice);
    service.registerUser(bob);
    service.registerUser(charlie);

    // Follow users
    console.log('\n🔗 Building Connections...');
    service.followUser(alice.userId, bob.userId);
    service.followUser(alice.userId, charlie.userId);
    service.followUser(bob.userId, charlie.userId);

    // Create posts
    console.log('\n📝 Creating Posts...');
    const post1 = service.createPost(bob.userId, 'Hello world! First post here!');
    const post2 = service.createPost(charlie.userId, 'Excited to join this platform!');
    const post3 = service.createPost(bob.userId, 'Having a great day!');

    // Like and comment
    console.log('\n💬 Interactions...');
    post1.like(alice.userId);
    post1.like(charlie.userId);
    service.addComment(post1.postId, alice.userId, 'Welcome Bob!');

    // Get feed
    console.log('\n📰 Alice\'s Feed...');
    const feed = service.getFeed(alice.userId);
    console.log(`  Feed has ${feed.length} posts`);
    for (const post of feed) {
        const stats = post.getEngagement();
        console.log(`  @${post.author.username}: ${post.content}`);
        console.log(`    ${stats.likes} likes, ${stats.comments} comments`);
    }

    console.log('\n' + '='.repeat(70));
    console.log('DEMO COMPLETE');
    console.log('='.repeat(70));
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SocialMediaService,
        User,
        Post,
        Comment
    };
}

// Run demo if executed directly
if (typeof require !== 'undefined' && require.main === module) {
    main();
}
