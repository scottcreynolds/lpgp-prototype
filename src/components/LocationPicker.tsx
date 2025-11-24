import { BOARD_LOCATIONS } from "@/config/locations";
import { Field, HStack, Input, NativeSelect } from "@chakra-ui/react";
import type { ChangeEvent } from "react";

interface LocationPickerProps {
  valueName: string;
  onNameChange: (v: string) => void;
  valueNumber: string | number;
  onNumberChange: (v: string | number) => void;
  label?: string;
  helperText?: string;
}

export default function LocationPicker({
  valueName,
  onNameChange,
  valueNumber,
  onNumberChange,
  label = "Board Location",
  helperText,
}: LocationPickerProps) {
  const handleNumberChange = (e: ChangeEvent<HTMLInputElement>) => {
    onNumberChange(e.target.value);
  };

  return (
    <Field.Root>
      <Field.Label>{label}</Field.Label>
      <HStack>
        <NativeSelect.Root>
          <NativeSelect.Field
            value={valueName}
            onChange={(e) => onNameChange(e.target.value)}
          >
            <option value="">Select location...</option>
            {BOARD_LOCATIONS.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>

        <Input
          type="number"
          min={0}
          placeholder="#"
          value={valueNumber}
          onChange={handleNumberChange}
          width="80px"
        />
      </HStack>
      {helperText && (
        <Field.HelperText color="fg">{helperText}</Field.HelperText>
      )}
    </Field.Root>
  );
}
