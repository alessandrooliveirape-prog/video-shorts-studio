import requests
import json

url = "http://localhost:8000/api/clip/extract"
payload = {
    "youtube_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
}
headers = {
    "Content-Type": "application/json"
}

print("Sending POST request to", url)
try:
    response = requests.post(url, json=payload, headers=headers, timeout=300)
    print("Status Code:", response.status_code)
    print("Response:")
    print(json.dumps(response.json(), indent=2))
except Exception as e:
    print("Error:", e)
