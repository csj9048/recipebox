
import re

file_path = 'android/app/build.gradle'
with open(file_path, 'r') as f:
    content = f.read()

# Replace versionCode 1 with versionCode 2
content = re.sub(r'versionCode\s+1', 'versionCode 2', content)

with open(file_path, 'w') as f:
    f.write(content)

print("Successfully updated versionCode to 2 in build.gradle")
