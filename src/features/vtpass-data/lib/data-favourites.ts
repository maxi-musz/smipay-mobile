import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@smipay/data_plan_favourites";

export function favouriteId(serviceID: string, variationCode: string): string {
  return `${serviceID}|${variationCode}`;
}

async function getStoredFavourites(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

async function setStoredFavourites(ids: Set<string>): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

export function useDataFavourites() {
  const [favouritesSet, setFavouritesSet] = useState<Set<string>>(new Set());

  const loadFavourites = useCallback(async () => {
    const stored = await getStoredFavourites();
    setFavouritesSet(stored);
  }, []);

  useEffect(() => {
    loadFavourites();
  }, [loadFavourites]);

  const toggleFavourite = useCallback(
    async (serviceID: string, variationCode: string) => {
      const id = favouriteId(serviceID, variationCode);
      setFavouritesSet((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setStoredFavourites(next).catch(() => {});
        return next;
      });
    },
    [],
  );

  const isFavourite = useCallback(
    (serviceID: string, variationCode: string) => {
      return favouritesSet.has(favouriteId(serviceID, variationCode));
    },
    [favouritesSet],
  );

  const favouriteCountForProvider = useCallback(
    (serviceID: string, variationCodes: string[]) => {
      return variationCodes.filter((code) =>
        favouritesSet.has(favouriteId(serviceID, code)),
      ).length;
    },
    [favouritesSet],
  );

  return {
    favouritesSet,
    isFavourite,
    toggleFavourite,
    loadFavourites,
    favouriteCountForProvider,
  };
}
