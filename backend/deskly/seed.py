from email_validator import validate_email
from sqlalchemy import select

from .config import settings
from .db import SessionLocal
from .models import Category, Inventory, Movement, Product, ProductImage, User, Variant
from .security import PASSWORD

COLLECTIONS = [
    ("keyboards-mice", "Keyboards & Mice", "keys", "Better feel for every keystroke and click.",
     [("Slate 75 Mechanical Keyboard", 6499, "keyboard", 33, 14, "Tri-mode, hot-swappable, 75% layout"),
      ("Arc Wireless Mouse", 2499, "mouse", 7, 12, "Bluetooth and 2.4 GHz, 1600 DPI"),
      ("Grid 65 Mechanical Keyboard", 4899, "keyboard", 31, 11, "65% layout, USB-C, tactile switches"),
      ("Drift Silent Mouse", 1799, "mouse", 6, 11, "Quiet click, 2.4 GHz receiver"),
      ("Shift Low Profile Keyboard", 7999, "keyboard", 36, 13, "Low-profile switches, Bluetooth")]),
    ("desk-mats", "Desk Mats", "mats", "A softer surface for your daily essentials.",
     [("Field Desk Mat", 1499, "mat", 70, 32, "Woven textile, stitched edge"),
      ("Terrain Felt Desk Pad", 1899, "mat", 80, 30, "Recycled felt, non-slip base"),
      ("Mesa Compact Desk Mat", 999, "mat", 45, 28, "Textured fabric, washable finish"),
      ("Coast Extended Desk Mat", 2199, "mat", 90, 40, "Textured weave, natural rubber base"),
      ("Form Vegan Leather Mat", 2699, "mat", 80, 35, "Pebbled polyurethane, sealed edges")]),
    ("lighting", "Lighting", "lighting", "Focused, adjustable light for the way you work.",
     [("Beam Task Lamp", 3299, "lamp", 16, 18, "Aluminium, dimmable LED, three tones"),
      ("Halo Ambient Lamp", 2799, "lamp", 14, 14, "Opal diffuser, USB-C power"),
      ("Glow Monitor Light Bar", 3999, "lamp", 42, 9, "Asymmetric LED, monitor mount"),
      ("Dusk Clip Lamp", 1599, "lamp", 12, 14, "Flexible arm, desk clamp"),
      ("Orbit Portable Lamp", 3699, "lamp", 13, 13, "Rechargeable LED, touch dimming")]),
    ("stands", "Monitor & Laptop Stands", "stands", "Give your screen a lift and clear some space.",
     [("Rise Walnut Monitor Stand", 4299, "monitor-stand", 60, 22, "Walnut veneer, steel legs, 15 kg load"),
      ("Lift Foldable Laptop Stand", 1999, "laptop-stand", 26, 22, "Aluminium, six angles, 11–16 inch laptops"),
      ("Span Dual Monitor Riser", 5699, "monitor-stand", 95, 25, "Ash veneer, steel legs, 22 kg load"),
      ("Lean Vertical Laptop Dock", 1399, "laptop-stand", 12, 15, "Adjustable opening, silicone liner"),
      ("Pivot Desktop Stand", 3099, "laptop-stand", 25, 24, "Rotating base, hinged aluminium arm")]),
    ("cable-management", "Cable Management", "cables", "Keep everyday cables within reach and off the floor.",
     [("Loop Cable Clips", 499, "cable", 8, 4, "Three silicone clips, adhesive bases"),
      ("Tuck Under Desk Tray", 1699, "cable", 42, 13, "Steel tray, tool-free clamps"),
      ("Wrap Reusable Ties", 349, "cable", 12, 2, "Ten hook-and-loop ties"),
      ("Nest Cable Box", 1199, "cable", 32, 12, "Ventilated shell, removable lid"),
      ("Route Cable Sleeve", 699, "cable", 12, 3, "1.2 m woven split sleeve")]),
    ("tech-accessories", "Tech Accessories", "tech", "Power and ports right where you need them.",
     [("Dock 6-in-1 USB-C Hub", 3599, "hub", 12, 5, "HDMI, USB-A, SD, 60 W PD pass-through"),
      ("Charge 45W GaN Adapter", 2499, "charger", 5, 5, "Dual USB-C, 45 W total"),
      ("Link Braided USB-C Cable", 699, "cable", 10, 5, "2 m braided USB-C, 60 W PD"),
      ("Port 4 USB-A Hub", 1299, "hub", 9, 4, "Four USB-A ports, 5 Gbps"),
      ("Stack Wireless Charger", 1999, "charger", 9, 9, "Qi charging pad, USB-C input")]),
]


def seed(db):
    s = settings()
    if s.environment == "production" or not s.sample_catalogue:
        raise SystemExit("Sample seeding is restricted to development and test.")
    for index, (slug, label, photo, description, items) in enumerate(COLLECTIONS):
        category = db.scalar(select(Category).where(Category.slug == slug))
        if not category:
            category = Category(slug=slug, name=label, image=f"/media/{photo}.webp", description=description)
            db.add(category)
            db.flush()
        for number, (name, price, equipment, width, depth, specification) in enumerate(items):
            pslug = "-".join(name.lower().split())
            if db.scalar(select(Product.id).where(Product.slug == pslug)):
                continue
            product = Product(category_id=category.id, slug=pslug, name=name, brand="Deskly Studio",
                              description=f"{description} {specification}.",
                              specs={"Construction and features": specification, "Footprint": f"{width} × {depth} cm"},
                              aesthetics=[("Dark", "Minimal", "Modern", "Natural Wood", "Warm", "Modern")[index],
                                          "RGB" if index == 0 and number == 2 else "Minimal"],
                              purposes=["General Productivity", "Remote Work", ["Coding", "Studying", "Content Creation",
                                        "Remote Work", "Gaming", "Coding"][index]],
                              published=True, featured=number == 0 and index < 4)
            product.images.append(ProductImage(url=category.image, alt=f"Illustration of {label.lower()}"))
            db.add(product)
            db.flush()
            for variant_index, color in enumerate(("Graphite", ("Ivory", "Sage", "Sand", "Walnut", "Ivory", "Silver")[index])):
                qty = 0 if number == 4 else (4 if number == 3 and variant_index == 1 else 9 + index + number + variant_index)
                compatibility = {"equipment": equipment, "width_cm": width, "depth_cm": depth,
                                 "wireless": equipment == "mouse" or (equipment == "keyboard" and number != 2),
                                 "quiet": equipment == "keyboard" and number == 4,
                                 "requires": ["monitor"] if "Monitor Light" in name else
                                             ["laptop"] if equipment == "laptop-stand" else []}
                variant = Variant(product_id=product.id, sku=f"DS-{index+1:02}{number+1:02}-{variant_index+1}",
                                  name=color, color=color, price=(price + variant_index * 200) * 100,
                                  compatibility=compatibility, stock=Inventory(on_hand=qty))
                db.add(variant)
                db.flush()
                if qty:
                    db.add(Movement(variant_id=variant.id, delta=qty, reason="Development seed inventory"))
    if bool(s.seed_admin_email) != bool(s.seed_admin_password):
        raise SystemExit("Configure both SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD.")
    if s.seed_admin_email and s.seed_admin_password:
        if not 10 <= len(s.seed_admin_password) <= 128:
            raise SystemExit("Seed admin password must contain 10–128 characters.")
        email = validate_email(s.seed_admin_email, check_deliverability=False).normalized.lower()
        user = db.scalar(select(User).where(User.email == email))
        if user and user.role != "ADMIN":
            raise SystemExit("Seed admin email already belongs to a customer.")
        if not user:
            db.add(User(name="Deskly Administrator", email=email, password_hash=PASSWORD.hash(s.seed_admin_password), role="ADMIN"))
    db.commit()


if __name__ == "__main__":
    with SessionLocal() as session:
        seed(session)
