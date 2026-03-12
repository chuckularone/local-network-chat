#!/bin/bash

# Example: Sending a multi-line message via the API
# Update these with your credentials
USERNAME="your_username"
PASSWORD="your_password"

# Multi-line message using $'...' syntax (bash)
MESSAGE=$'This is line 1\nThis is line 2\nThis is line 3'

curl -X POST http://localhost:3000/api/message \
  -H "Content-Type: application/json" \
  -d "{
    \"username\": \"$USERNAME\",
    \"password\": \"$PASSWORD\",
    \"message\": \"$MESSAGE\"
  }"

echo ""
echo "Message sent!"
