"""
SOCIAL MEDIA PLATFORM - Low Level Design Implementation in Python

FILE PURPOSE:
This file implements a social media platform with user profiles, posts,
followers, likes, comments, and personalized news feed generation.

DESIGN PATTERNS USED:
1. OBSERVER PATTERN: Follow system
   - Followers notified of new posts
   - Activity feed updates
   
2. STRATEGY PATTERN: Feed generation algorithms
   - Chronological feed
   - Algorithmic ranking possible
   
3. FACTORY PATTERN: Post creation
   - Different post types
   - Standardized instantiation
   
4. SINGLETON PATTERN: SocialMediaService
   - Single platform instance
   
5. COMPOSITE PATTERN: Post with comments
   - Posts contain comment trees
   
6. REPOSITORY PATTERN: User/Post storage
   - Data access abstraction

OOP CONCEPTS:
- Encapsulation: Internal state management
- Inheritance: Different post types possible
- Polymorphism: Different content types

SOLID PRINCIPLES:
- SRP: Each class single responsibility
- OCP: Easy to extend with new features
- LSP: All post types interchangeable
- ISP: Focused interfaces
- DIP: Depends on abstractions

USAGE:
    service = SocialMediaService()
    user = User("U001", "alice")
    service.register_user(user)
    post = service.create_post(user.user_id, "Hello world!")
    service.follow_user(user1.user_id, user2.user_id)
    feed = service.get_feed(user.user_id)

EXPECTED RETURN:
    Feed of posts from followed users
"""

from typing import List, Dict, Set
from datetime import datetime


class User:
    """
    Social media user profile
    
    OOP CONCEPT: Encapsulation
    """
    
    def __init__(self, user_id: str, username: str):
        """
        Initialize user
        
        Args:
            user_id: Unique identifier
            username: Display username
        """
        self.user_id = user_id
        self.username = username
        self.followers: Set[str] = set()
        self.following: Set[str] = set()
        self.bio = ""
        self.created_at = datetime.now()
    
    def follow(self, user_id: str):
        """Follow another user"""
        self.following.add(user_id)
    
    def unfollow(self, user_id: str):
        """Unfollow user"""
        self.following.discard(user_id)
    
    def add_follower(self, user_id: str):
        """Add follower"""
        self.followers.add(user_id)
    
    def remove_follower(self, user_id: str):
        """Remove follower"""
        self.followers.discard(user_id)


class Comment:
    """
    Comment on a post
    
    DESIGN PATTERN: Composite Pattern component
    """
    
    def __init__(self, comment_id: str, author: User, content: str):
        """
        Initialize comment
        
        Args:
            comment_id: Unique identifier
            author: Comment author
            content: Comment text
        """
        self.comment_id = comment_id
        self.author = author
        self.content = content
        self.timestamp = datetime.now()
        self.likes: Set[str] = set()
    
    def like(self, user_id: str):
        """Like comment"""
        self.likes.add(user_id)


class Post:
    """
    Social media post
    
    DESIGN PATTERN: Composite Pattern (contains comments)
    """
    
    def __init__(self, post_id: str, author: User, content: str):
        """
        Initialize post
        
        Args:
            post_id: Unique identifier
            author: Post author
            content: Post content/text
        """
        self.post_id = post_id
        self.author = author
        self.content = content
        self.timestamp = datetime.now()
        self.likes: Set[str] = set()
        self.comments: List[Comment] = []
    
    def like(self, user_id: str):
        """
        Like post
        
        Args:
            user_id: User who liked
        """
        self.likes.add(user_id)
        print(f"👍 @{self.author.username}'s post liked")
    
    def unlike(self, user_id: str):
        """Unlike post"""
        self.likes.discard(user_id)
    
    def add_comment(self, comment: Comment):
        """
        Add comment to post
        
        Args:
            comment: Comment to add
        """
        self.comments.append(comment)
        print(f"💬 Comment added to @{self.author.username}'s post")
    
    def get_engagement(self) -> Dict:
        """Get engagement statistics"""
        return {
            'likes': len(self.likes),
            'comments': len(self.comments)
        }


class SocialMediaService:
    """
    Main social media platform service
    
    DESIGN PATTERN: Singleton + Facade + Observer
    """
    
    _instance = None
    
    def __new__(cls):
        """Singleton implementation"""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        """Initialize service"""
        if self._initialized:
            return
        
        self.users: Dict[str, User] = {}
        self.posts: Dict[str, Post] = {}
        self.post_counter = 0
        self.comment_counter = 0
        self._initialized = True
    
    def register_user(self, user: User):
        """
        Register new user
        
        Args:
            user: User to register
        """
        self.users[user.user_id] = user
        print(f"✓ Registered: @{user.username}")
    
    def follow_user(self, follower_id: str, followee_id: str):
        """
        Follow another user
        
        DESIGN PATTERN: Observer Pattern
        - Follower subscribes to followee's updates
        
        Args:
            follower_id: User who follows
            followee_id: User to follow
        """
        follower = self.users.get(follower_id)
        followee = self.users.get(followee_id)
        
        if not follower or not followee:
            print("✗ User not found")
            return
        
        if follower_id == followee_id:
            print("✗ Cannot follow yourself")
            return
        
        follower.follow(followee_id)
        followee.add_follower(follower_id)
        
        print(f"✓ @{follower.username} → @{followee.username}")
    
    def unfollow_user(self, follower_id: str, followee_id: str):
        """Unfollow user"""
        follower = self.users.get(follower_id)
        followee = self.users.get(followee_id)
        
        if follower and followee:
            follower.unfollow(followee_id)
            followee.remove_follower(follower_id)
            print(f"✓ @{follower.username} unfollowed @{followee.username}")
    
    def create_post(self, user_id: str, content: str) -> Post:
        """
        Create new post
        
        DESIGN PATTERN: Factory Pattern
        
        Args:
            user_id: Post author
            content: Post content
            
        Returns:
            Created post
        """
        user = self.users.get(user_id)
        if not user:
            print("✗ User not found")
            return None
        
        post_id = f"P{self.post_counter:04d}"
        self.post_counter += 1
        
        post = Post(post_id, user, content)
        self.posts[post_id] = post
        
        print(f"✓ Post by @{user.username}: {content}")
        return post
    
    def add_comment(self, post_id: str, user_id: str, content: str) -> Comment:
        """
        Add comment to post
        
        Args:
            post_id: Target post
            user_id: Comment author
            content: Comment text
            
        Returns:
            Created comment
        """
        post = self.posts.get(post_id)
        user = self.users.get(user_id)
        
        if not post or not user:
            print("✗ Post or user not found")
            return None
        
        comment_id = f"C{self.comment_counter:04d}"
        self.comment_counter += 1
        
        comment = Comment(comment_id, user, content)
        post.add_comment(comment)
        
        return comment
    
    def get_feed(self, user_id: str, limit: int = 50) -> List[Post]:
        """
        Get personalized feed
        
        DESIGN PATTERN: Strategy Pattern
        - Chronological feed strategy
        - Can be extended with algorithmic ranking
        
        Args:
            user_id: User requesting feed
            limit: Maximum posts to return
            
        Returns:
            List of posts from followed users
        """
        user = self.users.get(user_id)
        if not user:
            return []
        
        # Get posts from followed users
        feed = [
            post for post in self.posts.values()
            if post.author.user_id in user.following
        ]
        
        # Sort by timestamp (newest first)
        feed.sort(key=lambda p: p.timestamp, reverse=True)
        
        return feed[:limit]
    
    def get_user_posts(self, user_id: str) -> List[Post]:
        """Get all posts by user"""
        return [
            post for post in self.posts.values()
            if post.author.user_id == user_id
        ]


def main():
    """Demonstrate Social Media Platform"""
    print("=" * 70)
    print("SOCIAL MEDIA PLATFORM - Low Level Design Demo")
    print("=" * 70)
    
    service = SocialMediaService()
    
    # Register users
    print("\n👥 Registering Users...")
    alice = User("U001", "alice")
    bob = User("U002", "bob")
    charlie = User("U003", "charlie")
    
    service.register_user(alice)
    service.register_user(bob)
    service.register_user(charlie)
    
    # Follow users
    print("\n🔗 Building Connections...")
    service.follow_user(alice.user_id, bob.user_id)
    service.follow_user(alice.user_id, charlie.user_id)
    service.follow_user(bob.user_id, charlie.user_id)
    
    # Create posts
    print("\n📝 Creating Posts...")
    post1 = service.create_post(bob.user_id, "Hello world! First post here!")
    post2 = service.create_post(charlie.user_id, "Excited to join this platform!")
    post3 = service.create_post(bob.user_id, "Having a great day!")
    
    # Like and comment
    print("\n💬 Interactions...")
    post1.like(alice.user_id)
    post1.like(charlie.user_id)
    service.add_comment(post1.post_id, alice.user_id, "Welcome Bob!")
    
    # Get feed
    print("\n📰 Alice's Feed...")
    feed = service.get_feed(alice.user_id)
    print(f"  Feed has {len(feed)} posts")
    for post in feed:
        stats = post.get_engagement()
        print(f"  @{post.author.username}: {post.content}")
        print(f"    {stats['likes']} likes, {stats['comments']} comments")
    
    print("\n" + "=" * 70)
    print("DEMO COMPLETE")
    print("=" * 70)


if __name__ == "__main__":
    main()
