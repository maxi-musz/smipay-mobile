import { Image, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Text } from "@/components/ui/text";
import { colors } from "@/constants/colors";
import { getEducationLogo } from "../lib/education-logos";
import { cn } from "@/lib/utils";
import {
  EDUCATION_PRODUCTS,
  type EducationProduct,
} from "../lib/constants";
import type { EducationProductID } from "@/types/vtpass-education";

interface ProductSelectorProps {
  selectedID: EducationProductID | null;
  onSelect: (p: EducationProduct) => void;
}

function ProductChip({
  product,
  isSelected,
  onPress,
}: {
  product: EducationProduct;
  isSelected: boolean;
  onPress: () => void;
}) {
  const logo = getEducationLogo(product.serviceID);

  return (
    <Pressable onPress={onPress} className="items-center flex-1">
      <View
        className={cn(
          "h-14 w-14 items-center justify-center overflow-hidden rounded-full border-2",
          isSelected
            ? "border-primary bg-primary/5"
            : "border-border bg-muted/30",
        )}
      >
        {logo ? (
          <Image
            source={logo}
            style={{ width: 42, height: 42 }}
            resizeMode="contain"
          />
        ) : (
          <View className="h-full w-full items-center justify-center rounded-full bg-muted">
            <Ionicons name="school" size={24} color={colors.gray[500]} />
          </View>
        )}
      </View>
      <Text
        className={cn(
          "mt-2 text-[10px] font-medium max-w-[72px] text-center",
          isSelected ? "text-primary" : "text-muted-foreground",
        )}
        numberOfLines={2}
      >
        {product.name}
      </Text>
    </Pressable>
  );
}

export function ProductSelector({
  selectedID,
  onSelect,
}: ProductSelectorProps) {
  return (
    <View className="mt-6">
      <Text className="mb-3 text-base font-bold text-foreground">
        Select product
      </Text>
      <View className="flex-row justify-around">
        {EDUCATION_PRODUCTS.map((p) => (
          <ProductChip
            key={p.serviceID}
            product={p}
            isSelected={selectedID === p.serviceID}
            onPress={() => onSelect(p)}
          />
        ))}
      </View>
    </View>
  );
}
