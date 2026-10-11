/**
 * Shared TypeScript types for TuneHub.
 * Nothing here implies a verified protocol: see FirmwareFlasher for the adapter contract.
 */

export type ScooterModelId = 'ZT3_Pro' | 'F3' | 'F3_Pro' | 'GT3' | 'GT3_Pro' | 'MAX_G3';

export type FirmwareComponent = 'VCU' | 'MCU' | 'BLE' | 'BMS';

export const FIRMWARE_COMPONENTS: FirmwareComponent[] = ['VCU', 'MCU', 'BLE', 'BMS'];

export interface ScooterModel {
  id: ScooterModelId;
  name: string;
  /** Short descriptor shown on the card. */
  tagline: string;
  /** Optional local image path (drop your own licensed files in /public/scooters). Falls back to a silhouette. */
  imageUrl: string;
  /** Silhouette variant used when the image is missing. */
  silhouette: 'standard' | 'dual' | 'tall';
  /** Whether Segway lists this model as a compatible target for this tool. `unknown` = needs confirmation. */
  compatibility: 'confirmed' | 'unknown';
  compatibilityNote: string;
  /**
   * Firmware targets known to exist on this model.
   * `null` means we do not know, so the UI never assumes any particular target exists.
   */
  knownComponents: FirmwareComponent[] | null;
}

/* ───────────── Connection ───────────── */

export type ConnectionStatus = 'unsupported' | 'disconnected' | 'connecting' | 'connected' | 'error';

export interface ConnectionState {
  status: ConnectionStatus;
  deviceName: string | null;
  deviceId: string | null;
  /** Model the user *selected*. It is NOT proof of what hardware is connected. */
  selectedModelId: ScooterModelId | null;
  connectedAt: number | null;
  error: string | null;
  /** Human-readable step shown during connection animation. */
  progressLabel: string | null;
}

/* ───────────── Readings ───────────── */

/** A value that is either truly read from the device or explicitly unavailable. */
export type Reading<T> =
  | { status: 'ok'; value: T }
  | { status: 'unavailable'; reason: string }
  | { status: 'not_supported'; reason: string };

export interface DeviceInfo {
  manufacturer: Reading<string>;
  modelNumber: Reading<string>;
  serialNumber: Reading<string>;
  hardwareRevision: Reading<string>;
  firmwareRevision: Reading<string>;
  softwareRevision: Reading<string>;
  /** Percent, from the standard BLE Battery Service. */
  batteryLevel: Reading<number>;
  /** Volts. No standard BLE characteristic exists, so this stays unsupported without a verified adapter. */
  batteryVoltage: Reading<number>;
  /** dBm from advertisement RSSI, when the browser exposes it. */
  signalDbm: Reading<number>;
  readAt: number;
}

export interface GattServiceReport {
  name: string;
  available: boolean;
  detail: string;
}

/* ───────────── Firmware files ───────────── */

export type CheckStatus = 'pass' | 'warn' | 'fail';

export interface ValidationCheck {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
}

export type ValidationStatus = 'valid' | 'warnings' | 'invalid';

export interface ValidationResult {
  status: ValidationStatus;
  checks: ValidationCheck[];
  validatedAt: number;
  /** True only if hardware/model compatibility was verified against a trusted source. Always false today. */
  compatibilityVerified: boolean;
}

export interface FirmwareFileRecord {
  id: string;
  fileName: string;
  size: number;
  mimeType: string;
  extension: string;
  modelId: ScooterModelId;
  component: FirmwareComponent;
  /** User-entered label. Never parsed from the file as if it were authoritative. */
  version: string;
  notes: string;
  sha256: string;
  addedAt: number;
  validation: ValidationResult;
}

export interface FirmwareDraft {
  file: File;
  modelId: ScooterModelId;
  component: FirmwareComponent;
  version: string;
  notes: string;
}

/* ───────────── Flashing ───────────── */

export type FlashOutcome = 'unsupported' | 'success' | 'failed' | 'aborted';

export interface FlashResult {
  outcome: FlashOutcome;
  message: string;
  /** Number of bytes the device actually acknowledged. Zero when nothing was written. */
  bytesWritten: number;
}

export interface FlashProgress {
  /** Only emit progress derived from real device acknowledgements. */
  bytesWritten: number;
  totalBytes: number;
}

export interface FlashHistoryEntry {
  id: string;
  fileId: string | null;
  fileName: string;
  modelId: ScooterModelId;
  component: FirmwareComponent;
  at: number;
  outcome: FlashOutcome;
  message: string;
}

/* ───────────── Notifications ───────────── */

export type NotificationKind = 'success' | 'error' | 'warning' | 'info';

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  message?: string;
  durationMs: number;
}

export type TabId = 'dashboard' | 'firmware' | 'device' | 'settings';
