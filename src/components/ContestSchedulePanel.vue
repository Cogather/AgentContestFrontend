<script setup>
defineProps({
  scheduleText: {
    type: String,
    required: true
  },
  countdownLabel: {
    type: String,
    default: ''
  },
  countdownText: {
    type: String,
    required: true
  },
  phase: {
    type: String,
    default: ''
  }
})
</script>

<template>
  <div class="hero-schedule-panel" aria-label="赛事赛程">
    <div class="hero-schedule-copy">
      <div class="schedule-line">
        <span>赛程：</span>
        <strong>{{ scheduleText }}</strong>
      </div>
      <div class="schedule-line schedule-countdown">
        <span v-if="countdownLabel">{{ countdownLabel }}</span>
        <strong :class="{ 'countdown-ended': phase === 'ended' }">
          {{ countdownText }}
        </strong>
      </div>
    </div>
    <div class="hero-schedule-visual" aria-hidden="true">
      <span class="schedule-track schedule-track-a"></span>
      <span class="schedule-track schedule-track-b"></span>
      <span class="schedule-pin"></span>
    </div>
  </div>
</template>

<style scoped>
.hero-schedule-panel {
  width: min(500px, 41vw);
  min-height: 176px;
  align-self: center;
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 76px;
  gap: 20px;
  padding: 20px 0 18px 28px;
}

.hero-schedule-panel::before {
  content: "";
  position: absolute;
  top: 0;
  left: 28px;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #b4232f, #111827 58%, rgba(17, 24, 39, 0));
}

.hero-schedule-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  justify-content: center;
  gap: 18px;
}

.schedule-line {
  display: grid;
  gap: 7px;
}

.schedule-line span {
  color: #64748b;
  font-size: 13px;
  font-weight: 750;
}

.schedule-line strong {
  color: #111827;
  font-size: 18px;
  line-height: 1.35;
  font-weight: 850;
  white-space: nowrap;
}

.schedule-countdown strong {
  color: #b4232f;
  font-size: 30px;
  line-height: 1.12;
}

.schedule-countdown strong.countdown-ended {
  color: #111827;
}

.hero-schedule-visual {
  position: relative;
  min-height: 160px;
  border-left: 1px solid rgba(71, 96, 136, 0.12);
  overflow: hidden;
}

.schedule-track {
  position: absolute;
  left: 20px;
  right: -16px;
  height: 1px;
  background: linear-gradient(90deg, rgba(17, 24, 39, 0.2), rgba(180, 35, 47, 0.42), transparent);
  transform-origin: left center;
}

.schedule-track-a {
  top: 36%;
  transform: rotate(-18deg);
}

.schedule-track-b {
  top: 66%;
  transform: rotate(9deg);
}

.schedule-pin {
  position: absolute;
  top: 48%;
  left: 42px;
  width: 38px;
  height: 38px;
  border: 1px solid rgba(180, 35, 47, 0.28);
  border-radius: 8px;
  background: rgba(180, 35, 47, 0.07);
  box-shadow: 0 0 0 8px rgba(180, 35, 47, 0.032);
}

.schedule-pin::before {
  content: "";
  position: absolute;
  inset: 12px;
  border-radius: 4px;
  background: #b4232f;
}

@media (max-width: 980px) {
  .hero-schedule-panel {
    width: min(620px, 100%);
  }
}

@media (max-width: 1120px) and (min-width: 981px) {
  .hero-schedule-panel {
    width: min(470px, 42vw);
    grid-template-columns: minmax(0, 1fr) 64px;
  }

  .schedule-line strong {
    font-size: 16px;
  }

  .schedule-countdown strong {
    font-size: 26px;
  }
}

@media (max-width: 640px) {
  .hero-schedule-panel {
    width: 100%;
    min-height: 0;
    grid-template-columns: 1fr;
    margin-top: 24px;
    padding: 18px 0 0;
  }

  .hero-schedule-panel::before {
    left: 0;
  }

  .hero-schedule-visual {
    display: none;
  }

  .schedule-line strong {
    font-size: 16px;
    white-space: normal;
  }

  .schedule-countdown strong {
    font-size: 26px;
  }
}
</style>
