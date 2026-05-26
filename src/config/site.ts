export const siteConfig = {
  name: "PXL Creator",
  tagline: "Premium Cinematic Presets",
  description:
    "Handcrafted Lightroom presets, cinematic editing tools, and creator resources for photographers and filmmakers.",
  url: "https://pxlcreator.com",
  ogImage: "/opengraph-image",

  nav: [
    { label: "Store",    href: "/store"    },
    { label: "Presets",  href: "/presets"  },
    { label: "Courses",  href: "/courses"  },
    { label: "Blog",     href: "/blog"     },
    { label: "Premium",  href: "/premium"  },
    { label: "About",    href: "/about"    },
    { label: "Contact",  href: "/contact"  },
  ],

  socials: {
    youtube: "https://youtube.com/@pxlcreator04",
    instagram: "https://www.instagram.com/pxl_creator?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==",
    email: "mailto:creatorpxl@gmail.com",
  },
} as const;