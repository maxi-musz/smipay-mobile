import { useEffect, useRef, useState } from "react";
import { Modal, Pressable, View } from "react-native";
import { WebView } from "react-native-webview";
import type { WebViewNavigation } from "react-native-webview";
// WebViewNavigation used for onNavigationStateChange typing
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { initialisePaystackFunding, cancelPaystackFunding } from "@/api";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { Spinner } from "@/components/ui/loaders";
import { handleApiError } from "@/lib/errors";
import {
  setPendingFundingReference,
  clearPendingFundingReference,
} from "@/lib/pending-funding";
import { useFundingResultSheetStore } from "@/store";
import { BottomSheetModal } from "@/components/ui/modals";
import { colors } from "@/constants/colors";

import { AmountStep } from "./amount-step";
import { PAYSTACK_FUNDING_CALLBACK_URL } from "./constants";

type Step = "amount" | "webview";

interface FundWithCardFlowProps {
  visible: boolean;
  onClose: () => void;
}

export function FundWithCardFlow({ visible, onClose }: FundWithCardFlowProps) {
  const [step, setStep] = useState<Step>("amount");
  const [loading, setLoading] = useState(false);
  const [paystackUrl, setPaystackUrl] = useState<string | null>(null);
  const [webviewLoading, setWebviewLoading] = useState(true);
  const referenceRef = useRef<string | null>(null);
  const amountRef = useRef<number>(0);

  async function handleContinue(amount: number) {
    setLoading(true);
    try {
      const response = await initialisePaystackFunding(
        amount,
        PAYSTACK_FUNDING_CALLBACK_URL,
      );
      if (!response.success || !response.data) {
        handleApiError(new Error(response.message ?? "Failed to start payment"));
        return;
      }
      const { authorization_url, reference } = response.data;
      await setPendingFundingReference(reference);
      referenceRef.current = reference;
      amountRef.current = amount;
      setPaystackUrl(authorization_url);
      setStep("webview");
    } catch (e) {
      handleApiError(e);
    } finally {
      setLoading(false);
    }
  }

  function finishAndVerify() {
    const ref = referenceRef.current;
    const amt = amountRef.current;
    clearPendingFundingReference().catch(() => {});
    resetState();
    onClose();
    if (ref) {
      setTimeout(() => {
        useFundingResultSheetStore.getState().setFunding(ref, amt);
      }, 400);
    }
  }

  function handleDismissWebView() {
    const ref = referenceRef.current;
    const amt = amountRef.current;
    if (ref) {
      // User closed the WebView manually -- still verify (they might have paid).
      clearPendingFundingReference().catch(() => {});
      resetState();
      onClose();
      setTimeout(() => {
        useFundingResultSheetStore.getState().setFunding(ref, amt);
      }, 400);
    } else {
      resetState();
      onClose();
    }
  }

  function handleCancelBeforePayment() {
    const ref = referenceRef.current;
    if (ref) {
      cancelPaystackFunding(ref).catch(() => {});
      clearPendingFundingReference().catch(() => {});
    }
    resetState();
    onClose();
  }

  function resetState() {
    setStep("amount");
    setPaystackUrl(null);
    setWebviewLoading(true);
    referenceRef.current = null;
    amountRef.current = 0;
  }

  useEffect(() => {
    if (!visible) {
      resetState();
    }
  }, [visible]);

  if (step === "webview" && paystackUrl) {
    return (
      <PaystackWebView
        url={paystackUrl}
        loading={webviewLoading}
        onLoadingChange={setWebviewLoading}
        onRedirect={finishAndVerify}
        onDismiss={handleDismissWebView}
      />
    );
  }

  return (
    <BottomSheetModal
      visible={visible}
      onClose={handleCancelBeforePayment}
      title="Fund with Card"
      closeOnBackdrop
      showHandle
    >
      <AmountStep
        onContinue={handleContinue}
        onBack={onClose}
        isLoading={loading}
      />
    </BottomSheetModal>
  );
}

const INTERCEPT_REDIRECT_JS = `
(function() {
  function interceptRedirect(url) {
    if (url && typeof url === 'string' && url.startsWith('smipay://')) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'redirect', url: url }));
      return true;
    }
    return false;
  }
  var origAssign = window.location.assign.bind(window.location);
  window.location.assign = function(url) {
    if (!interceptRedirect(url)) origAssign(url);
  };
  var origReplace = window.location.replace.bind(window.location);
  window.location.replace = function(url) {
    if (!interceptRedirect(url)) origReplace(url);
  };
  var desc = Object.getOwnPropertyDescriptor(Location.prototype, 'href');
  if (desc && desc.set) {
    var origSet = desc.set;
    Object.defineProperty(window.location, 'href', {
      set: function(url) { if (!interceptRedirect(url)) origSet.call(this, url); },
      get: desc.get,
      configurable: true,
    });
  }
})();
true;
`;

function PaystackWebView({
  url,
  loading,
  onLoadingChange,
  onRedirect,
  onDismiss,
}: {
  url: string;
  loading: boolean;
  onLoadingChange: (loading: boolean) => void;
  onRedirect: () => void;
  onDismiss: () => void;
}) {
  const insets = useSafeAreaInsets();
  const hasRedirectedRef = useRef(false);

  function handleMessage(event: { nativeEvent: { data: string } }) {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === "redirect" && !hasRedirectedRef.current) {
        hasRedirectedRef.current = true;
        onRedirect();
      }
    } catch {}
  }

  function handleNavigationChange(event: WebViewNavigation) {
    if (
      event.url?.startsWith("smipay://") &&
      !hasRedirectedRef.current
    ) {
      hasRedirectedRef.current = true;
      onRedirect();
    }
  }

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onDismiss}
    >
      <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
        <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
          <Text className="text-base font-semibold text-foreground">
            Complete Payment
          </Text>
          <Pressable
            onPress={onDismiss}
            hitSlop={12}
            className="h-8 w-8 items-center justify-center rounded-full bg-muted"
          >
            <Ionicons name="close" size={18} color={colors.gray[500]} />
          </Pressable>
        </View>

        {loading && (
          <View className="absolute inset-0 z-10 items-center justify-center bg-background">
            <Spinner size="large" color={colors.orange[500]} />
            <Text className="mt-3 text-muted-foreground">
              Loading payment page…
            </Text>
          </View>
        )}

        <WebView
          source={{ uri: url }}
          originWhitelist={["*"]}
          injectedJavaScript={INTERCEPT_REDIRECT_JS}
          onMessage={handleMessage}
          onNavigationStateChange={handleNavigationChange}
          onShouldStartLoadWithRequest={(request) => {
            if (request.url.startsWith("smipay://")) {
              if (!hasRedirectedRef.current) {
                hasRedirectedRef.current = true;
                onRedirect();
              }
              return false;
            }
            return true;
          }}
          onLoadEnd={() => onLoadingChange(false)}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState={false}
          className="flex-1"
        />
      </View>
    </Modal>
  );
}
