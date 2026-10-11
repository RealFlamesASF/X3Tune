# TuneHub

A dark, desktop-style web utility for connecting to compatible Segway/Ninebot scooters over Bluetooth Low Energy, managing your own firmware files, and walking through a firmware-flashing safety workflow.

**Built with:** React · TypeScript · Vite · Tailwind CSS · Lucide icons · Web Bluetooth · IndexedDB

> ## Read this first: what is and is not implemented
>
> | Feature | Status |
> | --- | --- |
> | Web Bluetooth device chooser + real GATT connection | **Working** |
> | Connect / disconnect / unexpected-disconnect detection | **Working** |
> | Battery level (standard BLE Battery Service) | **Working** if the device exposes it, otherwise "Unavailable" |
> | Device info (standard Device Information Service) | **Working** if the device exposes it, otherwise "Unavailable" |
> | BLE signal (RSSI) | Only if the browser exposes `watchAdvertisements()` (experimental) |
> | Battery voltage | **Not supported**: no standard BLE characteristic exists |
> | Firmware library (upload, drag-and-drop, organise, download, remove) | **Working**, stored in IndexedDB |
> | Local firmware validation (size, signature sniffing, SHA-256, filename hints) | **Working**. It is a sanity check, not proof of compatibility |
> | Firmware flashing | **Not implemented.** No verified protocol exists in this project |
>
> TuneHub deliberately does **not** contain invented BLE UUIDs, authentication sequences, or firmware protocols. Pressing "Flash Firmware" never writes anything and never reports success. It records a validation-only attempt and tells you:
>
> *"Firmware flashing is not yet supported for this device. The file has been validated locally, but no firmware has been written."*
>
> Real flashing needs a verified, device-specific adapter. See [Adding a verified flasher](#adding-a-verified-flasher).

## Requirements

- **Node.js 18+**
- **Chrome or Edge** (Chromium) on a supported OS. Web Bluetooth is not available in Safari or Firefox.
- A working Bluetooth Low Energy adapter that is turned on.
- The page must be served over **HTTPS** or from **`http://localhost`** (a secure context). `npm run dev` serves on localhost, which qualifies.

## Install and run

```bash
npm install
npm run dev
```

Open <http://localhost:5173> in Chrome or Edge.

Other scripts:

```bash
npm run build      # type-check and production build into dist/
npm run preview    # serve the production build locally
npm run typecheck  # TypeScript only
```

If you deploy `dist/` somewhere, it must be served over HTTPS for Bluetooth to work.

## Scooter photos

TuneHub does not bundle manufacturer images because of licensing. Each card looks for `public/scooters/<ModelId>.jpg` and falls back to a clean silhouette if the file is missing. To use photos you have the right to use, drop them in:

```text
public/scooters/ZT3_Pro.jpg
public/scooters/F3.jpg
public/scooters/F3_Pro.jpg
public/scooters/GT3.jpg
public/scooters/GT3_Pro.jpg
public/scooters/MAX_G3.jpg
```

## Project structure

```text
tunehub/
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── tsconfig*.json
├── .env.example
├── public/
│   └── favicon.svg
└── src/
    ├── main.tsx                     entry point
    ├── App.tsx                      shell and tab routing
    ├── index.css                    Tailwind + design tokens
    ├── types/index.ts               devices, firmware files, connection states, flash results
    ├── context/AppContext.tsx       connection, device info, library state
    ├── lib/                         formatting helpers, useNow hook
    ├── modules/
    │   ├── BluetoothManager.ts      the one real Web Bluetooth connection
    │   ├── ScooterRegistry.ts       selectable models (selection only, not identification)
    │   ├── DeviceInfoService.ts     reads standard Battery + Device Information services
    │   ├── FirmwareManager.ts       user's firmware library (virtual folders)
    │   ├── FirmwareStorage.ts       IndexedDB wrapper
    │   ├── FirmwareValidator.ts     local sanity checks
    │   ├── FirmwareFlasher.ts       adapter interface + pre-flight (no adapters registered)
    │   └── NotificationSystem.ts    toast store
    ├── components/                  NavBar, ScooterCard, ConnectHero, FlashWorkflow, ...
    └── pages/                       Dashboard, Firmware, DeviceInfoPage, Settings
```

## How the Bluetooth workflow stays truthful

- `connected` is set only after `gatt.connect()` resolves **and** `gatt.connected === true`.
- Connection, cancellation, unexpected disconnects, and errors (permission denied, GATT failure, unsupported browser, insecure context) each have their own handling and message.
- The device chooser uses `acceptAllDevices` because the advertised names and service UUIDs of Segway/Ninebot hardware are not assumed. Only the standard `battery_service` and `device_information` services are requested.
- Every value on the dashboard and Device Info page is either read from the device or shown as "Unavailable" / "Not supported". Nothing is estimated or faked.
- The model you pick in TuneHub is a label for your session. It is never treated as proof of the connected hardware.

## Firmware library

A web page cannot browse arbitrary local folders, so the library is virtual. Files are stored in IndexedDB and filed under:

```text
firmware/
├── ZT3_Pro/   VCU/ MCU/ BLE/ BMS/
├── F3/        VCU/ MCU/ BLE/ BMS/
├── F3_Pro/    ...
├── GT3/       ...
├── GT3_Pro/   ...
└── MAX_G3/    ...
```

VCU, MCU, BLE and BMS are separate targets and TuneHub does not assume any scooter has all of them. Use the download button to save a file back to disk. Nothing is uploaded anywhere.

Validation checks file size, extension, content signature (ZIP / Intel HEX / ELF / GZIP heuristics), blank-image detection, SHA-256, and whether the file name agrees with the selected model and component. Hardware compatibility always shows as **unverified**.

## Flashing workflow

The Firmware page walks through eight stages: select connected scooter, select component, choose file, validate compatibility, review details and warnings, explicit confirmation, progress, and result. Pre-flight requires, among other things, a verified protocol adapter, matching model, validated file, verified compatibility, device-reported identity, and at least 50% battery. With no verified adapter, these can never all pass and no BLE write is ever attempted.

### Adding a verified flasher

Implement `FirmwareFlasherAdapter` in `src/modules/FirmwareFlasher.ts` and register it with `FirmwareFlasher.registerAdapter(...)`. The file header documents the rules. In short:

1. Use only UUIDs and command sequences verified from official documentation or authorised hardware testing.
2. `supports()` is true only for model and component pairs the protocol is verified for.
3. `verifyHardware()` reads identity from the device and compares it.
4. `verifyIntegrity()` checks the vendor signature or manifest. Never bypass cryptographic verification or authentication.
5. Report progress and success only from real device acknowledgements.

Protocol research and hardware access are your responsibility. TuneHub does not provide them.

## Optional backend

None is included, and `.env.example` lists only an optional placeholder URL. If you add a backend for shared firmware storage, keep credentials and GitHub tokens on the server. Anything in a `VITE_*` variable is bundled into public frontend code.

## Safety

- TuneHub never changes regional speed limits, disables safety protections, or applies undocumented motor-controller modifications.
- Wrong firmware can permanently damage a scooter or its battery management system. Use it at your own risk and follow the manufacturer's guidance.
- TuneHub is an independent project and is not affiliated with or endorsed by Segway-Ninebot.
