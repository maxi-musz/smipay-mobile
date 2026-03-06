import { View } from "react-native";

import { BottomSheetModal } from "@/components/ui/modals";
import { FundMethodOption } from "./fund-method-option";

interface AddMoneyModalProps {
  visible: boolean;
  onClose: () => void;
  onFundWithCard: () => void;
  onFundViaTag: () => void;
}

export function AddMoneyModal({
  visible,
  onClose,
  onFundWithCard,
  onFundViaTag,
}: AddMoneyModalProps) {
  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      title="Add Money"
      closeOnBackdrop
      showHandle
    >
      <View className="gap-3">
        <FundMethodOption
          title="Fund with Card"
          description="Fund with card, bank transfer or USSD."
          icon="card-outline"
          onPress={onFundWithCard}
        />
        <FundMethodOption
          title="Fund Via Tag"
          description="Receive money from another SmiPay user via your tag."
          icon="pricetag-outline"
          onPress={onFundViaTag}
        />
      </View>
    </BottomSheetModal>
  );
}
