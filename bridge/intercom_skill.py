import json
import urllib.request
import time

class IntercomBridge:
    def __init__(self, host="localhost", port=8765):
        self.base_url = f"http://{host}:{port}"

    def _get(self, endpoint):
        try:
            with urllib.request.urlopen(f"{self.base_url}{endpoint}") as response:
                return json.loads(response.read().decode("utf-8"))
        except Exception as e:
            return {"error": str(e)}

    def _post(self, endpoint, data):
        try:
            req = urllib.request.Request(
                f"{self.base_url}{endpoint}",
                data=json.dumps(data).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            with urllib.request.urlopen(req) as response:
                return json.loads(response.read().decode("utf-8"))
        except Exception as e:
            return {"error": str(e)}

    def health(self):
        """Returns the current status of the bridge."""
        return self._get("/health")

    def poll(self):
        """Reads and clears the inbox (messages from Chrome)."""
        return self._get("/inbox")

    def reply(self, content, role="assistant", type="chat"):
        """Sends a message to Chrome (via outbox)."""
        message = {
            "type": type,
            "role": role,
            "content": content,
            "timestamp": int(time.time())
        }
        return self._post("/outbox", message)
