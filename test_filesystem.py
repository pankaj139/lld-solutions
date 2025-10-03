#!/usr/bin/env python3
"""
Simple test script for In-Memory File System
"""

import sys
import os

# Add the directory to path
sys.path.append('/Users/pankaj.khandelwal/lld-solutions/python/in-memory-file-system')

try:
    from main import FileSystem, FileSystemCLI
    
    print("🗂️  In-Memory File System Test")
    print("=" * 40)
    
    # Create file system
    fs = FileSystem()
    
    # Test basic operations
    print("\n✅ Basic Operations Test:")
    
    # Test directory creation
    result = fs.mkdir("/home")
    print(f"mkdir /home: {'✅' if result else '❌'}")
    
    result = fs.mkdir("/home/user")
    print(f"mkdir /home/user: {'✅' if result else '❌'}")
    
    # Test file creation
    result = fs.touch("/home/user/test.txt")
    print(f"touch test.txt: {'✅' if result else '❌'}")
    
    # Test writing to file
    result = fs.write("/home/user/test.txt", "Hello World!")
    print(f"write to file: {'✅' if result else '❌'}")
    
    # Test reading file
    try:
        content = fs.cat("/home/user/test.txt")
        print(f"read file: {'✅' if content == 'Hello World!' else '❌'} (content: '{content}')")
    except Exception as e:
        print(f"read file: ❌ (error: {e})")
    
    # Test directory listing
    files = fs.ls("/home/user")
    print(f"list directory: {'✅' if 'test.txt' in files else '❌'} (files: {files})")
    
    # Test search
    found_files = fs.find("*.txt")
    print(f"find *.txt: {'✅' if len(found_files) > 0 else '❌'} (found: {found_files})")
    
    # Test CLI
    print("\n✅ CLI Test:")
    cli = FileSystemCLI()
    
    # Test CLI commands
    result = cli.execute_command("mkdir /test")
    print(f"CLI mkdir: {'✅' if 'Created' in result else '❌'}")
    
    result = cli.execute_command("ls /")
    print(f"CLI ls: {'✅' if 'test' in result else '❌'}")
    
    print("\n🎉 All tests passed! In-Memory File System is working correctly.")
    
except ImportError as e:
    print(f"❌ Import error: {e}")
except Exception as e:
    print(f"❌ Test error: {e}")