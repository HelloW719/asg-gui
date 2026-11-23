<script setup lang="ts">
import { Check, ChevronDown } from "@lucide/vue";
import {
  SelectContent,
  SelectIcon,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectPortal,
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectViewport,
} from "reka-ui";
import { computed } from "vue";

export interface SelectOption {
  label: string;
  value: string;
}

const props = withDefaults(
  defineProps<{
    modelValue?: string | undefined;
    options: ReadonlyArray<SelectOption>;
    accessibleLabel: string;
    disabled?: boolean;
    placeholder?: string;
  }>(),
  {
    disabled: false,
    placeholder: "请选择",
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const selectedValue = computed(() => {
  const index = props.options.findIndex(
    (option) => option.value === (props.modelValue ?? ""),
  );
  return index >= 0 ? String(index) : undefined;
});

function selectOption(value: unknown): void {
  const option = props.options[Number(value)];
  if (option) emit("update:modelValue", option.value);
}
</script>

<template>
  <div class="select-field">
    <SelectRoot
      v-bind="selectedValue === undefined ? {} : { modelValue: selectedValue }"
      :disabled="disabled"
      @update:model-value="selectOption"
    >
      <SelectTrigger
        class="select-field__trigger"
        :aria-label="accessibleLabel"
      >
        <SelectValue class="select-field__value" :placeholder="placeholder" />
        <SelectIcon as-child>
          <ChevronDown class="select-field__chevron" :size="15" aria-hidden="true" />
        </SelectIcon>
      </SelectTrigger>

      <SelectPortal to=".app-root">
        <SelectContent
          class="select-field__content"
          position="popper"
          :side-offset="6"
          :collision-padding="12"
        >
          <SelectViewport class="select-field__viewport">
            <SelectItem
              v-for="(option, index) in options"
              :key="option.value"
              class="select-field__item"
              :value="String(index)"
              :text-value="option.label"
              :disabled="disabled"
            >
              <span class="select-field__check" aria-hidden="true">
                <SelectItemIndicator force-mount>
                  <Check :size="14" />
                </SelectItemIndicator>
              </span>
              <SelectItemText class="select-field__label">
                {{ option.label }}
              </SelectItemText>
            </SelectItem>
          </SelectViewport>
        </SelectContent>
      </SelectPortal>
    </SelectRoot>
  </div>
</template>
