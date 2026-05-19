<script setup>
const props = defineProps({
  name: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    default: 18
  },
  strokeWidth: {
    type: Number,
    default: 1.8
  }
})

const icons = {
  agent: `
    <path d="M8 6.3 12 4l4 2.3 1.8 3.7v5.1L15.4 19H8.6l-2.4-3.9V10L8 6.3z"></path>
    <path d="M8.8 9.8h6.4l1 1.7-1.4 2.4H9.2l-1.4-2.4 1-1.7z"></path>
    <circle cx="10.2" cy="12" r=".55"></circle>
    <circle cx="13.8" cy="12" r=".55"></circle>
    <path d="M10 15.8h4"></path>
    <path d="M12 4V2.3M9.8 2.3h4.4"></path>
    <path d="M6.2 11H4.6v3h1.6M17.8 11h1.6v3h-1.6"></path>
  `,
  user: `
    <circle cx="12" cy="8" r="3.2"></circle>
    <path d="M5.5 19c1.1-3.6 3.5-5.4 6.5-5.4s5.4 1.8 6.5 5.4"></path>
    <path d="M4 21h16"></path>
  `,
  guide: `
    <path d="M5 4h7a3 3 0 0 1 3 3v13H8a3 3 0 0 0-3 3V4z"></path>
    <path d="M15 7h4v13h-4"></path>
    <path d="M8 8h4M8 12h5"></path>
  `,
  history: `
    <path d="M4 12a8 8 0 1 0 2.4-5.7"></path>
    <path d="M4 5v5h5"></path>
    <path d="M12 8v4l3 2"></path>
  `,
  upload: `
    <path d="M12 16V5"></path>
    <path d="m8 9 4-4 4 4"></path>
    <path d="M5 16v3h14v-3"></path>
  `,
  file: `
    <path d="M6 3h8l4 4v14H6V3z"></path>
    <path d="M14 3v5h5"></path>
    <path d="M9 13h6M9 17h6"></path>
  `,
  trophy: `
    <path d="M8 4h8v4a4 4 0 0 1-8 0V4z"></path>
    <path d="M8 6H5a3 3 0 0 0 3 5"></path>
    <path d="M16 6h3a3 3 0 0 1-3 5"></path>
    <path d="M12 12v5M9 21h6M8 17h8"></path>
  `,
  users: `
    <circle cx="9" cy="8" r="3"></circle>
    <path d="M3.8 19c.9-3.1 2.8-4.7 5.2-4.7s4.3 1.6 5.2 4.7"></path>
    <path d="M15.5 10.5a2.5 2.5 0 1 0 0-5"></path>
    <path d="M16.8 14.6c1.8.5 3 2 3.7 4.4"></path>
  `,
  score: `
    <path d="M4 19h16"></path>
    <path d="m5 15 5-5 3 3 6-8"></path>
    <path d="M15 5h4v4"></path>
  `,
  detail: `
    <path d="M3 12s3.3-6 9-6 9 6 9 6-3.3 6-9 6-9-6-9-6z"></path>
    <circle cx="12" cy="12" r="2.5"></circle>
  `
}
</script>

<template>
  <svg
    class="icon-symbol"
    viewBox="0 0 24 24"
    fill="none"
    :width="props.size"
    :height="props.size"
    :stroke-width="props.strokeWidth"
    stroke="currentColor"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    v-html="icons[props.name]"
  />
</template>
