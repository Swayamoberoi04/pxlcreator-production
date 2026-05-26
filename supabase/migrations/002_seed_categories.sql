-- ============================================================
-- PXL Creator — Seed Default Categories
-- Migration: 002_seed_categories.sql
-- ============================================================

INSERT INTO categories (name, slug, description, icon, color, order_index) VALUES
  (
    'Bundle',
    'bundle',
    'The best value way to start. Bundles combine multiple styles at a discounted price — perfect if you shoot across genres.',
    '📦',
    '#ffd700',
    1
  ),
  (
    'Cinematic',
    'cinematic',
    'Rich, intentional colour grading inspired by film directors. High contrast, warm shadows, and a look that feels finished from the first click.',
    '🎬',
    '#f59e0b',
    2
  ),
  (
    'Film Emulation',
    'film-emulation',
    'Authentic recreations of legendary film stocks — Kodak, Fuji, Ilford and more. Real grain structure, real colour casts, real character.',
    '🎞️',
    '#d97706',
    3
  ),
  (
    'Portrait',
    'portrait',
    'Built around skin. Every preset here has been tested across multiple skin tones to ensure it lifts and warms without going orange.',
    '🪞',
    '#ec4899',
    4
  ),
  (
    'Landscape',
    'landscape',
    'Made for wide open spaces. Whether you shoot arctic tundra or dense forest, these presets handle natural light with precision.',
    '🏔️',
    '#10b981',
    5
  ),
  (
    'Street',
    'street',
    'Gritty, high-contrast, cinematic. For photographers who shoot cities, architecture, and people in motion.',
    '🏙️',
    '#6366f1',
    6
  )
ON CONFLICT (slug) DO NOTHING;
