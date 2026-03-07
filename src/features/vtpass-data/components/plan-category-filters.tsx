import { Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

const STAR_YELLOW = "#EAB308";

/** Order for category filter chips. "All" is synthetic. */
export const PLAN_CATEGORY_ORDER = [
  "All",
  "Daily",
  "Weekly",
  "Monthly",
  "Night",
  "Weekend",
  "Social",
  "SME",
  "Hynetflex",
  "Broadband router",
  "Others",
];

export type CategoryCount = Record<string, number>;

export const FAVOURITES_CATEGORY = "Favourites";

interface PlanCategoryFiltersProps {
  categories: string[];
  categoryCounts: CategoryCount;
  totalCount: number;
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  /** When > 0, show a "Favourites (n)" chip as the first option. */
  favouritesCount?: number;
}

export function PlanCategoryFilters({
  categories,
  categoryCounts,
  totalCount,
  selectedCategory,
  onSelectCategory,
  favouritesCount = 0,
}: PlanCategoryFiltersProps) {
  const ordered = [
    ...(favouritesCount > 0 ? [FAVOURITES_CATEGORY] : []),
    "All",
    ...PLAN_CATEGORY_ORDER.filter((k) => k !== "All" && categories.includes(k)),
    ...categories.filter((k) => !PLAN_CATEGORY_ORDER.includes(k)),
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="mb-4"
      contentContainerStyle={{ gap: 8, paddingRight: 16 }}
    >
      {ordered.map((cat) => {
        const isSelected = selectedCategory === cat;
        const count =
          cat === FAVOURITES_CATEGORY
            ? favouritesCount
            : cat === "All"
              ? totalCount
              : categoryCounts[cat] ?? 0;
        const isFavourites = cat === FAVOURITES_CATEGORY;
        return (
          <Pressable
            key={cat}
            onPress={() => onSelectCategory(cat)}
            className={cn(
              "flex-row items-center gap-1.5 rounded-full px-3 py-2",
              isSelected ? "bg-primary" : "bg-muted/50",
            )}
          >
            {isFavourites ? (
              <Ionicons
                name="star"
                size={12}
                color={isSelected ? "#fff" : STAR_YELLOW}
              />
            ) : isSelected ? (
              <Ionicons name="wifi" size={12} color="#fff" />
            ) : null}
            <Text
              className={cn(
                "text-[12px] font-medium",
                isSelected ? "text-white" : "text-muted-foreground",
              )}
            >
              {isFavourites ? count : `${cat} (${count})`}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
