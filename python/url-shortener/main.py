"""
URL SHORTENER - Low Level Design Implementation in Python

FILE PURPOSE:
This file implements a URL shortening service (like bit.ly) with short URL
generation, redirection, custom aliases, and click tracking.

DESIGN PATTERNS USED:
1. STRATEGY PATTERN: URL encoding strategies
   - Base62 encoding
   - Custom alias support
   - Different generation algorithms
   
2. REPOSITORY PATTERN: URL storage
   - Abstraction for data access
   - In-memory storage (can be replaced with DB)
   
3. FACTORY PATTERN: Short URL creation
   - Standardized URL generation
   
4. SINGLETON PATTERN: URLShortener service
   - Single service instance

OOP CONCEPTS:
- Encapsulation: Internal mapping hidden
- Abstraction: Clean service interface

SOLID PRINCIPLES:
- SRP: Each class single responsibility
- OCP: Easy to add new strategies
- DIP: Depends on abstractions

USAGE:
    shortener = URLShortener()
    short = shortener.shorten("https://example.com/long/url")
    original = shortener.expand(short)

EXPECTED RETURN:
    Short URL string (e.g., "https://short.ly/abc123")
"""

from typing import Dict, Optional
import random
import string
from datetime import datetime


class URLMapping:
    """
    Represents a URL mapping with metadata
    
    OOP CONCEPT: Data class with behavior
    """
    
    def __init__(self, short_code: str, long_url: str):
        """
        Initialize URL mapping
        
        Args:
            short_code: Short URL code
            long_url: Original long URL
        """
        self.short_code = short_code
        self.long_url = long_url
        self.created_at = datetime.now()
        self.click_count = 0
    
    def increment_clicks(self):
        """Track URL access"""
        self.click_count += 1


class CodeGenerator:
    """
    Strategy for generating short codes
    
    DESIGN PATTERN: Strategy Pattern
    """
    
    @staticmethod
    def generate(length: int = 6) -> str:
        """
        Generate random short code
        
        Args:
            length: Code length
            
        Returns:
            Random alphanumeric code
        """
        chars = string.ascii_letters + string.digits
        return ''.join(random.choices(chars, k=length))
    
    @staticmethod
    def is_valid_custom_code(code: str) -> bool:
        """Validate custom alias"""
        return (len(code) >= 3 and 
                len(code) <= 20 and 
                code.isalnum())


class URLShortener:
    """
    Main URL shortening service
    
    DESIGN PATTERN: Singleton + Repository
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
        
        self.url_map: Dict[str, URLMapping] = {}
        self.reverse_map: Dict[str, str] = {}
        self.base_url = "https://short.ly/"
        self._initialized = True
    
    def shorten(self, long_url: str, custom_alias: Optional[str] = None) -> str:
        """
        Shorten a long URL
        
        Args:
            long_url: Original URL to shorten
            custom_alias: Optional custom short code
            
        Returns:
            Short URL string
        """
        # Check if already shortened
        if long_url in self.reverse_map:
            code = self.reverse_map[long_url]
            short_url = self.base_url + code
            print(f"✓ Already shortened: {short_url}")
            return short_url
        
        # Generate or use custom code
        if custom_alias:
            if not CodeGenerator.is_valid_custom_code(custom_alias):
                print(f"✗ Invalid custom alias: {custom_alias}")
                return None
            if custom_alias in self.url_map:
                print(f"✗ Alias already taken: {custom_alias}")
                return None
            code = custom_alias
        else:
            code = CodeGenerator.generate()
            while code in self.url_map:
                code = CodeGenerator.generate()
        
        # Create mapping
        mapping = URLMapping(code, long_url)
        self.url_map[code] = mapping
        self.reverse_map[long_url] = code
        
        short_url = self.base_url + code
        print(f"✓ Shortened: {short_url}")
        return short_url
    
    def expand(self, short_url: str) -> Optional[str]:
        """
        Expand short URL to original
        
        Args:
            short_url: Short URL to expand
            
        Returns:
            Original long URL or None
        """
        code = short_url.replace(self.base_url, "")
        mapping = self.url_map.get(code)
        
        if mapping:
            mapping.increment_clicks()
            return mapping.long_url
        
        return None
    
    def get_stats(self, short_url: str) -> Optional[Dict]:
        """
        Get statistics for short URL
        
        Args:
            short_url: Short URL
            
        Returns:
            Statistics dictionary
        """
        code = short_url.replace(self.base_url, "")
        mapping = self.url_map.get(code)
        
        if mapping:
            return {
                'short_code': mapping.short_code,
                'long_url': mapping.long_url,
                'clicks': mapping.click_count,
                'created_at': mapping.created_at
            }
        
        return None


def main():
    """Demonstrate URL Shortener"""
    print("=" * 70)
    print("URL SHORTENER - Low Level Design Demo")
    print("=" * 70)
    
    shortener = URLShortener()
    
    # Shorten URLs
    print("\n🔗 Shortening URLs...")
    short1 = shortener.shorten("https://example.com/very/long/url/path/to/resource")
    short2 = shortener.shorten("https://github.com/user/repo/issues/123", "myrepo")
    short3 = shortener.shorten("https://example.com/very/long/url/path/to/resource")  # Duplicate
    
    # Expand URLs
    print("\n🔓 Expanding URLs...")
    print(f"  {short1} → {shortener.expand(short1)}")
    print(f"  {short2} → {shortener.expand(short2)}")
    
    # Get statistics
    print("\n📊 Statistics...")
    stats = shortener.get_stats(short1)
    if stats:
        print(f"  Clicks: {stats['clicks']}")
        print(f"  Created: {stats['created_at']}")
    
    print("\n" + "=" * 70)
    print("DEMO COMPLETE")
    print("=" * 70)


if __name__ == "__main__":
    main()
