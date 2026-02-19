import os
import re

ROOT_DIR = "node_modules"
FLAGS_LINE = 'string(APPEND CMAKE_SHARED_LINKER_FLAGS " -Wl,-z,max-page-size=16384")'
COMMENT_LINE = '# Force 16KB page alignment'

def patch_cmake_files():
    count = 0
    for root, dirs, files in os.walk(ROOT_DIR):
        for file in files:
            if file == "CMakeLists.txt":
                path = os.path.join(root, file)
                try:
                    with open(path, "r") as f:
                        content = f.read()
                    
                    # Remove old patch if present
                    if FLAGS_LINE in content:
                        content = content.replace(FLAGS_LINE, "")
                        content = content.replace(COMMENT_LINE, "")
                        # content = re.sub(r'\n+', '\n', content) # Clean up newlines if needed

                    lines = content.splitlines()
                    new_lines = []
                    inserted = False
                    project_found = False

                    # First pass: Check if project() exists
                    for line in lines:
                        if "project(" in line:
                            project_found = True
                            break
                    
                    # Second pass: Reconstruct file
                    for line in lines:
                        if line.strip() == FLAGS_LINE or line.strip() == COMMENT_LINE:
                             continue # Skip if somehow missed by replace

                        new_lines.append(line)
                        
                        if not inserted:
                            should_insert = False
                            if project_found:
                                if "project(" in line:
                                    should_insert = True
                            else:
                                if "cmake_minimum_required" in line:
                                    should_insert = True
                            
                            if should_insert:
                                new_lines.append("")
                                new_lines.append(COMMENT_LINE)
                                new_lines.append(FLAGS_LINE)
                                inserted = True
                    
                    if not inserted:
                         # Fallback: Top of file
                         new_lines.insert(0, FLAGS_LINE)
                         new_lines.insert(0, COMMENT_LINE)

                    output_content = "\n".join(new_lines)
                    with open(path, "w") as f:
                        f.write(output_content)
                    
                    print(f"Patched {path}")
                    count += 1
                except Exception as e:
                    print(f"Failed to patch {path}: {e}")
    
    print(f"Total patched files: {count}")

if __name__ == "__main__":
    patch_cmake_files()
