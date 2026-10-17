import type { ListRadarSettings, Settings } from '@/src/lib/types';
import { mountListRadar } from './radar';

interface SettingsSource {
  getSettings(): Promise<Settings>;
  watchSettings(callback: (settings: Settings) => void): () => void;
}

interface Lifecycle {
  onInvalidated(callback: () => void): void;
}

/**
 * List radar feature: a self-contained module, switched on/off and re-tuned live
 * from Settings → List radar. When disabled it leaves nothing running on the page.
 */
export function mountListRadarFeature(settings: SettingsSource, lifecycle: Lifecycle) {
  let radar: ReturnType<typeof mountListRadar> | null = null;
  let gotLiveUpdate = false;

  function apply(config: ListRadarSettings) {
    if (!config.enabled) {
      radar?.unmount();
      radar = null;
    } else if (radar) {
      radar.update(config);
    } else {
      radar = mountListRadar(config);
    }
  }

  const unwatch = settings.watchSettings((s) => {
    gotLiveUpdate = true;
    apply(s.listRadar);
  });
  settings
    .getSettings()
    .then((s) => {
      if (!gotLiveUpdate) apply(s.listRadar); // a newer live value wins over the initial read
    })
    .catch(() => {});

  function unmount() {
    try {
      unwatch();
    } catch {
      // storage API may already be gone
    }
    radar?.unmount();
    radar = null;
  }
  lifecycle.onInvalidated(unmount);
  return unmount;
}
