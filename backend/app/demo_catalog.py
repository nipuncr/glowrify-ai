"""Local-only guest catalog used for the unauthed classroom demo.

Images are external product/fashion photographs; try-on overlays remain separate
from catalogue photos because the latter are not transparent garment masks.
"""

_BASE = {
    "currency": "INR",
    "body_shapes": ["balanced", "shoulder-led", "hip-led"],
    "sizes": ["S", "M", "L", "XL"],
    "water_resistant": False,
    "anchors": {
        "left_shoulder": [0.28, 0.18],
        "right_shoulder": [0.72, 0.18],
        "hip": [0.5, 0.88],
    },
}

# Keep demo records separate from private account data. IDs are stable local demo IDs.
DEMO_CATALOG = [
    {**_BASE, "id": "demo-m-001", "sku": "DEMO-M-001", "name": "Oxford Button-Down Shirt", "category": "Shirt", "gender": "Men", "description": "Classic cotton button-down shirt.", "color": "Blue", "material": "Oxford cotton", "price_inr": 1699, "image_url": "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=900&q=85", "overlay_url": "/garments/glo-001.svg", "occasions": ["Casual", "Formal", "Work", "Travel"], "min_temp": 17, "max_temp": 34},
    {**_BASE, "id": "demo-m-002", "sku": "DEMO-M-002", "name": "Light Blue Pique Polo", "category": "Polo", "gender": "Men", "description": "Classic short-sleeve pique polo.", "color": "Light blue", "material": "Pique cotton", "price_inr": 1199, "image_url": "https://www.niamsports.com/cdn/shop/files/NM12043_Bobby_Light_Blue_Flat.png?v=1773855887&width=1500", "overlay_url": "/garments/glo-011.svg", "occasions": ["Casual", "Work", "Travel"], "min_temp": 22, "max_temp": 38},
    {**_BASE, "id": "demo-m-003", "sku": "DEMO-M-003", "name": "Minimal White T-Shirt", "category": "T-shirt", "gender": "Men", "description": "Minimal crew-neck everyday T-shirt.", "color": "White", "material": "Cotton jersey", "price_inr": 899, "image_url": "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=85", "overlay_url": "/garments/glo-012.svg", "occasions": ["Casual", "Active", "Travel"], "min_temp": 20, "max_temp": 42},
    {**_BASE, "id": "demo-m-004", "sku": "DEMO-M-004", "name": "Tailored Navy Blazer", "category": "Blazer", "gender": "Men", "description": "Smart tailored blazer for formal plans.", "color": "Navy", "material": "Wool blend", "price_inr": 3499, "image_url": "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=900&q=85", "overlay_url": "/garments/glo-003.svg", "occasions": ["Formal", "Work", "Party"], "min_temp": 10, "max_temp": 27},
    {**_BASE, "id": "demo-m-005", "sku": "DEMO-M-005", "name": "Graphite Casual T-Shirt", "category": "T-shirt", "gender": "Men", "description": "Everyday crew-neck T-shirt.", "color": "Graphite", "material": "Cotton jersey", "price_inr": 999, "image_url": "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?auto=format&fit=crop&w=900&q=85", "overlay_url": "/garments/glo-012.svg", "occasions": ["Casual", "Active", "Travel"], "min_temp": 20, "max_temp": 40},
    {**_BASE, "id": "demo-m-006", "sku": "DEMO-M-006", "name": "Black Polo Shirt", "category": "Polo", "gender": "Men", "description": "Clean black polo for relaxed occasions.", "color": "Black", "material": "Cotton pique", "price_inr": 1299, "image_url": "https://images.unsplash.com/photo-1714317438040-0e8584215699?auto=format&fit=crop&w=900&q=85", "overlay_url": "/garments/glo-011.svg", "occasions": ["Casual", "Work", "Travel"], "min_temp": 22, "max_temp": 38},
    {**_BASE, "id": "demo-w-001", "sku": "DEMO-W-001", "name": "White Oxford Shirt", "category": "Shirt", "gender": "Women", "description": "Relaxed white organic-cotton Oxford shirt.", "color": "White", "material": "Oxford cotton", "price_inr": 1699, "image_url": "https://sanvt.com/cdn/shop/files/Oversized-Oxfort-White-Women-SANVT-00.png?v=1713366996", "overlay_url": "/garments/glo-007.svg", "occasions": ["Casual", "Formal", "Work", "Travel"], "min_temp": 17, "max_temp": 34},
    {**_BASE, "id": "demo-w-002", "sku": "DEMO-W-002", "name": "Green Summer Dress", "category": "Dress", "gender": "Women", "description": "Light, flowing summer dress.", "color": "Green", "material": "Cotton blend", "price_inr": 2199, "image_url": "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=900&q=85", "overlay_url": "/garments/glo-014.svg", "occasions": ["Casual", "Party", "Travel"], "min_temp": 20, "max_temp": 38},
    {**_BASE, "id": "demo-w-003", "sku": "DEMO-W-003", "name": "Short-Sleeve Button Shirt", "category": "Shirt", "gender": "Women", "description": "Short-sleeve shirt for everyday styling.", "color": "White", "material": "Cotton", "price_inr": 1399, "image_url": "https://nafnafec.vtexassets.com/arquivos/ids/300662-800-auto?aspect=true&height=auto&v=638941723281700000&width=800", "overlay_url": "/garments/glo-007.svg", "occasions": ["Casual", "Work", "Travel"], "min_temp": 20, "max_temp": 38},
    {**_BASE, "id": "demo-w-004", "sku": "DEMO-W-004", "name": "Black Evening Dress", "category": "Dress", "gender": "Women", "description": "Minimal black dress for evening occasions.", "color": "Black", "material": "Polyester blend", "price_inr": 2499, "image_url": "https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=900&q=85", "overlay_url": "/garments/glo-014.svg", "occasions": ["Party", "Formal"], "min_temp": 12, "max_temp": 30},
    {**_BASE, "id": "demo-w-005", "sku": "DEMO-W-005", "name": "Classic Kurta Set", "category": "Kurta", "gender": "Women", "description": "Everyday kurta style for festive and casual plans.", "color": "Print", "material": "Cotton blend", "price_inr": 1799, "image_url": "https://www.rustorange.com/cdn/shop/files/SV-20240624-0054_600x.jpg?v=1721023601", "overlay_url": "/garments/glo-006.svg", "occasions": ["Casual", "Party", "Formal"], "min_temp": 20, "max_temp": 40},
    {**_BASE, "id": "demo-w-006", "sku": "DEMO-W-006", "name": "Blue Ruffle Dress", "category": "Dress", "gender": "Women", "description": "Blue dress with softly draped sleeves.", "color": "Blue", "material": "Cotton blend", "price_inr": 2299, "image_url": "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=900&q=85", "overlay_url": "/garments/glo-014.svg", "occasions": ["Casual", "Party", "Travel"], "min_temp": 18, "max_temp": 35},
]
