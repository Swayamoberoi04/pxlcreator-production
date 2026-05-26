export type CourseLevel    = "Beginner" | "Intermediate" | "Advanced"
export type CourseCategory = "Editing" | "Color Grading" | "Business" | "Composition" | "Filmmaking"

export interface CourseModule {
  title: string
  lessons: number
  duration: string  // e.g. "45 min"
}

export interface Course {
  id: string
  slug: string
  title: string
  tagline: string
  description?: string
  instructor: string
  instructorRole: string
  instructorInitials: string
  price: number
  originalPrice?: number
  level: CourseLevel
  category: CourseCategory
  totalLessons: number
  totalHours: number
  students: number
  rating: number
  reviewCount: number
  badge?: string
  coverGradient: string
  coverImage?:   string
  isFeatured: boolean
  whatYouLearn?: string[]
  modules?: CourseModule[]
  includes?: string[]
}
