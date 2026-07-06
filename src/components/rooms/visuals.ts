/**
 * Maps a room-category type to a consistent icon + gradient + accent colour,
 * reusing the same visual language already present on the facility dashboard.
 * Falls back to a neutral brand gradient for any unknown/new category.
 */
export interface CategoryVisual {
  icon: string;
  gradient: string;
  accent: string;
}

const VISUALS: Record<string, CategoryVisual> = {
  "Single Bed Rooms": {
    icon: "🛏️",
    gradient: "linear-gradient(135deg, #10b981, #06b6d4)",
    accent: "#10b981",
  },
  "Double Bed Rooms": {
    icon: "🏨",
    gradient: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    accent: "#6366f1",
  },
  "Dormitory (Single Bed)": {
    icon: "🏥",
    gradient: "linear-gradient(135deg, #f59e0b, #f97316)",
    accent: "#f59e0b",
  },
  ICU: {
    icon: "🫀",
    gradient: "linear-gradient(135deg, #ef4444, #f43f5e)",
    accent: "#ef4444",
  },
  "General Ward": {
    icon: "🩺",
    gradient: "linear-gradient(135deg, #14b8a6, #0ea5e9)",
    accent: "#14b8a6",
  },
};

const FALLBACK: CategoryVisual = {
  icon: "🏨",
  gradient: "linear-gradient(135deg, #6366f1, #8b5cf6)",
  accent: "#6366f1",
};

export function categoryVisual(roomType: string): CategoryVisual {
  return VISUALS[roomType] ?? FALLBACK;
}
