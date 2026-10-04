/**
 * The product streams (B1). Single source of truth for:
 *   - ops/seed-product-streams.mjs   (creates one ProductStream record each)
 *   - verify-model.mjs               (one stream per PRODUCT_CATEGORY value)
 *
 * `category` is the PRODUCT_CATEGORY option value (src/options.ts) the stream
 * covers; `slug` is the ProductStream's unique key and must never change once
 * seeded. Plain ESM so the ops script and the static check need no build.
 */
export const PRODUCT_STREAMS = [
  {
    category: 'BATTERY_LI_ION',
    slug: 'battery-li-ion',
    name: 'Battery — Li-ion',
    icon: '🔋',
    sortOrder: 0,
    description: 'Portable, industrial and EV lithium-ion batteries: EU Battery Regulation (EU) 2023/1542, battery passport from 18 Feb 2027.',
  },
  {
    category: 'BATTERY_LMT',
    slug: 'battery-lmt',
    name: 'Battery — LMT',
    icon: '🛴',
    sortOrder: 1,
    description: 'Light means of transport batteries (e-bikes, e-scooters): EU Battery Regulation (EU) 2023/1542, battery passport from 18 Feb 2027.',
  },
  {
    category: 'TEXTILES',
    slug: 'textiles',
    name: 'Textiles',
    icon: '🧵',
    sortOrder: 2,
    description: 'Apparel and textiles: ESPR (EU) 2024/1781 priority product group, upcoming digital product passport.',
  },
  {
    category: 'ELECTRONICS',
    slug: 'electronics',
    name: 'Electronics',
    icon: '🔌',
    sortOrder: 3,
    description: 'Electrical and electronic equipment: CE marking, RoHS, WEEE and ESPR requirements.',
  },
  {
    category: 'FURNITURE',
    slug: 'furniture',
    name: 'Furniture',
    icon: '🪑',
    sortOrder: 4,
    description: 'Furniture: ESPR priority product group and General Product Safety Regulation (EU) 2023/988.',
  },
  {
    category: 'TOYS',
    slug: 'toys',
    name: 'Toys',
    icon: '🧸',
    sortOrder: 5,
    description: 'Toys: EU toy safety rules (the new Toy Safety Regulation with its digital product passport).',
  },
  {
    category: 'MACHINERY',
    slug: 'machinery',
    name: 'Machinery',
    icon: '⚙️',
    sortOrder: 6,
    description: 'Machinery: Machinery Regulation (EU) 2023/1230, replacing the Machinery Directive.',
  },
  {
    category: 'MEDICAL_DEVICES',
    slug: 'medical-devices',
    name: 'Medical Devices',
    icon: '🩺',
    sortOrder: 7,
    description: 'Medical devices: MDR (EU) 2017/745, EU authorised representative obligations.',
  },
  {
    category: 'OTHER',
    slug: 'other',
    name: 'Other',
    icon: '📦',
    sortOrder: 8,
    description: 'Products outside the named streams.',
  },
];
