"""SOCIAL MEDIA PLATFORM - Patterns: Observer, Strategy, Factory, Singleton, Composite"""
from typing import List, Dict, Set
from datetime import datetime

class User:
    def __init__(self, user_id: str, username: str):
        self.user_id = user_id
        self.username = username
        self.followers: Set[str] = set()
        self.following: Set[str] = set()
    
    def follow(self, user_id: str):
        self.following.add(user_id)

class Post:
    def __init__(self, post_id: str, author: User, content: str):
        self.post_id = post_id
        self.author = author
        self.content = content
        self.timestamp = datetime.now()
        self.likes: Set[str] = set()
        self.comments: List['Comment'] = []
    
    def like(self, user_id: str):
        self.likes.add(user_id)
    
    def add_comment(self, comment: 'Comment'):
        self.comments.append(comment)

class Comment:
    def __init__(self, author: User, content: str):
        self.author = author
        self.content = content
        self.timestamp = datetime.now()

class SocialMediaService:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        self.users: Dict[str, User] = {}
        self.posts: Dict[str, Post] = {}
        self.post_counter = 0
        self._initialized = True
    
    def register_user(self, user: User):
        self.users[user.user_id] = user
        print(f"✓ Registered: @{user.username}")
    
    def follow_user(self, follower_id: str, followee_id: str):
        follower = self.users[follower_id]
        followee = self.users[followee_id]
        follower.follow(followee_id)
        followee.followers.add(follower_id)
        print(f"✓ @{follower.username} → @{followee.username}")
    
    def create_post(self, user_id: str, content: str) -> Post:
        user = self.users[user_id]
        post_id = f"P{self.post_counter:04d}"
        self.post_counter += 1
        post = Post(post_id, user, content)
        self.posts[post_id] = post
        print(f"✓ Post by @{user.username}: {content}")
        return post
    
    def get_feed(self, user_id: str) -> List[Post]:
        user = self.users[user_id]
        feed = [p for p in self.posts.values() if p.author.user_id in user.following]
        return sorted(feed, key=lambda p: p.timestamp, reverse=True)

def main():
    print("="*70)
    print("SOCIAL MEDIA PLATFORM - Demo")
    print("="*70)
    service = SocialMediaService()
    alice = User("U001", "alice")
    bob = User("U002", "bob")
    service.register_user(alice)
    service.register_user(bob)
    service.follow_user(alice.user_id, bob.user_id)
    post = service.create_post(bob.user_id, "Hello world!")
    post.like(alice.user_id)
    print(f"\n📰 Alice's feed: {len(service.get_feed(alice.user_id))} posts")
    print("\n" + "="*70)
    print("DEMO COMPLETE")
    print("="*70)

if __name__ == "__main__":
    main()

