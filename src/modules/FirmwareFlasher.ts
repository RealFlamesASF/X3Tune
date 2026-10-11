import type {
  DeviceInfo,
  FirmwareComponent,
  FirmwareFileRecord,
  FlashProgress,
  FlashResult,
  ScooterModelId,
} from '../types';
import { ScooterRegistry } from './ScooterRegistry';

/**
 * FirmwareFlasher — the ONLY place firmware could ever be written to a device.
 *
 * ┌────────────────────────────────────────────────────────────────────────────┐
 * │ STATUS: NO VERIFIED FLASHING PROTOCOL IS IMPLEMENTED.                      │
 * │ The adapter registry below is intentionally empty. Until a verified        │
 * │ adapter is registered, flash() returns `unsupported` and writes NOTHING.   │
 * └────────────────────────────────────────────────────────────────────────────┘
 *
 * Hard rules for anyone adding an adapter (needs device-specific protocol research):
 *   1. Use only service/characteristic UUIDs and command sequences you have VERIFIED
 *      from official documentation or authorised hardware testing. Never guess.
 *   2. `supports()` must be true only for model + component pairs the protocol is verified for.
 *   3. `verifyHardware()` must read identity FROM THE DEVICE and compare it. A user's model
 *      selection in the UI is not proof of what hardware is connected.
 *   4. `verifyIntegrity()` must check the file against the vendor's signature / manifest.
 *      Never bypass cryptographic verification, authentication, or safety mechanisms.
 *   5. Only report progress from real device acknowledgements; only report `success` from a
 *      real device response. Never simulate either.
 *   6. Never write arbitrary bytes to characteristics you have not verified.
 *   7. Do not change regional speed limits, disable safety protections, or modify
 *      undocumented motor-controller behaviour.
 */

export const MIN_BATTERY_PERCENT = 50;

export const UNSUPPORTED_MESSAGE =
  'Firmware flashing is not yet supported for this device. The file has been validated locally, but no firmware has been written.';

export interface FlashContext {
  server: BluetoothRemoteGATTServer;
  selectedModelId: ScooterModelId;
  component: FirmwareComponent;
  file: FirmwareFileRecord;
  data: ArrayBuffer;
  deviceInfo: DeviceInfo | null;
}

export interface VerificationResult {
  ok: boolean;
  detail: string;
}

/** Contract for a verified, device-specific flashing implementation. */
export interface FirmwareFlasherAdapter {
  readonly id: string;
  readonly label: string;
  /** Link to the documentation / research that verifies this protocol. Required. */
  readonly protocolReference: string;
  supports(modelId: ScooterModelId, component: FirmwareComponent): boolean;
  verifyHardware(ctx: FlashContext): Promise<VerificationResult>;
  verifyIntegrity(ctx: FlashContext): Promise<VerificationResult>;
  flash(ctx: FlashContext, onProgress: (p: FlashProgress) => void, signal: AbortSignal): Promise<FlashResult>;
}

export type PreflightStatus = 'pass' | 'warn' | 'fail';

export interface PreflightItem {
  id: string;
  label: string;
  status: PreflightStatus;
  detail: string;
}

export interface PreflightReport {
  items: PreflightItem[];
  /** True only when no item failed. With no verified adapter this is always false. */
  canFlash: boolean;
  hasVerifiedAdapter: boolean;
}

export interface PreflightInput {
  connected: boolean;
  selectedModelId: ScooterModelId | null;
  component: FirmwareComponent | null;
  file: FirmwareFileRecord | null;
  deviceInfo: DeviceInfo | null;
}

const adapters: FirmwareFlasherAdapter[] = []; // intentionally empty

function result(outcome: FlashResult['outcome'], message: string, bytesWritten = 0): FlashResult {
  return { outcome, message, bytesWritten };
}

export const FirmwareFlasher = {
  /** Register a VERIFIED adapter. See the rules at the top of this file. */
  registerAdapter(adapter: FirmwareFlasherAdapter): void {
    if (!adapter.protocolReference.trim()) throw new Error('Adapters must cite their verified protocol reference.');
    adapters.push(adapter);
  },

  findAdapter(modelId: ScooterModelId, component: FirmwareComponent): FirmwareFlasherAdapter | null {
    return adapters.find((a) => a.supports(modelId, component)) ?? null;
  },

  /** Stages 4–5 of the workflow: compatibility checks and warnings. Read-only, sends nothing to the device. */
  preflight(input: PreflightInput): PreflightReport {
    const items: PreflightItem[] = [];
    const add = (id: string, label: string, status: PreflightStatus, detail: string) =>
      items.push({ id, label, status, detail });

    const { connected, selectedModelId, component, file, deviceInfo } = input;

    add(
      'connection',
      'Scooter connection',
      connected ? 'pass' : 'fail',
      connected ? 'A GATT connection is open.' : 'No scooter is connected.',
    );

    if (!file || !component || !selectedModelId) {
      return { items, canFlash: false, hasVerifiedAdapter: false };
    }

    const adapter = FirmwareFlasher.findAdapter(selectedModelId, component);
    const model = ScooterRegistry.get(selectedModelId);

    add(
      'adapter',
      'Verified flashing protocol',
      adapter ? 'pass' : 'fail',
      adapter
        ? `Adapter "${adapter.label}" (ref: ${adapter.protocolReference}).`
        : `No verified protocol exists for ${model.name} / ${component}. Flashing is not available.`,
    );

    add(
      'model-match',
      'File matches selected model',
      file.modelId === selectedModelId ? 'pass' : 'fail',
      file.modelId === selectedModelId
        ? `File is filed under ${model.name}.`
        : `File is filed under ${ScooterRegistry.get(file.modelId).name}, not ${model.name}.`,
    );

    const known = model.knownComponents;
    add(
      'component',
      'Component exists on this model',
      known === null ? 'warn' : known.includes(component) ? 'pass' : 'fail',
      known === null
        ? `It is not known whether ${model.name} has a ${component} target. TuneHub does not assume it does.`
        : known.includes(component)
          ? `${component} is a known target.`
          : `${component} is not a known target for ${model.name}.`,
    );

    add(
      'validation',
      'Local file validation',
      file.validation.status === 'invalid' ? 'fail' : file.validation.status === 'warnings' ? 'warn' : 'pass',
      file.validation.status === 'invalid'
        ? 'File failed validation.'
        : file.validation.status === 'warnings'
          ? 'File passed with warnings. Review them.'
          : 'All local checks passed.',
    );

    add(
      'compat',
      'Hardware compatibility',
      file.validation.compatibilityVerified ? 'pass' : 'fail',
      file.validation.compatibilityVerified
        ? 'Compatibility verified.'
        : 'Compatibility could not be verified. The selected model is not proof of connected hardware.',
    );

    const modelNumber = deviceInfo?.modelNumber;
    add(
      'identity',
      'Device-reported identity',
      modelNumber?.status === 'ok' ? 'warn' : 'fail',
      modelNumber?.status === 'ok'
        ? `Device reports model number "${modelNumber.value}". TuneHub cannot map this to your selection without a verified adapter.`
        : 'The device did not report a model number, so hardware identity cannot be confirmed.',
    );

    const battery = deviceInfo?.batteryLevel;
    if (battery?.status === 'ok') {
      add(
        'power',
        'Stable power condition',
        battery.value >= MIN_BATTERY_PERCENT ? 'pass' : 'fail',
        battery.value >= MIN_BATTERY_PERCENT
          ? `Battery at ${battery.value}%.`
          : `Battery at ${battery.value}%. At least ${MIN_BATTERY_PERCENT}% is required.`,
      );
    } else {
      add('power', 'Stable power condition', 'fail', 'Battery level could not be read, so power stability cannot be confirmed.');
    }

    return {
      items,
      canFlash: items.every((i) => i.status !== 'fail'),
      hasVerifiedAdapter: adapter !== null,
    };
  },

  /**
   * Stages 6–8. Called only after the user explicitly confirmed.
   * Without a verified adapter this returns `unsupported` and performs no BLE operations at all.
   */
  async flash(
    ctx: FlashContext,
    preflight: PreflightReport,
    onProgress: (p: FlashProgress) => void,
    signal: AbortSignal,
  ): Promise<FlashResult> {
    const adapter = FirmwareFlasher.findAdapter(ctx.selectedModelId, ctx.component);
    if (!adapter) return result('unsupported', UNSUPPORTED_MESSAGE);

    if (!preflight.canFlash) {
      const blockers = preflight.items.filter((i) => i.status === 'fail').map((i) => i.label);
      return result('aborted', `Flashing was blocked by failed pre-flight checks: ${blockers.join(', ')}.`);
    }
    if (!ctx.server.connected) return result('failed', 'The scooter is no longer connected. Nothing was written.');

    try {
      // Re-verify immediately before writing; never trust earlier results.
      const hw = await adapter.verifyHardware(ctx);
      if (!hw.ok) return result('aborted', `Hardware verification failed: ${hw.detail} Nothing was written.`);
      const integrity = await adapter.verifyIntegrity(ctx);
      if (!integrity.ok) return result('aborted', `Integrity verification failed: ${integrity.detail} Nothing was written.`);
      if (signal.aborted) return result('aborted', 'Cancelled before writing. Nothing was written.');

      return await adapter.flash(ctx, onProgress, signal);
    } catch (err) {
      return result('failed', `Flashing failed: ${(err as Error).message}`);
    }
  },
};
