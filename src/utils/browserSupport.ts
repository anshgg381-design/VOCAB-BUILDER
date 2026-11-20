export interface SupportedBrowserInfo {
  id: string;
  name: string;
  extensionsUrl: string;
  note: string;
}

export const SUPPORTED_BROWSERS: SupportedBrowserInfo[] = [
  {
    id: 'chrome',
    name: 'Google Chrome',
    extensionsUrl: 'chrome://extensions',
    note: 'Full Manifest V3 support on Windows & macOS',
  },
  {
    id: 'brave',
    name: 'Brave',
    extensionsUrl: 'brave://extensions',
    note: 'Works with Shields enabled & zero configuration',
  },
  {
    id: 'edge',
    name: 'Microsoft Edge',
    extensionsUrl: 'edge://extensions',
    note: 'Built-in Windows support & Developer mode toggle',
  },
  {
    id: 'vivaldi',
    name: 'Vivaldi',
    extensionsUrl: 'vivaldi://extensions',
    note: 'Supports toolbar pinning & shadow DOM overlay',
  },
  {
    id: 'opera',
    name: 'Opera / Opera GX',
    extensionsUrl: 'opera://extensions',
    note: 'Enable Developer mode in sidebar Extensions tab',
  },
  {
    id: 'arc',
    name: 'Arc',
    extensionsUrl: 'arc://extensions',
    note: 'Supports unpacked Manifest V3 on macOS & Windows',
  },
  {
    id: 'chromium',
    name: 'Chromium / Ungoogled Chromium',
    extensionsUrl: 'chrome://extensions',
    note: 'Standard Chromium unpacked extension workflow',
  },
];
