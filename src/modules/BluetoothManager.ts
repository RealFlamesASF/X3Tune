import type { ConnectionState, ScooterModelId } from '../types';

/**
 * BluetoothManager — owns the one real Web Bluetooth connection.
 *
 * Truthfulness rules enforced here:
 *  - `connected` is only set after `gatt.connect()` resolved AND `gatt.connected === true`.
 *  - Disconnects (including unexpected ones) are detected through `gattserverdisconnected`.
 *  - No protocol traffic is sent. We only open a GATT connection; reading standard,
 *    SIG-defined services (Battery, Device Information) happens in DeviceInfoService.
 *
 * Requirements: Chrome / Edge (Chromium) on a supported OS, and HTTPS or http://localhost.
 * Firefox and Safari do not implement Web Bluetooth.
 */

export type BluetoothEvent =
  | { type: 'connected'; deviceName: string }
  | { type: 'disconnected'; deviceName: string; unexpected: boolean }
  | { type: 'cancelled' }
  | { type: 'error'; message: string };

type StateListener = (state: ConnectionState) => void;
type EventListener = (event: BluetoothEvent) => void;

/** Standard Bluetooth SIG service names we are allowed to touch after connecting (not invented UUIDs). */
export const STANDARD_OPTIONAL_SERVICES: BluetoothServiceUUID[] = ['battery_service', 'device_information'];

const INITIAL: ConnectionState = {
  status: 'disconnected',
  deviceName: null,
  deviceId: null,
  selectedModelId: null,
  connectedAt: null,
  error: null,
  progressLabel: null,
};

export function describeUnsupportedReason(): string | null {
  if (typeof window === 'undefined') return 'Not running in a browser.';
  if (!window.isSecureContext) {
    return 'Web Bluetooth needs a secure context. Open TuneHub over HTTPS or on http://localhost.';
  }
  if (!('bluetooth' in navigator)) {
    return 'This browser does not support Web Bluetooth. Use Chrome or Edge on a supported desktop OS (Windows, macOS, Linux/ChromeOS, or Android Chrome). Safari and Firefox are not supported.';
  }
  return null;
}

function explainError(err: unknown): { message: string; cancelled: boolean } {
  const e = err as DOMException;
  const name = e?.name ?? '';
  switch (name) {
    case 'NotFoundError':
      // Chrome uses NotFoundError both for "user closed the chooser" and "no device found".
      return { message: 'No device was selected.', cancelled: true };
    case 'SecurityError':
      return { message: 'Bluetooth access was blocked by the browser or a permissions policy.', cancelled: false };
    case 'NotAllowedError':
      return { message: 'Bluetooth permission was denied. Allow Bluetooth for this site and try again.', cancelled: false };
    case 'NetworkError':
      return { message: 'Could not establish a GATT connection. Make sure the scooter is on, in range, and not connected to another app.', cancelled: false };
    case 'NotSupportedError':
      return { message: 'This device or operating system does not support the requested Bluetooth operation.', cancelled: false };
    case 'InvalidStateError':
      return { message: 'The Bluetooth adapter is in an invalid state. Check that Bluetooth is turned on.', cancelled: false };
    default:
      return { message: e?.message || 'Unknown Bluetooth error.', cancelled: false };
  }
}

class BluetoothManagerImpl {
  private state: ConnectionState = { ...INITIAL };
  private device: BluetoothDevice | null = null;
  private stateListeners = new Set<StateListener>();
  private eventListeners = new Set<EventListener>();
  private userInitiatedDisconnect = false;
  private adStop: (() => void) | null = null;
  private signalListeners = new Set<(dbm: number) => void>();
  private lastRssi: number | null = null;

  constructor() {
    const reason = describeUnsupportedReason();
    if (reason) this.state = { ...INITIAL, status: 'unsupported', error: reason };
  }

  /* ── subscriptions ── */
  subscribe(listener: StateListener): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }
  onEvent(listener: EventListener): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }
  onSignal(listener: (dbm: number) => void): () => void {
    this.signalListeners.add(listener);
    if (this.lastRssi !== null) listener(this.lastRssi);
    return () => this.signalListeners.delete(listener);
  }

  getState(): ConnectionState {
    return this.state;
  }
  getServer(): BluetoothRemoteGATTServer | null {
    return this.device?.gatt?.connected ? this.device.gatt : null;
  }
  getDevice(): BluetoothDevice | null {
    return this.device;
  }

  private setState(patch: Partial<ConnectionState>) {
    this.state = { ...this.state, ...patch };
    this.stateListeners.forEach((l) => l(this.state));
  }
  private emit(event: BluetoothEvent) {
    this.eventListeners.forEach((l) => l(event));
  }

  /**
   * Opens the browser's device chooser and connects.
   * MUST be called directly from a user gesture (click handler).
   *
   * We use `acceptAllDevices` because we do not know, and will not guess, the advertised
   * names or service UUIDs of Segway/Ninebot hardware. The user picks the device.
   */
  async connect(modelId: ScooterModelId | null): Promise<void> {
    if (this.state.status === 'unsupported') {
      this.emit({ type: 'error', message: this.state.error ?? 'Web Bluetooth is not supported.' });
      return;
    }
    if (this.state.status === 'connecting') return;
    if (this.state.status === 'connected') await this.disconnect();

    this.setState({
      status: 'connecting',
      selectedModelId: modelId,
      error: null,
      progressLabel: 'Waiting for device selection…',
      deviceName: null,
      deviceId: null,
      connectedAt: null,
    });

    try {
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: STANDARD_OPTIONAL_SERVICES,
      });

      this.detach();
      this.device = device;
      this.userInitiatedDisconnect = false;
      device.addEventListener('gattserverdisconnected', this.handleDisconnected);

      this.setState({
        progressLabel: 'Opening GATT connection…',
        deviceName: device.name ?? 'Unnamed device',
        deviceId: device.id,
      });

      if (!device.gatt) throw Object.assign(new Error('Device exposes no GATT server.'), { name: 'NotSupportedError' });
      const server = await device.gatt.connect();

      // Truthfulness gate: verify the link is actually up before claiming success.
      if (!server.connected) {
        throw Object.assign(new Error('GATT server reported not connected.'), { name: 'NetworkError' });
      }

      this.setState({
        status: 'connected',
        connectedAt: Date.now(),
        progressLabel: null,
        error: null,
      });
      this.startSignalWatch(device);
      this.emit({ type: 'connected', deviceName: device.name ?? 'Unnamed device' });
    } catch (err) {
      const { message, cancelled } = explainError(err);
      this.detach();
      this.setState({
        status: cancelled ? 'disconnected' : 'error',
        error: cancelled ? null : message,
        progressLabel: null,
        deviceName: null,
        deviceId: null,
        connectedAt: null,
      });
      this.emit(cancelled ? { type: 'cancelled' } : { type: 'error', message });
    }
  }

  async disconnect(): Promise<void> {
    if (!this.device) return;
    this.userInitiatedDisconnect = true;
    const name = this.device.name ?? 'Unnamed device';
    try {
      if (this.device.gatt?.connected) this.device.gatt.disconnect();
    } finally {
      // `gattserverdisconnected` normally fires; make state correct even if it does not.
      if (this.state.status === 'connected') this.finishDisconnect(name, false);
    }
  }

  private handleDisconnected = () => {
    const name = this.device?.name ?? this.state.deviceName ?? 'Unnamed device';
    if (this.state.status === 'connecting') return; // connect() will handle its own failure
    this.finishDisconnect(name, !this.userInitiatedDisconnect);
  };

  private finishDisconnect(name: string, unexpected: boolean) {
    this.stopSignalWatch();
    this.setState({
      status: 'disconnected',
      connectedAt: null,
      progressLabel: null,
      error: unexpected ? 'The scooter disconnected unexpectedly.' : null,
    });
    this.emit({ type: 'disconnected', deviceName: name, unexpected });
  }

  private detach() {
    this.stopSignalWatch();
    if (this.device) {
      this.device.removeEventListener('gattserverdisconnected', this.handleDisconnected);
      if (this.device.gatt?.connected) this.device.gatt.disconnect();
    }
    this.device = null;
    this.lastRssi = null;
  }

  /**
   * RSSI is only available through `watchAdvertisements()`, which is experimental and
   * may need chrome://flags/#enable-experimental-web-platform-features. Failure is fine:
   * the dashboard then shows "Unavailable".
   */
  private startSignalWatch(device: BluetoothDevice) {
    const anyDevice = device as BluetoothDevice & {
      watchAdvertisements?: (options?: { signal?: AbortSignal }) => Promise<void>;
    };
    if (typeof anyDevice.watchAdvertisements !== 'function') return;
    const controller = new AbortController();
    const onAd = (e: Event) => {
      const rssi = (e as Event & { rssi?: number }).rssi;
      if (typeof rssi === 'number') {
        this.lastRssi = rssi;
        this.signalListeners.forEach((l) => l(rssi));
      }
    };
    device.addEventListener('advertisementreceived', onAd);
    this.adStop = () => {
      controller.abort();
      device.removeEventListener('advertisementreceived', onAd);
    };
    anyDevice.watchAdvertisements({ signal: controller.signal }).catch(() => {
      /* unsupported or blocked: signal stays unavailable */
    });
  }

  private stopSignalWatch() {
    this.adStop?.();
    this.adStop = null;
  }
}

export const BluetoothManager = new BluetoothManagerImpl();
