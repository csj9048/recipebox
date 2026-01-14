from PIL import Image
import os

def get_hex_from_pixel(path):
    try:
        if not os.path.exists(path):
            return None
        img = Image.open(path).convert("RGB")
        # Sample a pixel that is likely part of the background (e.g., top center or just slightly in)
        # The user's image is a yellow squircle. We need to find the yellow.
        # Let's scan the center vertical line until we hit a non-transparent/non-white pixel? 
        # Actually, let's just grab the center-ish pixel if it's a solid background, 
        # but here it's an illustration.
        # Let's try to find the most common color that isn't white/black/transparent?
        # Or just manually pick a coordinate that looks yellow in the screenshot? 
        # The screenshot shows the chef. The background is yellow. 
        # Image was scaled to 60%, centered.
        # Center is 512, 512. Height approx 600. Top edge approx 200.
        # Pixel 250 is inside the image top area.
        r, g, b = img.getpixel((512, 250)) 
        return '#{:02x}{:02x}{:02x}'.format(r, g, b)
    except Exception as e:
        print(e)
        return None

# Check the original uploaded images or the restored assets in assets/
# Note: assets/adaptive-icon.png currently has padding (transparent). 
# We should sample from the CENTER of the current asset (where the image is)
# OR sample from the `uploaded_image_...` backups if I can find them.
# I'll sample from assets/adaptive-icon.png but looked at the center.

color = get_hex_from_pixel('assets/adaptive-icon.png')
print(f"Sampled Color: {color}")
