from PIL import Image
import os

def pad_image(path, scale_factor=0.6):
    try:
        if not os.path.exists(path):
            print(f"File not found: {path}")
            return

        img = Image.open(path).convert("RGBA")
        
        # Target size
        TARGET_SIZE = 1024
        
        # Create canvas filled with SAMPLED COLOR #fab708
        # This creates a "Full Bleed" icon so there are no borders
        bg_color = (250, 183, 8, 255) # #fab708
        canvas = Image.new("RGBA", (TARGET_SIZE, TARGET_SIZE), bg_color)
        
        # Calculate new dimensions preserving aspect ratio
        width, height = img.size
        aspect = width / height
        
        target_dim = int(TARGET_SIZE * scale_factor)
        
        if aspect > 1:
            new_w = target_dim
            new_h = int(target_dim / aspect)
        else:
            new_h = target_dim
            new_w = int(target_dim * aspect)
            
        img_resized = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
        
        # Center position
        x = (TARGET_SIZE - new_w) // 2
        y = (TARGET_SIZE - new_h) // 2
        
        canvas.paste(img_resized, (x, y), img_resized)
        canvas.save(path)
        print(f"Successfully padded: {path} (Scale: {scale_factor})")
        
    except Exception as e:
        print(f"Error processing {path}: {e}")

# Pad adaptive icon (needs to be safe from circle crop)
pad_image('assets/adaptive-icon.png', 0.60) # 60% size = ample padding

# Pad splash icon (Android 12+ also clips to circle, but can be slightly larger)
pad_image('assets/splash-icon.png', 0.65)
