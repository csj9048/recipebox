import zipfile
import subprocess
import os
import shutil
import sys
import re

APK_PATH = "android/app/build/outputs/apk/release/app-release.apk"
READELF_PATH = "/Users/user/Library/Android/sdk/ndk/27.0.12077973/toolchains/llvm/prebuilt/darwin-x86_64/bin/llvm-readelf"
TEMP_DIR = "temp_apk_extract"

def check_alignment():
    print(f"Checking alignment for {APK_PATH}...")
    if not os.path.exists(APK_PATH):
        print(f"Error: {APK_PATH} not found.")
        return

    if os.path.exists(TEMP_DIR):
        shutil.rmtree(TEMP_DIR)
    os.makedirs(TEMP_DIR)

    try:
        with zipfile.ZipFile(APK_PATH, 'r') as zip_ref:
            zip_ref.extractall(TEMP_DIR)
    except Exception as e:
        print(f"Error extracting APK: {e}")
        return

    lib_dir = os.path.join(TEMP_DIR, "lib")
    if not os.path.exists(lib_dir):
        print("No 'lib' directory found in APK.")
        return

    misaligned_libs = []
    checked_count = 0

    for root, dirs, files in os.walk(lib_dir):
        for file in files:
            if file.endswith(".so"):
                so_path = os.path.join(root, file)
                checked_count += 1
                try:
                    result = subprocess.run(
                        [READELF_PATH, "-W", "-l", so_path],
                        capture_output=True,
                        text=True,
                        check=True
                    )
                    
                    # Look for LOAD segments
                    # Type           Offset   VirtAddr           PhysAddr           FileSiz  MemSiz   Flg Align
                    # LOAD           0x000000 0x0000000000000000 0x0000000000000000 0x04229c 0x04229c R   0x1000
                    
                    has_load_segment = False
                    is_aligned = True
                    max_align = 0
                    
                    for line in result.stdout.splitlines():
                        if "LOAD" in line:
                            has_load_segment = True
                            # Extract alignment (last column usually, typically hex)
                            # Regex to match the LOAD line structure roughly
                            parts = line.split()
                            if len(parts) >= 6:
                                try:
                                    align_str = parts[-1]
                                    align_val = int(align_str, 16)
                                    max_align = max(max_align, align_val)
                                    if align_val < 0x4000: # 16384
                                        is_aligned = False
                                except ValueError:
                                    continue
                    
                    if has_load_segment and not is_aligned:
                        misaligned_libs.append((file, max_align))
                        print(f"[FAIL] {file} : Max Align {hex(max_align)} (Needed 0x4000)")
                    elif has_load_segment:
                        # print(f"[PASS] {file} : Max Align {hex(max_align)}")
                        pass

                except subprocess.CalledProcessError as e:
                    print(f"Error checking {file}: {e}")
                except Exception as e:
                    print(f"Unexpected error on {file}: {e}")

    print(f"\nChecked {checked_count} native libraries.")
    if misaligned_libs:
        print(f"Found {len(misaligned_libs)} misaligned libraries:")
        for lib, align in misaligned_libs:
            print(f" - {lib}: {hex(align)}")
    else:
        print("All native libraries are 16KB aligned!")

    # Cleanup
    if os.path.exists(TEMP_DIR):
        shutil.rmtree(TEMP_DIR)

if __name__ == "__main__":
    check_alignment()
