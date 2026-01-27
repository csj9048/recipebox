import jwt
import time
import argparse

def generate_client_secret(key_file, team_id, key_id, client_id):
    with open(key_file, 'r') as f:
        private_key = f.read()

    headers = {
        'kid': key_id,
        "alg": "ES256" # Apple requires ES256
    }

    payload = {
        'iss': team_id,
        'iat': int(time.time()),
        'exp': int(time.time()) + 15777000, # 6 months (max allowed by Apple)
        'aud': 'https://appleid.apple.com',
        'sub': client_id,
    }

    client_secret = jwt.encode(
        payload,
        private_key,
        algorithm='ES256',
        headers=headers
    )

    return client_secret

if __name__ == "__main__":
    print("Apple Client Secret Generator")
    print("----------------------------")
    
    key_file = input("Path to your .p8 file (e.g., AuthKey_123.p8): ").strip()
    team_id = input("Your Team ID (from Membership details): ").strip()
    key_id = input("Your Key ID (from the .p8 file name or Keys page): ").strip()
    client_id = input("Your Client ID (Bundle ID, e.g., com.recipebox.app.ios): ").strip()

    try:
        secret = generate_client_secret(key_file, team_id, key_id, client_id)
        print("\n🎉 Success! Here is your Client Secret (JWT):")
        print("-" * 60)
        print(secret)
        print("-" * 60)
        print("Copy this entire string and paste it into the Supabase 'Secret Key' field.")
    except Exception as e:
        print(f"\n❌ Error: {e}")
