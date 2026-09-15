"""
Sends a sample lead to the current (v2, Railway) lead-assignment
receive-lead endpoint. Edit BASE_URL and the `payload` dict below.
"""

import requests
import json

# Replace with your Railway app's public URL (Railway dashboard -> your
# service -> Settings -> Networking -> "Generate Domain" / "Public Networking").
# Do NOT use the old cloudfunctions.net URL - that's the retired v1 system.
BASE_URL = "https://YOUR_APP.up.railway.app"
URL = BASE_URL + "/api/receive-lead"

payload = {
    "city": "Bengaluru",
    "name": "Test Lead",
    "phone": "9999999999",
    "lead_id": "TEST_LEAD_111111",
    "pincode": "11111",
    "assigned_source": "cc",   # affiliate/client - was "affiliateclient" in the old script
    "loan_type": "Gold Loan",
    "lead_source": "test",
    "loan_amount": "50000",
    # branch_id is optional now - assignment is pincode-only, round robin.
}

headers = {
    "Content-Type": "application/json"
}


def send_lead():
    response = requests.post(URL, headers=headers, data=json.dumps(payload))
    print(f"Status code: {response.status_code}")
    try:
        print("Response JSON:", json.dumps(response.json(), indent=2))
    except ValueError:
        print("Response text:", response.text)
    return response


if __name__ == "__main__":
    send_lead()
