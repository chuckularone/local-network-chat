#!/usr/bin/env python3
"""
Post message to chat via API
Usage: python3 post-message.py "Your message here"
"""

import sys
import json
import urllib.request

# Configuration
SERVER = "http://localhost:3000"
USERNAME = "your_username"
PASSWORD = "your_password"

def post_message(message):
    """Post a message to the chat"""
    url = f"{SERVER}/api/message"
    
    data = {
        "username": USERNAME,
        "password": PASSWORD,
        "message": message
    }
    
    headers = {
        "Content-Type": "application/json"
    }
    
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode('utf-8'),
        headers=headers,
        method='POST'
    )
    
    try:
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode('utf-8'))
            print(json.dumps(result, indent=2))
            return True
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        print(f"Error {e.code}: {error_body}")
        return False
    except Exception as e:
        print(f"Error: {e}")
        return False

def post_photo(image_path, caption=""):
    """Post a photo to the chat"""
    import base64
    
    # Read and encode image
    try:
        with open(image_path, 'rb') as f:
            image_data = base64.b64encode(f.read()).decode('utf-8')
            
        # Determine image type
        ext = image_path.lower().split('.')[-1]
        mime_types = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'webp': 'image/webp'
        }
        mime_type = mime_types.get(ext, 'image/jpeg')
        
        # Create data URL
        photo_data = f"data:{mime_type};base64,{image_data}"
        
    except Exception as e:
        print(f"Error reading image: {e}")
        return False
    
    url = f"{SERVER}/api/photo"
    
    data = {
        "username": USERNAME,
        "password": PASSWORD,
        "photo": photo_data,
        "caption": caption
    }
    
    headers = {
        "Content-Type": "application/json"
    }
    
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode('utf-8'),
        headers=headers,
        method='POST'
    )
    
    try:
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode('utf-8'))
            print(json.dumps(result, indent=2))
            return True
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        print(f"Error {e.code}: {error_body}")
        return False
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage:")
        print(f"  {sys.argv[0]} \"Your message here\"")
        print(f"  {sys.argv[0]} --photo image.jpg \"Optional caption\"")
        sys.exit(1)
    
    if sys.argv[1] == "--photo":
        if len(sys.argv) < 3:
            print("Error: Please provide image path")
            sys.exit(1)
        image_path = sys.argv[2]
        caption = sys.argv[3] if len(sys.argv) > 3 else ""
        post_photo(image_path, caption)
    else:
        message = " ".join(sys.argv[1:])
        post_message(message)
