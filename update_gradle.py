
import re

file_path = 'android/app/build.gradle'
with open(file_path, 'r') as f:
    content = f.read()

# 1. Add Release Signing Config
signing_config_replacement = """    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        release {
            storeFile file('release.keystore')
            storePassword 'recipebox1234'
            keyAlias 'recipebox-release'
            keyPassword 'recipebox1234'
        }
    }"""

# Regex to replace the whole signingConfigs block
content = re.sub(r'signingConfigs\s*\{[^}]*debug\s*\{[^}]*\}[^}]*\}', signing_config_replacement, content, flags=re.DOTALL)

# 2. Update Release Build Type to use Release Signing
# Look for 'release {' then 'signingConfig signingConfigs.debug' inside it
# We can find the release block and replace the signing config within it
def replace_signing_in_release(match):
    block = match.group(0)
    return block.replace('signingConfig signingConfigs.debug', 'signingConfig signingConfigs.release')

content = re.sub(r'buildTypes\s*\{.*?release\s*\{.*?\}.*?\}', 
                 lambda m: re.sub(r'release\s*\{.*?\}', replace_signing_in_release, m.group(0), flags=re.DOTALL), 
                 content, flags=re.DOTALL)

with open(file_path, 'w') as f:
    f.write(content)

print("Successfully updated build.gradle")
