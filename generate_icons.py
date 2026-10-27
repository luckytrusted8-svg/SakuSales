import math
import os
from PIL import Image, ImageDraw

def create_star_polygon(cx, cy, r_outer, r_inner, points=4):
    coords = []
    step = math.pi / points
    # Start at -pi/2 (top)
    angle = -math.pi / 2
    for i in range(points * 2):
        r = r_outer if i % 2 == 0 else r_inner
        x = cx + r * math.cos(angle)
        y = cy + r * math.sin(angle)
        coords.append((x, y))
        angle += step
    return coords

def draw_tilted_rect(base_img, cx, cy, w, h, radius, angle_deg, fill_color, stroke_color, stroke_w, stripes=True, center_dot=False):
    # Render tilted snack stick on a high-res scratch canvas and paste with alpha
    scratch_size = int(max(w, h) * 2.5)
    scratch = Image.new("RGBA", (scratch_size, scratch_size), (0, 0, 0, 0))
    d = ImageDraw.Draw(scratch)

    scx, scy = scratch_size / 2, scratch_size / 2
    x0, y0 = scx - w / 2, scy - h / 2
    x1, y1 = scx + w / 2, scy + h / 2

    # Draw rounded rectangle
    d.rounded_rectangle([x0, y0, x1, y1], radius=radius, fill=fill_color, outline=stroke_color, width=stroke_w)

    if stripes:
        # Texture lines
        d.line([(x0 + 10, scy - h * 0.2), (x1 - 10, scy - h * 0.2 + 8)], fill=stroke_color, width=int(stroke_w * 0.6))
        d.line([(x0 + 10, scy + h * 0.15), (x1 - 10, scy + h * 0.15 + 8)], fill=stroke_color, width=int(stroke_w * 0.6))

    if center_dot:
        # Cheese center dot
        dot_r = w * 0.18
        d.ellipse([scx - dot_r, y0 + radius * 0.7 - dot_r, scx + dot_r, y0 + radius * 0.7 + dot_r], fill=(255, 85, 0, 255))

    # Rotate
    rotated = scratch.rotate(-angle_deg, resample=Image.Resampling.BICUBIC)

    # Paste onto base
    px = int(cx - scratch_size / 2)
    py = int(cy - scratch_size / 2)
    base_img.alpha_composite(rotated, (px, py))

def generate_sakusales_icon(size=2048):
    # Supersampled at 2048x2048 for crisp edges
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    scale = size / 512.0
    d = ImageDraw.Draw(img)

    # 1. Background Tangerine Squircle
    bg_radius = int(128 * scale)
    d.rounded_rectangle([0, 0, size, size], radius=bg_radius, fill=(255, 85, 0, 255))

    # 2. Left Star Sparkle (Top-Left)
    star_left = create_star_polygon(96 * scale, 132 * scale, 34 * scale, 10 * scale, points=4)
    d.polygon(star_left, fill=(255, 224, 102, 255), outline=(24, 25, 31, 255))
    # Thicken outline
    for i in range(len(star_left)):
        p1 = star_left[i]
        p2 = star_left[(i + 1) % len(star_left)]
        d.line([p1, p2], fill=(24, 25, 31, 255), width=int(6 * scale))

    # 3. Right Fast-Sales Star Sparkle (Top-Right)
    star_right = create_star_polygon(406 * scale, 116 * scale, 48 * scale, 14 * scale, points=4)
    d.polygon(star_right, fill=(255, 199, 0, 255), outline=(24, 25, 31, 255))
    for i in range(len(star_right)):
        p1 = star_right[i]
        p2 = star_right[(i + 1) % len(star_right)]
        d.line([p1, p2], fill=(24, 25, 31, 255), width=int(9 * scale))

    # 4. Secondary Snack Stick (Right, Cheese Yellow, tilted 14 deg)
    draw_tilted_rect(
        img,
        cx=294 * scale,
        cy=165 * scale,
        w=44 * scale,
        h=110 * scale,
        radius=22 * scale,
        angle_deg=14,
        fill_color=(255, 224, 102, 255),
        stroke_color=(24, 25, 31, 255),
        stroke_w=int(12 * scale),
        stripes=True,
        center_dot=False
    )

    # 5. Primary Crispy Keju Aroma Stick (Left, Golden Cheese, tilted -16 deg)
    draw_tilted_rect(
        img,
        cx=216 * scale,
        cy=150 * scale,
        w=56 * scale,
        h=130 * scale,
        radius=26 * scale,
        angle_deg=-16,
        fill_color=(255, 199, 0, 255),
        stroke_color=(24, 25, 31, 255),
        stroke_w=int(12 * scale),
        stripes=True,
        center_dot=True
    )

    # Refresh draw handle after composite
    d = ImageDraw.Draw(img)

    # 6. Pocket Body (Saku)
    # Using polygon + bottom rounded curve
    x_l = 136 * scale
    x_r = 376 * scale
    y_top = 210 * scale
    y_straight = 338 * scale
    y_bottom = 442 * scale
    center_x = 256 * scale

    pocket_pts = [(x_l, y_top), (x_l, y_straight)]
    # Curve bottom from left straight to right straight via bottom center
    steps = 40
    for i in range(steps + 1):
        t = i / steps
        # Bezier curve: (x_l, y_straight) -> (x_l, y_bottom) -> (center_x, y_bottom) -> (x_r, y_bottom) -> (x_r, y_straight)
        # Using quadratic segments
        if t <= 0.5:
            local_t = t * 2
            # from (x_l, y_straight) to (center_x, y_bottom) with ctrl (x_l + (center_x - x_l)*0.2, y_bottom)
            bx = (1 - local_t)**2 * x_l + 2 * (1 - local_t) * local_t * (x_l + 30 * scale) + local_t**2 * center_x
            by = (1 - local_t)**2 * y_straight + 2 * (1 - local_t) * local_t * y_bottom + local_t**2 * y_bottom
        else:
            local_t = (t - 0.5) * 2
            bx = (1 - local_t)**2 * center_x + 2 * (1 - local_t) * local_t * (x_r - 30 * scale) + local_t**2 * x_r
            by = (1 - local_t)**2 * y_bottom + 2 * (1 - local_t) * local_t * y_bottom + local_t**2 * y_straight
        pocket_pts.append((bx, by))

    pocket_pts.append((x_r, y_top))

    d.polygon(pocket_pts, fill=(255, 255, 255, 255))
    # Thicken outline of pocket body
    stroke_pocket = int(12 * scale)
    for i in range(len(pocket_pts) - 1):
        d.line([pocket_pts[i], pocket_pts[i + 1]], fill=(24, 25, 31, 255), width=stroke_pocket)
    d.line([pocket_pts[-1], pocket_pts[0]], fill=(24, 25, 31, 255), width=stroke_pocket)

    # 7. Decorative Stitching Inside Pocket
    # Inset pocket dashed curve
    stitch_pts = []
    sx_l = 160 * scale
    sx_r = 352 * scale
    sy_top = 236 * scale
    sy_straight = 326 * scale
    sy_bottom = 406 * scale

    for i in range(0, 31, 3):
        t = i / 30.0
        if t <= 0.5:
            lt = t * 2
            px = (1 - lt)**2 * sx_l + 2 * (1 - lt) * lt * (sx_l + 25 * scale) + lt**2 * center_x
            py = (1 - lt)**2 * sy_straight + 2 * (1 - lt) * lt * sy_bottom + lt**2 * sy_bottom
        else:
            lt = (t - 0.5) * 2
            px = (1 - lt)**2 * center_x + 2 * (1 - lt) * lt * (sx_r - 25 * scale) + lt**2 * sx_r
            py = (1 - lt)**2 * sy_bottom + 2 * (1 - lt) * lt * sy_bottom + lt**2 * sy_straight
        if i % 2 == 0:
            d.ellipse([px - 3 * scale, py - 3 * scale, px + 3 * scale, py + 3 * scale], fill=(24, 25, 31, 255))

    # 8. Pocket Top Hem/Rim
    hem_x0 = 120 * scale
    hem_y0 = 184 * scale
    hem_x1 = 392 * scale
    hem_y1 = 218 * scale
    d.rounded_rectangle(
        [hem_x0, hem_y0, hem_x1, hem_y1],
        radius=17 * scale,
        fill=(255, 199, 0, 255),
        outline=(24, 25, 31, 255),
        width=int(12 * scale)
    )

    # 9. Rosy Cheeks
    cheek_r = 8 * scale
    d.ellipse([196 * scale - cheek_r, 305 * scale - cheek_r, 196 * scale + cheek_r, 305 * scale + cheek_r], fill=(255, 199, 0, 255))
    d.ellipse([316 * scale - cheek_r, 305 * scale - cheek_r, 316 * scale + cheek_r, 305 * scale + cheek_r], fill=(255, 199, 0, 255))

    # 10. Cheerful Smile (Arc)
    smile_bbox = [216 * scale, 290 * scale, 296 * scale, 345 * scale]
    d.arc(smile_bbox, start=20, end=160, fill=(255, 85, 0, 255), width=int(12 * scale))

    return img

def main():
    print("Generating high-res SakuSales icon (2048x2048)...")
    master = generate_sakusales_icon(2048)

    # Export targets
    targets = {
        "assets/icon/app_icon.png": 512,
        "assets/icon/app_icon_round.png": 512,
        "android/app/src/main/res/mipmap-mdpi/ic_launcher.png": 48,
        "android/app/src/main/res/mipmap-hdpi/ic_launcher.png": 72,
        "android/app/src/main/res/mipmap-xhdpi/ic_launcher.png": 96,
        "android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png": 144,
        "android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png": 192,
    }

    os.makedirs("assets/icon", exist_ok=True)

    for path, sz in targets.items():
        os.makedirs(os.path.dirname(path), exist_ok=True)
        resized = master.resize((sz, sz), resample=Image.Resampling.LANCZOS)
        resized.save(path, format="PNG")
        print(f"Saved: {path} ({sz}x{sz})")

    print("All app icons successfully generated!")

if __name__ == "__main__":
    main()
