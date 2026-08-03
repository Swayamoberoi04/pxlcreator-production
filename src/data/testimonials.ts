export interface Testimonial {
  id: string
  name: string
  role: string           // e.g. "Travel Photographer"
  avatarInitials: string // shown until real avatar images exist
  quote: string
  rating: number         // 1–5
  pack: string           // which preset pack they're reviewing
}

export const TESTIMONIALS: Testimonial[] = [
  {
    id: "1",
    name: "Arjun Mehta",
    role: "Travel Photographer",
    avatarInitials: "AM",
    quote:
      "The Desert Gold Pack completely transformed my Rajasthan shots. Warm, rich, and consistent across every lighting condition. Saves me 2 hours of editing per shoot.",
    rating: 5,
    pack: "Desert Gold Pack",
  },
  {
    id: "2",
    name: "Sofia Reyes",
    role: "Content Creator",
    avatarInitials: "SR",
    quote:
      "I've tried dozens of preset packs. PXL Creator presets are the only ones that actually hold up on skin tones. My Instagram feed has never looked more cohesive.",
    rating: 5,
    pack: "Sunset Portrait Pack",
  },
  {
    id: "3",
    name: "Luca Bianchi",
    role: "Filmmaker & Editor",
    avatarInitials: "LB",
    quote:
      "The Film Emulation Bundle gave me a look I've been chasing for years. The grain structure is insanely authentic. Worth every rupee.",
    rating: 5,
    pack: "Film Emulation Bundle",
  },
]

export const SITE_STATS = [
  { value: "22+",  label: "Preset Packs"   },
  { value: "12",   label: "Free Packs"     },
  { value: "5",    label: "Courses"        },
] as const
