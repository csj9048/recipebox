import zipfile
import subprocess
import os
import shutil
import sys

AAB_PATH = "android/app/build/outputs/bundle/release/app-release.aab"
READELF_PATH = "/Users/user/Library/Android/sdk/ndk/27.0.12077973/toolchains/llvm/prebuilt/darwin-x86_64/bin/llvm-readelf"
TEMP_DIR = "temp_aab_extract"

def check_aab_alignment():
    print(f"Checking alignment for {AAB_PATH}...")
    if not os.path.exists(AAB_PATH):
        print(f"Error: {AAB_PATH} not found.")
        return

    if os.path.exists(TEMP_DIR):
        shutil.rmtree(TEMP_DIR)
    os.makedirs(TEMP_DIR)

    misaligned_count = 0
    total_count = 0

    try:
        with zipfile.ZipFile(AAB_PATH, 'r') as zip_ref:
            # List all files
            for file_info in zip_ref.infolist():
                if file_info.filename.endswith(".so") and "arm64-v8a" in file_info.filename:
                    # Extract lib
                    zip_ref.extract(file_info, TEMP_DIR)
                    so_path = os.path.join(TEMP_DIR, file_info.filename)
                    total_count += 1
                    
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
                        
                        if max_align < 0x4000:
                            print(f"[FAIL] {os.path.basename(file_info.filename)} : Max Align {hex(max_align)}")
                            misaligned_count += 1
                        
                    except Exception as e:
                        print(f"Error checking {so_path}: {e}")

    except Exception as e:
        print(f"Error extracting AAB: {e}")

    print(f"\nChecked {total_count} libraries.")
    if misaligned_count == 0:
        print("SUCCESS: All checked libraries are 16KB aligned!")
    else:
        print(f"Found {misaligned_count} misaligned libraries.")

    # Cleanup
    if os.path.exists(TEMP_DIR):
        shutil.rmtree(TEMP_DIR)

if __name__ == "__main__":
    check_aab_alignment()
