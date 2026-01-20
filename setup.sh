#!/bin/bash

echo "========================================"
echo "LiveChatLog Dashboard API - Quick Setup"
echo "========================================"
echo ""
echo "Step 1: Installing dependencies..."
npm install
echo ""
echo "Step 2: Creating .env file from template..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo ".env file created! Please edit it with your configuration."
else
    echo ".env already exists, skipping..."
fi
echo ""
echo "========================================"
echo "Setup Complete!"
echo "========================================"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your database and service credentials"
echo "2. Create MySQL database: CREATE DATABASE livechatlog_database;"
echo "3. Run: npm run start:dev"
echo ""
echo "For detailed instructions, see SETUP_GUIDE.md"
echo "For quick reference, see QUICK_REFERENCE.md"
echo ""
