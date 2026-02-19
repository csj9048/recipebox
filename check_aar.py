import zipfile
import subprocess
import os
import shutil
import sys

AAR_PATH = "node_modules/expo-modules-core/android/build/outputs/aar/expo-modules-core-release.aar"
READELF_PATH = "/Users/user/Library/Android/sdk/ndk/27.0.12077973/toolchains/llvm/prebuilt/darwin-x86_64/bin/llvm-readelf"
TEMP_DIR = "temp_aar_extract"
TARGET_LIB = "jni/arm64-v8a/libexpo-modules-core.so"

def check_aar_alignment():
    print(f"Checking alignment for {AAR_PATH}...")
    if not os.path.exists(AAR_PATH):
        print(f"Error: {AAR_PATH} not found.")
        return

    if os.path.exists(TEMP_DIR):
        shutil.rmtree(TEMP_DIR)
    os.makedirs(TEMP_DIR)

    try:
        with zipfile.ZipFile(AAR_PATH, 'r') as zip_ref:
            zip_ref.extract(TARGET_LIB, TEMP_DIR)
    except Exception as e:
        print(f"Error extracting AAR: {e}")
        return

    so_path = os.path.join(TEMP_DIR, TARGET_LIB)
    if not os.path.exists(so_path):
        print(f"Error: {TARGET_LIB} not found in AAR.")
        return

    try:
        result = subprocess.run(
            [READELF_PATH, "-W", "-l", so_path],
            capture_output=True,
            text=True,
            check=True
        )
        
        max_align = 0
        for line in result.stdout.splitlines():
            if "LOAD" in line:
                parts = line.split()
                if len(parts) >= 6:
                    try:
                        align_str = parts[-1]
                        align_val = int(align_str, 16)
                        max_align = max(max_align, align_val)
                    except ValueError:
                        continue
        
        print(f"Max Align: {hex(max_align)}")
        if max_align >= 0x4000:
            print("SUCCESS: Library is 16KB aligned!")
        else:
            print("FAILURE: Library is NOT 16KB aligned (0x1000).")

    except subprocess.CalledProcessError as e:
        print(f"Error checking {so_path}: {e}")
    except Exception as e:
        print(f"Unexpected error: {e}")

    # Cleanup
    if os.path.exists(TEMP_DIR):
        shutil.rmtree(TEMP_DIR)

if __name__ == "__main__":
    check_aar_alignment()
