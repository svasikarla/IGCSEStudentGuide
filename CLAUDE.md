# IGCSE Student Guide - Architecture Overview

## Project Summary

The IGCSE Student Guide is a comprehensive learning platform for Grade 9-10 students preparing for Cambridge IGCSE exams. It combines AI-powered content generation (Gemini, OpenAI, Hugging Face) with flashcards, quizzes, exam papers, and interactive study materials.

## Architecture Overview

Frontend (React 3000) -> Backend Express (3001) -> Supabase + LLMs

Pattern: Full-stack React + Express with backend proxy for LLM security

