#!/bin/bash

# Post message to chat via API
# Usage: ./post-message.sh "Your message here"

# Configuration
SERVER="http://localhost:3000"
USERNAME="your_username"
PASSWORD="your_password"

# Check if message provided
if [ -z "$1" ]; then
    echo "Usage: $0 \"Your message here\""
    exit 1
fi

MESSAGE="$1"

# Post message
curl -X POST "$SERVER/api/message" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\",\"message\":\"$MESSAGE\"}"

echo ""
