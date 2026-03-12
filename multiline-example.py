#!/usr/bin/env python3
"""
Example: Sending multi-line messages via the chat API
"""
import urllib.request
import json

# Update these with your credentials
USERNAME = "your_username"
PASSWORD = "your_password"
SERVER_URL = "http://localhost:3000"

def send_multiline_message():
    """Send a message with embedded newlines"""
    
    # Multi-line message using triple quotes or \n
    message = """This is line 1
This is line 2
This is line 3"""
    
    # Or using explicit newlines:
    # message = "Line 1\nLine 2\nLine 3"
    
    data = {
        "username": USERNAME,
        "password": PASSWORD,
        "message": message
    }
    
    json_data = json.dumps(data).encode('utf-8')
    
    req = urllib.request.Request(
        f"{SERVER_URL}/api/message",
        data=json_data,
        headers={'Content-Type': 'application/json'}
    )
    
    try:
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode())
            print("✓ Message sent successfully!")
            print(f"  Status: {result.get('status')}")
            return True
    except urllib.error.HTTPError as e:
        error_msg = e.read().decode()
        print(f"✗ Error: {e.code} - {error_msg}")
        return False
    except Exception as e:
        print(f"✗ Error: {str(e)}")
        return False

if __name__ == "__main__":
    send_multiline_message()
