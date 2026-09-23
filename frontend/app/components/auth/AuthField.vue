<script setup lang="ts">
import { Eye, EyeOff } from 'lucide-vue-next';
import type { Component } from 'vue';

/** Reference auth input: 45px left padding for a grey 26px icon, #c2c7d0 border, 5px radius, green focus glow. */
const props = withDefaults(
  defineProps<{
    modelValue: string;
    icon: Component;
    placeholder: string;
    type?: string;
    autocomplete?: string;
    name?: string;
    error?: string | null;
    required?: boolean;
  }>(),
  { type: 'text', required: false },
);
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();

const id = useId();
const reveal = ref(false);
const inputType = computed(() => (props.type === 'password' && reveal.value ? 'text' : props.type));
</script>

<template>
  <div class="my-[15px]">
    <div class="relative">
      <component :is="icon" class="pointer-events-none absolute left-2 top-2 h-[26px] w-[26px] text-[#979faf]" aria-hidden="true" />
      <input
        :id="id"
        :name="name"
        :type="inputType"
        :value="modelValue"
        :placeholder="placeholder"
        :autocomplete="autocomplete"
        :required="required"
        :aria-label="placeholder"
        :aria-invalid="!!error || undefined"
        :aria-describedby="error ? `${id}-error` : undefined"
        class="block w-full rounded-[5px] border bg-white py-2 pl-[45px] text-[16px] font-medium leading-6 text-[#39424e] shadow-[inset_0_1px_2px_rgba(151,159,175,0.1)] transition placeholder:font-normal placeholder:text-[#999] focus:outline-none"
        :class="[
          error
            ? 'border-[#ef1313] focus:shadow-[inset_0_1px_1px_rgba(0,0,0,.075),0_0_5px_rgba(177,74,71,0.6)]'
            : 'border-[#c2c7d0] focus:border-[#0f9d58] focus:shadow-[inset_0_1px_1px_rgba(0,0,0,.075),0_0_5px_rgba(78,236,141,0.6)]',
          type === 'password' ? 'pr-10' : 'pr-2',
        ]"
        @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      />
      <button v-if="type === 'password'" type="button" class="absolute inset-y-0 right-0 flex items-center px-3 text-[#979faf] hover:text-[#39424e]" :aria-label="reveal ? 'Hide password' : 'Show password'" @click="reveal = !reveal">
        <EyeOff v-if="reveal" class="h-4 w-4" />
        <Eye v-else class="h-4 w-4" />
      </button>
    </div>
    <p v-if="error" :id="`${id}-error`" class="mt-1 text-left text-[12px] font-medium text-[#b71c1c]">{{ error }}</p>
  </div>
</template>
