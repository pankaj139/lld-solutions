"""URL SHORTENER - Patterns: Strategy, Repository, Factory, Singleton"""
from typing import Dict, Optional
import random
import string

class URLShortener:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        self.url_map: Dict[str, str] = {}
        self.reverse_map: Dict[str, str] = {}
        self.base_url = "https://short.ly/"
        self._initialized = True
    
    def generate_code(self, length: int = 6) -> str:
        return ''.join(random.choices(string.ascii_letters + string.digits, k=length))
    
    def shorten(self, long_url: str, custom_alias: Optional[str] = None) -> str:
        if long_url in self.reverse_map:
            return self.base_url + self.reverse_map[long_url]
        
        code = custom_alias if custom_alias else self.generate_code()
        while code in self.url_map:
            code = self.generate_code()
        
        self.url_map[code] = long_url
        self.reverse_map[long_url] = code
        
        short_url = self.base_url + code
        print(f"✓ Shortened: {short_url}")
        return short_url
    
    def expand(self, short_url: str) -> Optional[str]:
        code = short_url.replace(self.base_url, "")
        return self.url_map.get(code)

def main():
    print("="*70)
    print("URL SHORTENER - Demo")
    print("="*70)
    shortener = URLShortener()
    short = shortener.shorten("https://example.com/very/long/url/path")
    print(f"Expands to: {shortener.expand(short)}")
    print("\n" + "="*70)
    print("DEMO COMPLETE")
    print("="*70)

if __name__ == "__main__":
    main()

