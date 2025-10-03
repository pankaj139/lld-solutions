# Social Media Platform

## 🔗 Implementation Links

- **Python Implementation**: [python/social-media/main.py](python/social-media/main.py)
- **JavaScript Implementation**: [javascript/social-media/main.js](javascript/social-media/main.js)

## Problem Statement

Design a social media platform (like Facebook, Twitter) with user profiles, social connections (follow/unfollow), content sharing (posts), engagement features (likes, comments), and personalized news feed generation that scales to millions of users and billions of posts.

## Requirements

### Functional Requirements

- User registration and profile management
- Follow/unfollow other users
- Create and share posts (text, images, videos)
- Like and unlike posts
- Comment on posts (nested comments)
- Share/repost content
- Generate personalized news feed
- Search users and posts
- Direct messaging between users
- Notification system
- Privacy settings (public, friends, private)
- Block users
- Report inappropriate content

### Non-Functional Requirements

- Support 100 million+ users
- Handle 10,000 posts per second
- Feed generation < 500ms
- Real-time notifications
- 99.99% availability
- Scalable horizontally
- GDPR compliant
- Content moderation

## Design Decisions

### Key Classes

1. **User Management**
   - `User`: User profile and connections
   - `UserProfile`: Detailed user information
   - `Follow`: Follow relationship
   - `Block`: Blocked users

2. **Content Management**
   - `Post`: User-generated content
   - `Comment`: Post comments
   - `Like`: Like interactions
   - `Share`: Shared posts

3. **Feed Generation**
   - `NewsFeed`: Personalized feed
   - `FeedGenerator`: Feed creation algorithm
   - `FeedRanker`: Content ranking

4. **Engagement**
   - `Notification`: User notifications
   - `Activity`: User activity tracking
   - `Trending`: Trending topics

5. **Service Layer**
   - `SocialMediaService`: Main service (Singleton)
   - `UserService`: User operations
   - `PostService`: Post operations
   - `FeedService`: Feed generation

### Design Patterns Used

1. **Observer Pattern**: Follow system
   - Followers notified of new posts
   - Real-time activity updates
   - Event-driven notifications

2. **Strategy Pattern**: Feed algorithms
   - Chronological feed
   - Algorithmic ranking
   - Interest-based feed
   - Easy to switch strategies

3. **Factory Pattern**: Content creation
   - Different post types
   - Standardized creation
   - Validation

4. **Singleton Pattern**: Service instances
   - Single platform service
   - Resource management

5. **Composite Pattern**: Post with comments
   - Nested comment trees
   - Hierarchical structure
   - Recursive operations

6. **Repository Pattern**: Data access
   - User repository
   - Post repository
   - Clean abstraction

7. **Chain of Responsibility**: Content moderation
   - Multiple moderation filters
   - Escalation chain
   - Automated flagging

### Key Features

- **Personalized Feed**: AI-based content ranking
- **Real-Time Updates**: Live notifications
- **Rich Media**: Support for images, videos
- **Social Graph**: Efficient connection tracking
- **Trending Topics**: Popular content discovery

## State Diagram

```text
POST LIFECYCLE:

DRAFT
  ↓ (publish)
PUBLISHED
  ├─→ (engage) → [likes/comments added] → PUBLISHED
  ├─→ (report) → UNDER_REVIEW
  │                ↓ (approve)
  │              PUBLISHED
  │                ↓ (violates)
  │              REMOVED
  ├─→ (edit) → PUBLISHED (edited flag)
  └─→ (delete) → DELETED

USER CONNECTION:

STRANGER
  ↓ (follow_request)
PENDING (for private accounts)
  ↓ (approve)
FOLLOWING
  ↓ (unfollow)
STRANGER
```

## Class Diagram

```text
User
├── user_id: str
├── username: str
├── email: str
├── display_name: str
├── bio: str
├── followers: Set[str]
├── following: Set[str]
├── blocked: Set[str]
├── created_at: datetime
├── follow(user_id) → None
├── unfollow(user_id) → None
└── block(user_id) → None

Post
├── post_id: str
├── author: User
├── content: str
├── media_urls: List[str]
├── likes: Set[str]
├── comments: List[Comment]
├── shares: int
├── timestamp: datetime
├── visibility: Visibility
├── like(user_id) → None
├── add_comment(comment) → None
└── get_engagement() → Dict

Comment
├── comment_id: str
├── author: User
├── content: str
├── post_id: str
├── parent_id: Optional[str]
├── likes: Set[str]
├── timestamp: datetime
├── replies: List[Comment]
└── like(user_id) → None

NewsFeed
├── user: User
├── posts: List[Post]
├── last_updated: datetime
├── refresh() → None
└── load_more(offset, limit) → List[Post]

Notification
├── notification_id: str
├── user: User
├── type: NotificationType
├── content: str
├── related_user: Optional[User]
├── related_post: Optional[Post]
├── is_read: bool
├── created_at: datetime
└── mark_read() → None

SocialMediaService (Singleton)
├── users: Dict[str, User]
├── posts: Dict[str, Post]
├── feed_generator: FeedGenerator
├── register_user(user) → None
├── follow_user(follower_id, followee_id) → None
├── create_post(user_id, content) → Post
├── like_post(post_id, user_id) → None
├── add_comment(post_id, user_id, content) → Comment
├── get_feed(user_id, limit) → List[Post]
└── get_notifications(user_id) → List[Notification]

FeedGenerator (Strategy)
├── generate_feed(user, limit) → List[Post]
├── rank_posts(posts) → List[Post]
└── filter_content(posts, user) → List[Post]
```

## Usage Example

```python
# Initialize service
service = SocialMediaService()

# Register users
alice = User("U001", "alice")
bob = User("U002", "bob")
service.register_user(alice)
service.register_user(bob)

# Follow users
service.follow_user(alice.user_id, bob.user_id)

# Create post
post = service.create_post(bob.user_id, "Hello world!")

# Like post
post.like(alice.user_id)

# Add comment
comment = service.add_comment(
    post.post_id,
    alice.user_id,
    "Great post!"
)

# Get personalized feed
feed = service.get_feed(alice.user_id, limit=50)

# Get notifications
notifications = service.get_notifications(alice.user_id)
```

## Business Rules

1. **Connection Rules**
   - Cannot follow yourself
   - Follow requests for private accounts
   - Unfollow anytime without notification
   - Blocked users cannot see content

2. **Content Rules**
   - Posts have character limits (280 for short posts)
   - Media size limits (images < 5MB, videos < 100MB)
   - Inappropriate content auto-flagged
   - Edit history maintained

3. **Engagement Rules**
   - Cannot like own posts
   - Can unlike posts
   - Delete own comments anytime
   - Cannot edit others' comments

4. **Feed Rules**
   - Chronological for "Following" feed
   - Algorithmic ranking for "For You" feed
   - Block posts from blocked users
   - Filter based on privacy settings

5. **Privacy Rules**
   - Public: Anyone can see
   - Friends: Only followers can see
   - Private: Only approved followers
   - Anonymous viewing not allowed

## Extension Points

1. **Stories**: Ephemeral 24-hour content
2. **Live Streaming**: Real-time video broadcasts
3. **Polls**: Interactive polling
4. **Groups**: Community spaces
5. **Events**: Event management
6. **Marketplace**: Buy/sell functionality
7. **Gaming**: Social games integration
8. **AR Filters**: Augmented reality content

## Security Considerations

- **Authentication**: OAuth 2.0, MFA support
- **Data Privacy**: End-to-end encryption for DMs
- **Content Moderation**: AI-based filtering
- **Rate Limiting**: Prevent spam
- **GDPR Compliance**: Data export/deletion
- **Account Security**: Suspicious activity detection
- **CSRF Protection**: Token-based protection

## Time Complexity

- **Create Post**: O(1) for creation
- **Follow User**: O(1) for relationship
- **Like Post**: O(1) for like operation
- **Add Comment**: O(1) for add, O(c) for retrieval where c is comments
- **Generate Feed**: O(n log n) where n is potential posts (sorting)
- **Search Users**: O(log u) with indexing where u is users
- **Get Notifications**: O(k) where k is unread notifications

## Space Complexity

- O(u) for users where u is total users
- O(p) for posts where p is total posts
- O(c) for comments where c is total comments
- O(f) for follow relationships where f is total follows
- O(n) for notifications where n is active notifications
- O(feed) for cached feeds per user
