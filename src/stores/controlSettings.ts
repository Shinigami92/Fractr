import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface KeybindingMap {
  moveForward: string;
  moveBackward: string;
  moveLeft: string;
  moveRight: string;
  moveUp: string;
  moveDown: string;
  toggleHud: string;
  toggleCrosshair: string;
  cycleColorMode: string;
}

const DEFAULT_KEYBINDINGS: KeybindingMap = {
  moveForward: 'KeyW',
  moveBackward: 'KeyS',
  moveLeft: 'KeyA',
  moveRight: 'KeyD',
  moveUp: 'KeyE',
  moveDown: 'KeyQ',
  toggleHud: 'F3',
  toggleCrosshair: 'KeyH',
  cycleColorMode: 'KeyC',
};

export const useControlSettings = defineStore('controlSettings', () => {
  const cameraSpeed = ref(2.0);
  const mouseSensitivity = ref(0.002);
  const keybindings = ref<KeybindingMap>({ ...DEFAULT_KEYBINDINGS });

  function reset(): void {
    cameraSpeed.value = 2.0;
    mouseSensitivity.value = 0.002;
    keybindings.value = { ...DEFAULT_KEYBINDINGS };
  }

  return { cameraSpeed, mouseSensitivity, keybindings, reset };
});
