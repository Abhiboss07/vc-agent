import subprocess
import sys


TRUNK_ID = "REDACTED_TRUNK_ID"
LIVEKIT_URL = "wss://ai-calling-agent-y3p1e3sx.livekit.cloud"
API_KEY = "REDACTED_API_KEY"
API_SECRET = "REDACTED_SECRET"


def main():
    if len(sys.argv) > 1:
        phone = sys.argv[1]
    else:
        phone = input("Enter phone number to call (e.g. +916386617608): ").strip()

    if not phone.startswith("+"):
        print("Error: Phone number must include country code (e.g. +916386617608)")
        sys.exit(1)

    room = f"call-{phone.replace('+', '').replace(' ', '')}"

    print(f"\nCalling {phone}...")
    print(f"Room: {room}\n")

    result = subprocess.run(
        [
            "lk", "sip", "participant", "create",
            "--trunk", TRUNK_ID,
            "--call", phone,
            "--room", room,
            "--name", "Real Estate Agent",
            "--display-name", "Real Estate Agent",
            "--wait",
            "--url", LIVEKIT_URL,
            "--api-key", API_KEY,
            "--api-secret", API_SECRET,
        ],
        capture_output=True,
        text=True,
    )

    if result.returncode == 0 or "ParticipantID" in result.stderr:
        output = result.stdout + result.stderr
        print("Call initiated successfully!")
        for line in output.splitlines():
            if any(k in line for k in ["SIPCallID", "ParticipantID", "RoomName"]):
                print(f"  {line.strip()}")
    else:
        print("Failed to initiate call.")
        print(result.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
