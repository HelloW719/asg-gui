<script setup lang="ts">
import { ref, watch } from "vue";
import { useAppStatus } from "@/app/useAppStatus";
import { useAsgServices } from "@/app/useAsgServices";
import BaseButton from "@/shared/ui/BaseButton.vue";
import ConfirmDialog from "@/shared/ui/ConfirmDialog.vue";
import InlineNotice from "@/shared/ui/InlineNotice.vue";
import type { ConfigFieldInfo, ExtensionInfo } from "@/types/cli";

const props = defineProps<{
  extension: ExtensionInfo | null;
}>();

const emit = defineEmits<{
  close: [];
  saved: [id: string];
}>();

const appStatus = useAppStatus();
const sources = useAsgServices().sources;
const config = ref<Record<string, unknown> | null>(null);
const original = ref<Record<string, unknown> | null>(null);
const fields = ref<ConfigFieldInfo[]>([]);
const rawText = ref("");
const structuredDrafts = ref<Record<string, string>>({});
const fieldErrors = ref<Record<string, string>>({});
const rawMode = ref(false);
const saveOpen = ref(false);
const loading = ref(false);
const error = ref<string | null>(null);

function reset(): void {
  config.value = null;
  original.value = null;
  fields.value = [];
  rawText.value = "";
  structuredDrafts.value = {};
  fieldErrors.value = {};
  rawMode.value = false;
  saveOpen.value = false;
  error.value = null;
}

function syncRawConfig(): boolean {
  try {
    const parsed = JSON.parse(rawText.value) as unknown;
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
      throw new Error("配置根必须是 JSON 对象。");
    }
    config.value = parsed as Record<string, unknown>;
    error.value = null;
    return true;
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause);
    return false;
  }
}

function isStructuredField(type: string): boolean {
  return !["string", "number", "integer", "boolean"].includes(type);
}

function initializeStructuredDrafts(): void {
  if (!config.value) return;
  structuredDrafts.value = Object.fromEntries(
    fields.value
      .filter((field) => isStructuredField(field.type))
      .map((field) => [
        field.key,
        JSON.stringify(config.value?.[field.key], null, 2) ?? "null",
      ]),
  );
}

function parseStructuredField(field: ConfigFieldInfo): boolean {
  if (!config.value) return false;
  try {
    const value = JSON.parse(structuredDrafts.value[field.key] ?? "") as unknown;
    if (
      field.type === "object" &&
      (!value || Array.isArray(value) || typeof value !== "object")
    ) {
      throw new Error(`${field.key} 必须是 JSON 对象。`);
    }
    if (field.type === "array" && !Array.isArray(value)) {
      throw new Error(`${field.key} 必须是 JSON 数组。`);
    }
    config.value[field.key] = value;
    delete fieldErrors.value[field.key];
    return true;
  } catch (cause) {
    fieldErrors.value[field.key] =
      cause instanceof Error ? cause.message : String(cause);
    return false;
  }
}

function syncStructuredFields(): boolean {
  const structuredFields = fields.value.filter((field) =>
    isStructuredField(field.type),
  );
  return structuredFields.every(parseStructuredField);
}

async function save(): Promise<void> {
  saveOpen.value = false;
  const extension = props.extension;
  const current = config.value;
  const before = original.value;
  if (!extension || !current || !before) return;
  if (rawMode.value && !syncRawConfig()) return;
  if (!rawMode.value && !syncStructuredFields()) return;
  try {
    const changed = await sources.saveExtensionConfig(extension.id, current, before);
    if (changed) {
      await appStatus.refresh();
      emit("saved", extension.id);
    }
    emit("close");
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause);
  }
}

watch(
  () => props.extension,
  async (extension) => {
    reset();
    if (!extension) return;
    loading.value = true;
    try {
      const snapshot = await sources.loadExtensionConfig(extension);
      config.value = structuredClone(snapshot.config);
      original.value = structuredClone(snapshot.config);
      fields.value = snapshot.fields;
      rawText.value = JSON.stringify(snapshot.config, null, 2);
      rawMode.value = snapshot.fields.length === 0;
      initializeStructuredDrafts();
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : String(cause);
    } finally {
      loading.value = false;
    }
  },
  { immediate: true },
);
</script>

<template>
  <section v-if="extension" class="extension-editor">
    <div class="section-heading">
      <div>
        <span class="eyebrow">插件私有配置</span>
        <h2>{{ extension.id }}</h2>
      </div>
      <BaseButton size="compact" @click="emit('close')">关闭</BaseButton>
    </div>

    <InlineNotice
      v-if="error"
      tone="error"
      :message="error"
      dismissible
      @dismiss="error = null"
    />
    <p v-if="loading" class="empty-copy">正在读取扩展配置…</p>

    <template v-else-if="config">
      <label v-if="rawMode" class="field">
        <span>JSON 配置</span>
        <textarea
          v-model="rawText"
          rows="12"
          spellcheck="false"
          @blur="syncRawConfig"
        />
      </label>
      <div v-else class="form-grid">
        <label v-for="field in fields" :key="field.key" class="field">
          <span>
            {{ field.key }}
            <small v-if="field.required">必填</small>
          </span>
          <input
            v-if="field.type === 'string'"
            v-model="config[field.key] as string"
            type="text"
          />
          <input
            v-else-if="field.type === 'number' || field.type === 'integer'"
            v-model.number="config[field.key] as number"
            type="number"
            :step="field.type === 'integer' ? '1' : 'any'"
          />
          <label v-else-if="field.type === 'boolean'" class="check-label">
            <input v-model="config[field.key] as boolean" type="checkbox" />
            启用
          </label>
          <textarea
            v-else
            v-model="structuredDrafts[field.key]"
            rows="5"
            spellcheck="false"
            @input="delete fieldErrors[field.key]"
            @blur="parseStructuredField(field)"
          />
          <small
            v-if="fieldErrors[field.key]"
            class="structured-field-error"
          >
            {{ fieldErrors[field.key] }}
          </small>
          <small v-if="field.description">{{ field.description }}</small>
        </label>
      </div>
      <div class="action-row">
        <BaseButton @click="emit('close')">取消</BaseButton>
        <BaseButton variant="primary" @click="saveOpen = true">
          保存扩展配置
        </BaseButton>
      </div>
    </template>

    <ConfirmDialog
      :open="saveOpen"
      title="保存扩展配置？"
      description="CLI 会校验插件 schema，写入一次配置，并随后重启整栈。"
      confirm-label="保存并重启"
      @update:open="saveOpen = $event"
      @confirm="save"
    />
  </section>
</template>
