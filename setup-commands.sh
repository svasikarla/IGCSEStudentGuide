#!/bin/bash

# IGCSE Student Guide - Setup Instructions
# =====================================

echo "Setting up IGCSE Student Guide project..."

# Step 1: Install Node.js dependencies
echo "📦 Installing dependencies from package.json..."
npm install

# Step 2: Set up environment variables
echo "🔧 Setting up environment variables..."
if [ ! -f .env.local ]; then
    echo "Creating .env.local file..."
    cp .env.local .env.local.example
    echo "⚠️  Please update .env.local with your actual Supabase credentials"
    echo "   Get them from: https://supabase.com/dashboard"
else
    echo "✅ .env.local already exists"
fi

# Step 3: Initialize Tailwind CSS (if needed)
echo "🎨 Checking Tailwind CSS configuration..."
if [ ! -f tailwind.config.js ]; then
    echo "Initializing Tailwind CSS..."
    npx tailwindcss init -p
else
    echo "✅ Tailwind CSS already configured"
fi

# Step 4: Create missing page components (if they don't exist)
echo "📄 Checking for required page components..."

# Create missing pages directory structure
mkdir -p src/pages
mkdir -p src/components/auth
mkdir -p src/components/layout
mkdir -p src/components/study
mkdir -p src/components/dashboard
mkdir -p src/contexts
mkdir -p src/lib

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update .env.local with your Supabase credentials"
echo "2. Run 'npm start' to start the development server"
echo "3. Create missing page components (SubjectsPage, FlashcardsPage, QuizzesPage)"