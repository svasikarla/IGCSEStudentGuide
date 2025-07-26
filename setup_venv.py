#!/usr/bin/env python3
"""
Virtual Environment Setup Script for IGCSE RAG System

This script automates the creation and setup of a Python virtual environment
for the AI-powered IGCSE content system.

Usage:
    python setup_venv.py
    python setup_venv.py --python-version 3.11
    python setup_venv.py --reinstall
"""

import os
import sys
import subprocess
import argparse
import platform
from pathlib import Path

def run_command(command, check=True, shell=False):
    """Run a command and return the result"""
    try:
        if isinstance(command, str):
            command = command.split() if not shell else command
        
        result = subprocess.run(
            command, 
            check=check, 
            capture_output=True, 
            text=True,
            shell=shell
        )
        return result.returncode == 0, result.stdout, result.stderr
    except subprocess.CalledProcessError as e:
        return False, e.stdout, e.stderr
    except Exception as e:
        return False, "", str(e)

def get_python_executable(version=None):
    """Get the appropriate Python executable"""
    if version:
        python_cmd = f"python{version}"
    else:
        python_cmd = "python"
    
    # Check if the command exists
    success, stdout, stderr = run_command(f"{python_cmd} --version")
    if success:
        return python_cmd
    
    # Try alternative commands
    alternatives = ["python3", "py", "python.exe"]
    for alt in alternatives:
        success, stdout, stderr = run_command(f"{alt} --version")
        if success:
            return alt
    
    return None

def check_python_version(python_cmd):
    """Check if Python version is compatible"""
    success, stdout, stderr = run_command(f"{python_cmd} --version")
    if not success:
        return False, "Could not determine Python version"
    
    version_line = stdout.strip() or stderr.strip()
    try:
        version_str = version_line.split()[1]  # "Python 3.11.0" -> "3.11.0"
        major, minor = map(int, version_str.split('.')[:2])
        
        if major < 3 or (major == 3 and minor < 8):
            return False, f"Python {major}.{minor} is too old. Requires Python 3.8+"
        
        return True, f"Python {major}.{minor} is compatible"
    except Exception as e:
        return False, f"Could not parse Python version: {e}"

def create_virtual_environment(python_cmd, venv_path):
    """Create a virtual environment"""
    print(f"Creating virtual environment at {venv_path}...")
    
    success, stdout, stderr = run_command(f"{python_cmd} -m venv {venv_path}")
    if not success:
        print(f"❌ Failed to create virtual environment:")
        print(f"Error: {stderr}")
        return False
    
    print("✅ Virtual environment created successfully")
    return True

def get_activation_command():
    """Get the appropriate activation command for the current OS"""
    system = platform.system().lower()
    
    if system == "windows":
        # Check if we're in PowerShell or Command Prompt
        if os.environ.get('PSModulePath'):
            return r"venv\Scripts\Activate.ps1"
        else:
            return r"venv\Scripts\activate.bat"
    else:
        return "source venv/bin/activate"

def install_dependencies(venv_path):
    """Install dependencies in the virtual environment"""
    system = platform.system().lower()
    
    if system == "windows":
        pip_cmd = os.path.join(venv_path, "Scripts", "pip.exe")
        python_cmd = os.path.join(venv_path, "Scripts", "python.exe")
    else:
        pip_cmd = os.path.join(venv_path, "bin", "pip")
        python_cmd = os.path.join(venv_path, "bin", "python")
    
    # Upgrade pip first
    print("Upgrading pip...")
    success, stdout, stderr = run_command(f'"{python_cmd}" -m pip install --upgrade pip')
    if not success:
        print(f"⚠️ Warning: Could not upgrade pip: {stderr}")
    else:
        print("✅ Pip upgraded successfully")
    
    # Install RAG dependencies
    if os.path.exists("requirements-rag.txt"):
        print("Installing RAG system dependencies...")
        success, stdout, stderr = run_command(f'"{pip_cmd}" install -r requirements-rag.txt')
        if not success:
            print(f"❌ Failed to install RAG dependencies:")
            print(f"Error: {stderr}")
            return False
        print("✅ RAG dependencies installed successfully")
    else:
        print("⚠️ requirements-rag.txt not found, skipping RAG dependencies")
    
    # Install existing project dependencies if they exist
    if os.path.exists("requirements.txt"):
        print("Installing existing project dependencies...")
        success, stdout, stderr = run_command(f'"{pip_cmd}" install -r requirements.txt')
        if not success:
            print(f"⚠️ Warning: Could not install existing dependencies: {stderr}")
        else:
            print("✅ Existing dependencies installed successfully")
    
    return True

def create_activation_script():
    """Create a convenient activation script"""
    system = platform.system().lower()
    
    if system == "windows":
        # Create batch file for Windows
        script_content = """@echo off
echo Activating IGCSE RAG System virtual environment...
call venv\\Scripts\\activate.bat
echo ✅ Virtual environment activated!
echo.
echo Available commands:
echo   python scripts/setup_rag_system.py --check-only
echo   python scripts/collect_web_content.py --help
echo   python scripts/embedding_service.py --help
echo.
cmd /k
"""
        with open("activate_rag.bat", "w") as f:
            f.write(script_content)
        print("✅ Created activate_rag.bat for easy activation")
        
        # Create PowerShell script
        ps_content = """Write-Host "Activating IGCSE RAG System virtual environment..." -ForegroundColor Green
& .\\venv\\Scripts\\Activate.ps1
Write-Host "✅ Virtual environment activated!" -ForegroundColor Green
Write-Host ""
Write-Host "Available commands:" -ForegroundColor Yellow
Write-Host "  python scripts/setup_rag_system.py --check-only" -ForegroundColor Cyan
Write-Host "  python scripts/collect_web_content.py --help" -ForegroundColor Cyan
Write-Host "  python scripts/embedding_service.py --help" -ForegroundColor Cyan
Write-Host ""
"""
        with open("activate_rag.ps1", "w") as f:
            f.write(ps_content)
        print("✅ Created activate_rag.ps1 for PowerShell")
    
    else:
        # Create shell script for Unix-like systems
        script_content = """#!/bin/bash
echo "Activating IGCSE RAG System virtual environment..."
source venv/bin/activate
echo "✅ Virtual environment activated!"
echo ""
echo "Available commands:"
echo "  python scripts/setup_rag_system.py --check-only"
echo "  python scripts/collect_web_content.py --help"
echo "  python scripts/embedding_service.py --help"
echo ""
exec "$SHELL"
"""
        with open("activate_rag.sh", "w") as f:
            f.write(script_content)
        os.chmod("activate_rag.sh", 0o755)
        print("✅ Created activate_rag.sh for easy activation")

def update_gitignore():
    """Update .gitignore to exclude virtual environment"""
    gitignore_entries = [
        "# Python Virtual Environment",
        "venv/",
        "*.pyc",
        "__pycache__/",
        "*.pyo",
        "*.pyd",
        ".Python",
        "env/",
        "ENV/",
        "",
        "# RAG System Logs",
        "logs/",
        "*.log",
        "",
        "# Environment Variables",
        ".env.local",
        ".env.rag",
        ""
    ]
    
    gitignore_path = ".gitignore"
    existing_content = ""
    
    if os.path.exists(gitignore_path):
        with open(gitignore_path, "r") as f:
            existing_content = f.read()
    
    # Check if venv is already in gitignore
    if "venv/" not in existing_content:
        with open(gitignore_path, "a") as f:
            f.write("\n" + "\n".join(gitignore_entries))
        print("✅ Updated .gitignore to exclude virtual environment")
    else:
        print("✅ .gitignore already configured for virtual environment")

def main():
    parser = argparse.ArgumentParser(description="Setup Python virtual environment for IGCSE RAG system")
    parser.add_argument("--python-version", help="Specific Python version to use (e.g., 3.11)")
    parser.add_argument("--reinstall", action="store_true", help="Remove existing venv and reinstall")
    
    args = parser.parse_args()
    
    print("🚀 Setting up Python Virtual Environment for IGCSE RAG System")
    print("=" * 60)
    
    # Check if we're in the right directory
    if not os.path.exists("src") or not os.path.exists("package.json"):
        print("❌ This doesn't appear to be the IGCSE project root directory")
        print("Please run this script from the project root (where package.json is located)")
        sys.exit(1)
    
    venv_path = "venv"
    
    # Remove existing venv if reinstall is requested
    if args.reinstall and os.path.exists(venv_path):
        print(f"Removing existing virtual environment...")
        import shutil
        shutil.rmtree(venv_path)
        print("✅ Existing virtual environment removed")
    
    # Check if venv already exists
    if os.path.exists(venv_path):
        print(f"✅ Virtual environment already exists at {venv_path}")
        print("Use --reinstall to recreate it")
        
        # Still try to install dependencies
        if install_dependencies(venv_path):
            print("\n🎉 Virtual environment is ready!")
            print(f"\nTo activate the environment:")
            print(f"  {get_activation_command()}")
            print(f"\nOr use the convenience script:")
            system = platform.system().lower()
            if system == "windows":
                print("  activate_rag.bat  (Command Prompt)")
                print("  .\\activate_rag.ps1  (PowerShell)")
            else:
                print("  ./activate_rag.sh")
        return
    
    # Find Python executable
    python_cmd = get_python_executable(args.python_version)
    if not python_cmd:
        print("❌ Could not find Python executable")
        print("Please ensure Python is installed and available in PATH")
        sys.exit(1)
    
    # Check Python version
    compatible, message = check_python_version(python_cmd)
    print(f"Python version check: {message}")
    if not compatible:
        sys.exit(1)
    
    # Create virtual environment
    if not create_virtual_environment(python_cmd, venv_path):
        sys.exit(1)
    
    # Install dependencies
    if not install_dependencies(venv_path):
        sys.exit(1)
    
    # Create activation scripts
    create_activation_script()
    
    # Update gitignore
    update_gitignore()
    
    print("\n🎉 Virtual environment setup completed successfully!")
    print("=" * 60)
    print(f"\nTo activate the environment:")
    print(f"  {get_activation_command()}")
    print(f"\nOr use the convenience script:")
    system = platform.system().lower()
    if system == "windows":
        print("  activate_rag.bat  (Command Prompt)")
        print("  .\\activate_rag.ps1  (PowerShell)")
    else:
        print("  ./activate_rag.sh")
    
    print(f"\nNext steps:")
    print("1. Activate the virtual environment")
    print("2. Set up your environment variables (.env file)")
    print("3. Run: python scripts/setup_rag_system.py --check-only")
    print("4. Start content ingestion with the RAG scripts")

if __name__ == "__main__":
    main()
