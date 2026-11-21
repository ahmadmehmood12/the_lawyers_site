import { File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

type PersistedState = {
  onboardingCompleted?: boolean;
};

const fileName = 'da-barrister-state.json';
let memoryState: PersistedState = {};

function stateFile(): File | null {
  return Platform.OS === 'web' ? null : new File(Paths.document, fileName);
}

export async function readState(): Promise<PersistedState> {
  const file = stateFile();
  if (!file || !file.exists) {
    return memoryState;
  }
  try {
    const content = await file.text();
    memoryState = JSON.parse(content) as PersistedState;
  } catch {
    memoryState = {};
  }
  return memoryState;
}

export async function writeState(next: PersistedState): Promise<void> {
  memoryState = { ...memoryState, ...next };
  const file = stateFile();
  if (!file) {
    return;
  }
  try {
    await file.write(JSON.stringify(memoryState));
  } catch {
    return;
  }
}

export async function isOnboardingCompleted(): Promise<boolean> {
  const state = await readState();
  return state.onboardingCompleted === true;
}

export async function completeOnboarding(): Promise<void> {
  await writeState({ onboardingCompleted: true });
}

export async function resetOnboarding(): Promise<void> {
  await writeState({ onboardingCompleted: false });
}
