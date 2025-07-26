#!/usr/bin/env python3
"""
Python 3.13 Compatibility Checker for RAG System

This script checks which packages are compatible with your Python version
and provides alternative installation commands.
"""

import sys
import subprocess
import pkg_resources
from packaging import version

def check_python_version():
    """Check Python version and compatibility"""
    py_version = sys.version_info
    print(f"Python Version: {py_version.major}.{py_version.minor}.{py_version.micro}")
    
    if py_version.major < 3 or (py_version.major == 3 and py_version.minor < 8):
        print("❌ Python 3.8+ required")
        return False
    elif py_version.minor >= 13:
        print("⚠️  Python 3.13 detected - some packages may need specific versions")
    else:
        print("✅ Python version compatible")
    
    return True

def try_install_package(package_spec, alternatives=None):
    """Try to install a package with fallback alternatives"""
    print(f"\nTrying to install: {package_spec}")
    
    try:
        result = subprocess.run([
            sys.executable, "-m", "pip", "install", package_spec
        ], capture_output=True, text=True, check=True)
        print(f"✅ Successfully installed {package_spec}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install {package_spec}")
        print(f"Error: {e.stderr}")
        
        if alternatives:
            for alt in alternatives:
                print(f"Trying alternative: {alt}")
                try:
                    result = subprocess.run([
                        sys.executable, "-m", "pip", "install", alt
                    ], capture_output=True, text=True, check=True)
                    print(f"✅ Successfully installed {alt}")
                    return True
                except subprocess.CalledProcessError as e2:
                    print(f"❌ Alternative {alt} also failed")
                    continue
        
        return False

def install_core_packages():
    """Install core packages with Python 3.13 compatibility"""
    packages = [
        # Core packages that should work
        ("supabase>=2.0.0", None),
        ("openai>=1.0.0", None),
        ("tiktoken>=0.5.0", None),
        ("numpy>=1.24.0", ["numpy>=1.21.0"]),  # Fallback to older numpy if needed
        
        # Basic utilities
        ("requests>=2.31.0", ["requests>=2.25.0"]),
        ("python-dotenv>=1.0.0", ["python-dotenv>=0.19.0"]),
        
        # PDF processing with compatibility
        ("pdfplumber>=0.11.0,<1.0.0", ["pdfplumber>=0.10.0", "pdfplumber>=0.9.0"]),
        
        # Optional providers
        ("cohere>=5.0.0", ["cohere>=4.0.0", "cohere>=3.0.0"]),
    ]
    
    results = {}
    
    for package, alternatives in packages:
        success = try_install_package(package, alternatives)
        results[package.split(">=")[0].split("==")[0]] = success
    
    return results

def install_optional_packages():
    """Install optional packages"""
    optional_packages = [
        ("firecrawl-py", ["firecrawl-py>=1.0.0", "firecrawl-py>=0.0.8"]),
        ("nltk>=3.8.0", ["nltk>=3.6.0"]),
        ("aiohttp>=3.8.0", ["aiohttp>=3.7.0"]),
        ("pandas>=2.0.0", ["pandas>=1.5.0"]),
        ("rich>=13.0.0", ["rich>=12.0.0"]),
    ]
    
    results = {}
    
    for package, alternatives in optional_packages:
        package_name = package.split(">=")[0].split("==")[0]
        print(f"\n--- Installing optional package: {package_name} ---")
        success = try_install_package(package, alternatives)
        results[package_name] = success
        
        if not success:
            print(f"⚠️  {package_name} installation failed - this is optional")
    
    return results

def create_fallback_scraper():
    """Create a simple fallback web scraper if firecrawl fails"""
    fallback_code = '''#!/usr/bin/env python3
"""
Fallback Web Scraper (without Firecrawl)

Simple web scraper using requests and BeautifulSoup as fallback
when Firecrawl is not available.
"""

import requests
from bs4 import BeautifulSoup
import time

def scrape_url_simple(url, timeout=30):
    """Simple web scraping fallback"""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        
        response = requests.get(url, headers=headers, timeout=timeout)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Remove script and style elements
        for script in soup(["script", "style"]):
            script.decompose()
        
        # Get text content
        text = soup.get_text()
        
        # Clean up whitespace
        lines = (line.strip() for line in text.splitlines())
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        text = ' '.join(chunk for chunk in chunks if chunk)
        
        return {
            'success': True,
            'data': {
                'markdown': text,
                'title': soup.title.string if soup.title else ''
            }
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

if __name__ == "__main__":
    # Test the fallback scraper
    result = scrape_url_simple("https://example.com")
    print(result)
'''
    
    with open("scripts/fallback_scraper.py", "w") as f:
        f.write(fallback_code)
    
    print("✅ Created fallback scraper at scripts/fallback_scraper.py")

def main():
    print("🔍 Python 3.13 Compatibility Checker for RAG System")
    print("=" * 60)
    
    if not check_python_version():
        sys.exit(1)
    
    print("\n📦 Installing Core Packages...")
    core_results = install_core_packages()
    
    print("\n📦 Installing Optional Packages...")
    optional_results = install_optional_packages()
    
    # Check if firecrawl failed and create fallback
    if not optional_results.get('firecrawl-py', False):
        print("\n🔄 Firecrawl installation failed, creating fallback scraper...")
        try:
            subprocess.run([sys.executable, "-m", "pip", "install", "beautifulsoup4"], check=True)
            create_fallback_scraper()
        except:
            print("❌ Could not install BeautifulSoup4 for fallback scraper")
    
    print("\n📊 Installation Summary:")
    print("=" * 40)
    
    print("\nCore Packages:")
    for package, success in core_results.items():
        status = "✅" if success else "❌"
        print(f"  {status} {package}")
    
    print("\nOptional Packages:")
    for package, success in optional_results.items():
        status = "✅" if success else "⚠️"
        print(f"  {status} {package}")
    
    # Check overall success
    core_success = all(core_results.values())
    
    if core_success:
        print("\n🎉 Core installation successful!")
        print("\nNext steps:")
        print("1. Set up environment variables in .env file")
        print("2. Run: python scripts/setup_rag_system.py --check-only")
        print("3. Test the system with sample content")
    else:
        print("\n❌ Some core packages failed to install")
        print("You may need to use Python 3.11 or 3.12 for full compatibility")
        
        # Suggest creating a new venv with older Python
        print("\nAlternative: Create venv with Python 3.11:")
        print("1. deactivate")
        print("2. Remove current venv: rmdir /s venv")
        print("3. py -3.11 -m venv venv")
        print("4. .\\venv\\Scripts\\Activate.ps1")
        print("5. pip install -r requirements-rag.txt")

if __name__ == "__main__":
    main()
