#!/usr/bin/env python3
"""
Logging Configuration for Ollama Question Generation

This module provides centralized logging configuration for the Ollama
question generation system.
"""

import logging
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Optional

def setup_logging(
    level: str = "INFO",
    log_file: Optional[str] = None,
    console_output: bool = True,
    file_rotation: bool = True
) -> logging.Logger:
    """
    Setup logging configuration for Ollama generation system
    
    Args:
        level: Logging level (DEBUG, INFO, WARNING, ERROR)
        log_file: Optional log file path
        console_output: Whether to output to console
        file_rotation: Whether to use file rotation
    
    Returns:
        Configured logger instance
    """
    
    # Create logs directory if it doesn't exist
    log_dir = Path("logs/generation")
    log_dir.mkdir(parents=True, exist_ok=True)
    
    # Configure logging level
    numeric_level = getattr(logging, level.upper(), logging.INFO)
    
    # Create logger
    logger = logging.getLogger("ollama_generation")
    logger.setLevel(numeric_level)
    
    # Clear any existing handlers
    logger.handlers.clear()
    
    # Create formatter
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    # Console handler
    if console_output:
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(numeric_level)
        console_handler.setFormatter(formatter)
        logger.addHandler(console_handler)
    
    # File handler
    if log_file is None:
        timestamp = datetime.now().strftime("%Y%m%d")
        log_file = log_dir / f"ollama_generation_{timestamp}.log"
    
    try:
        if file_rotation:
            from logging.handlers import RotatingFileHandler
            file_handler = RotatingFileHandler(
                log_file,
                maxBytes=10*1024*1024,  # 10MB
                backupCount=5
            )
        else:
            file_handler = logging.FileHandler(log_file)
        
        file_handler.setLevel(numeric_level)
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
        
    except Exception as e:
        # If file logging fails, just use console
        logger.warning(f"Could not setup file logging: {e}")
    
    # Prevent duplicate logs
    logger.propagate = False
    
    return logger

def get_logger(name: str = "ollama_generation") -> logging.Logger:
    """
    Get a logger instance
    
    Args:
        name: Logger name
    
    Returns:
        Logger instance
    """
    return logging.getLogger(name)

# Default logger setup
_default_logger = None

def get_default_logger() -> logging.Logger:
    """Get the default configured logger"""
    global _default_logger
    if _default_logger is None:
        _default_logger = setup_logging()
    return _default_logger
