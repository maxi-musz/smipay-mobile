import { create } from "zustand";

import { createSelectors } from "@/store/create-selectors";
import {
  getIntlCountries,
  getIntlProductTypes,
  getIntlOperators,
  getIntlVariations,
} from "@/api";
import type {
  IntlCountry,
  IntlProductType,
  IntlOperator,
  IntlVariation,
} from "@/types/vtpass-intl-airtime";

interface IntlAirtimeState {
  countries: IntlCountry[];
  productTypes: IntlProductType[];
  operators: IntlOperator[];
  variations: IntlVariation[];

  selectedCountry: IntlCountry | null;
  selectedProductType: IntlProductType | null;
  selectedOperator: IntlOperator | null;
  selectedVariation: IntlVariation | null;

  isLoadingCountries: boolean;
  isLoadingProductTypes: boolean;
  isLoadingOperators: boolean;
  isLoadingVariations: boolean;

  countriesError: string | null;
  productTypesError: string | null;
  operatorsError: string | null;
  variationsError: string | null;
}

interface IntlAirtimeActions {
  fetchCountries: (forceRefresh?: boolean) => Promise<void>;
  fetchProductTypes: (code: string) => Promise<void>;
  fetchOperators: (code: string, productTypeId: string) => Promise<void>;
  fetchVariations: (
    operatorId: string,
    productTypeId: string,
  ) => Promise<void>;
  setSelectedCountry: (c: IntlCountry | null) => void;
  setSelectedProductType: (p: IntlProductType | null) => void;
  setSelectedOperator: (o: IntlOperator | null) => void;
  setSelectedVariation: (v: IntlVariation | null) => void;
  reset: () => void;
}

type IntlAirtimeStore = IntlAirtimeState & IntlAirtimeActions;

const initialState: IntlAirtimeState = {
  countries: [],
  productTypes: [],
  operators: [],
  variations: [],

  selectedCountry: null,
  selectedProductType: null,
  selectedOperator: null,
  selectedVariation: null,

  isLoadingCountries: false,
  isLoadingProductTypes: false,
  isLoadingOperators: false,
  isLoadingVariations: false,

  countriesError: null,
  productTypesError: null,
  operatorsError: null,
  variationsError: null,
};

function getErrorMessage(e: unknown): string {
  const err = e as {
    response?: { data?: { message?: string } };
    message?: string;
  };
  return err?.response?.data?.message ?? err?.message ?? "Something went wrong";
}

const _useIntlAirtimeStore = create<IntlAirtimeStore>()((set, get) => ({
  ...initialState,

  fetchCountries: async (forceRefresh = false) => {
    const { countries, isLoadingCountries } = get();
    if (isLoadingCountries) return;
    if (!forceRefresh && countries.length > 0) return;

    set({
      isLoadingCountries: true,
      countriesError: null,
    });

    try {
      const res = await getIntlCountries();
      if (res.success && res.data?.countries) {
        set({
          countries: res.data.countries,
          isLoadingCountries: false,
          countriesError: null,
        });
      } else {
        set({
          countriesError:
            (res as { message?: string }).message ?? "Failed to load countries",
          isLoadingCountries: false,
        });
      }
    } catch (e) {
      set({
        countriesError: getErrorMessage(e),
        isLoadingCountries: false,
      });
    }
  },

  fetchProductTypes: async (code: string) => {
    const { isLoadingProductTypes } = get();
    if (isLoadingProductTypes) return;

    set({
      isLoadingProductTypes: true,
      productTypesError: null,
      productTypes: [],
      operators: [],
      variations: [],
      operatorsError: null,
      variationsError: null,
    });

    try {
      const res = await getIntlProductTypes(code);
      if (res.success && res.data) {
        set({
          productTypes: res.data,
          isLoadingProductTypes: false,
          productTypesError: null,
        });
      } else {
        set({
          productTypesError:
            (res as { message?: string }).message ??
            "Failed to load product types",
          isLoadingProductTypes: false,
        });
      }
    } catch (e) {
      set({
        productTypesError: getErrorMessage(e),
        isLoadingProductTypes: false,
      });
    }
  },

  fetchOperators: async (code: string, productTypeId: string) => {
    const { isLoadingOperators } = get();
    if (isLoadingOperators) return;

    set({
      isLoadingOperators: true,
      operatorsError: null,
      operators: [],
      variations: [],
      variationsError: null,
    });

    try {
      const res = await getIntlOperators(code, productTypeId);
      if (res.success && res.data) {
        set({
          operators: res.data,
          isLoadingOperators: false,
          operatorsError: null,
        });
      } else {
        set({
          operatorsError:
            (res as { message?: string }).message ?? "Failed to load operators",
          isLoadingOperators: false,
        });
      }
    } catch (e) {
      set({
        operatorsError: getErrorMessage(e),
        isLoadingOperators: false,
      });
    }
  },

  fetchVariations: async (operatorId: string, productTypeId: string) => {
    const { isLoadingVariations } = get();
    if (isLoadingVariations) return;

    set({
      isLoadingVariations: true,
      variationsError: null,
      variations: [],
    });

    try {
      const res = await getIntlVariations(operatorId, productTypeId);
      if (res.success && res.data?.variations) {
        set({
          variations: res.data.variations,
          isLoadingVariations: false,
          variationsError: null,
        });
      } else {
        set({
          variationsError:
            (res as { message?: string }).message ?? "Failed to load plans",
          isLoadingVariations: false,
        });
      }
    } catch (e) {
      set({
        variationsError: getErrorMessage(e),
        isLoadingVariations: false,
      });
    }
  },

  setSelectedCountry: (c) =>
    set({
      selectedCountry: c,
      selectedProductType: null,
      selectedOperator: null,
      selectedVariation: null,
    }),
  setSelectedProductType: (p) =>
    set({
      selectedProductType: p,
      selectedOperator: null,
      selectedVariation: null,
    }),
  setSelectedOperator: (o) =>
    set({ selectedOperator: o, selectedVariation: null }),
  setSelectedVariation: (v) => set({ selectedVariation: v }),
  reset: () => set(initialState),
}));

export const useIntlAirtimeStore = createSelectors(_useIntlAirtimeStore);
