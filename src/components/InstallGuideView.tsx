import React, { useState } from 'react';
import { Check, Copy, Laptop, Monitor } from 'lucide-react';
import { SUPPORTED_BROWSERS } from '../utils/browserSupport';
import { BRAVE_APPS_SCRIPT_CODE } from '../utils/googleSheets';
import {
  STARTER_CSV_FILENAMES,
  STARTER_XLSX_FILENAME,
  downloadTemplateCsv,
  downloadTemplateXlsx,
} from '../utils/sheetTemplate';
import winExtractImg from '../assets/images/win_extract_zip_1795121616578.jpg';
import macExtractImg from '../assets/images/mac_extract_finder_1795121616500.jpg';
import chromiumLoadUnpackedImg from '../assets/images/chromium_load_unpacked_1795121614904.jpg';
import pinAndSettingsImg from '../assets/images/pin_and_settings_setup_1795121616109.jpg';
import sheetsDeployImg from '../assets/images/install_step_sheets_deploy_1795116843630.jpg';

type OsGuidePage = 'windows' | 'mac';

export const InstallGuideView: React.FC = () => {
  const [osPage, setOsPage] = useState<OsGuidePage>('windows');
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedUrlId, setCopiedUrlId] = useState<string | null>(null);
  const [templateMsg, setTemplateMsg] = useState<string | null>(null);

  const handleCopyScript = async () => {
    try {
      await navigator.clipboard.writeText(BRAVE_APPS_SCRIPT_CODE);
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 1800);
    } catch {
      // Clipboard fallback ignored silently
    }
  };

  const handleCopyBrowserUrl = async (id: string, url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrlId(id);
      setTimeout(() => setCopiedUrlId(null), 1600);
    } catch {
      // Clipboard fallback ignored silently
    }
  };

  const handleDownloadTemplateXlsx = async () => {
    try {
      await downloadTemplateXlsx({ includeEntries: false });
      setTemplateMsg(`Downloaded ${STARTER_XLSX_FILENAME} (3 tabs: Words, Idioms, Phrasal Verbs).`);
    } catch {
      setTemplateMsg('Could not generate template workbook.');
    }
  };

  const handleDownloadTemplateCsv = () => {
    downloadTemplateCsv('vocabulary', [], false);
    setTemplateMsg(
      `Downloaded blank ${STARTER_CSV_FILENAMES.vocabulary} (Word,Meaning,Example Sentence).`
    );
  };

  const isWin = osPage === 'windows';

  return (
    <div className="max-w-[920px] mx-auto space-y-6">
      {/* Header + 2-Page OS Switcher (Windows vs Mac) */}
      <div className="pb-5 border-b border-[#002962]/12 dark:border-[#93C5FD]/15 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="font-editorial text-[32px] sm:text-[38px] font-light tracking-[-0.03em] text-[#002962] dark:text-[#F1F5F9] leading-tight">
              Install &amp; Setup Guide
              <span className="text-[#EA580C] font-semibold" aria-hidden="true">.</span>
            </h1>
            <p className="mt-1.5 text-[15px] text-[#3B5578] dark:text-[#9FB3CE] max-w-[66ch]">
              Complete illustrated instructions for <strong className="text-[#002962] dark:text-white">IPMAT/CUET VOCAB BUILDER</strong> across Brave, Google Chrome, Microsoft Edge, Vivaldi, Opera, Arc, and Chromium.
            </p>
          </div>

          {/* Two-Page Guide Switcher: Windows Page / Mac Page */}
          <div
            role="tablist"
            aria-label="Choose operating system guide"
            className="inline-flex items-center p-1 rounded-lg bg-[#EAE7E1] dark:bg-[#111C30] border border-[#002962]/12 dark:border-[#93C5FD]/15 shrink-0 self-start sm:self-auto"
          >
            <button
              type="button"
              role="tab"
              aria-selected={isWin}
              onClick={() => setOsPage('windows')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-[13.5px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                isWin
                  ? 'bg-[#002962] dark:bg-[#2563EB] text-white shadow-sm'
                  : 'text-[#3B5578] dark:text-[#9FB3CE] hover:text-[#002962] dark:hover:text-white'
              }`}
            >
              <Monitor className="w-4 h-4" aria-hidden="true" />
              Windows Guide
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={!isWin}
              onClick={() => setOsPage('mac')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-[13.5px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                !isWin
                  ? 'bg-[#002962] dark:bg-[#2563EB] text-white shadow-sm'
                  : 'text-[#3B5578] dark:text-[#9FB3CE] hover:text-[#002962] dark:hover:text-white'
              }`}
            >
              <Laptop className="w-4 h-4" aria-hidden="true" />
              Mac Guide (macOS)
            </button>
          </div>
        </div>
      </div>

      {/* Supported Browsers Directory (Works identically across all 7 Chromium browsers) */}
      <section aria-label="Supported desktop browsers" className="nesoi-card p-5 sm:p-6 space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
          <div>
            <h2 className="font-editorial text-xl font-semibold text-[#002962] dark:text-[#F1F5F9]">
              Supported Browsers (Works Out of the Box)
            </h2>
            <p className="text-[13.5px] text-[#3B5578] dark:text-[#9FB3CE] mt-0.5">
              Built with standard Manifest V3 APIs — copy the extensions page URL for your preferred browser below.
            </p>
          </div>
          <span className="text-xs font-semibold text-[#002962] dark:text-[#DCE8FA] bg-[#EEF3F9] dark:bg-[#172540] px-2.5 py-1 rounded whitespace-nowrap self-start sm:self-auto">
            7 Chromium Browsers Supported
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {SUPPORTED_BROWSERS.map((browser) => {
            const isCopied = copiedUrlId === browser.id;
            return (
              <div
                key={browser.id}
                className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg bg-[#F5F3F0] dark:bg-[#0D1626] border border-[#002962]/12 dark:border-[#93C5FD]/15"
              >
                <div className="min-w-0">
                  <div className="text-[12.5px] font-semibold text-[#002962] dark:text-[#F1F5F9] leading-snug">
                    {browser.name}
                  </div>
                  <code className="text-[12px] font-code font-semibold text-[#3B5578] dark:text-[#9FB3CE]">
                    {browser.extensionsUrl}
                  </code>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyBrowserUrl(browser.id, browser.extensionsUrl)}
                  aria-label={`Copy ${browser.extensionsUrl} for ${browser.name}`}
                  className="h-7 px-2.5 inline-flex items-center gap-1 text-[11.5px] font-semibold bg-white dark:bg-[#111C30] border border-[#002962]/20 dark:border-[#93C5FD]/22 rounded-md text-[#002962] dark:text-[#E8EEF7] hover:bg-[#EEF3F9] dark:hover:bg-[#172540] shrink-0 cursor-pointer transition-colors"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3 h-3 text-[#002962] dark:text-[#60A5FA]" aria-hidden="true" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" aria-hidden="true" />
                      Copy
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-[#3B5578] dark:text-[#9FB3CE] leading-relaxed">
          <strong className="text-[#002962] dark:text-white">Note:</strong> Safari (macOS/iOS) and iOS mobile browsers do not load Chromium ZIP extensions.{' '}
          {!isWin && 'On Mac, we recommend Google Chrome, Brave, Arc, Microsoft Edge, Vivaldi, or Opera.'}
        </p>
      </section>

      {/* Active OS Page Banner */}
      <div className="nesoi-navy-panel rounded-xl px-6 py-4 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-[#002962] dark:border-[#93C5FD]/20">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#FDBA74]">
            {isWin ? 'PAGE 1 OF 2 · WINDOWS 10 & 11' : 'PAGE 2 OF 2 · MACOS (APPLE SILICON & INTEL)'}
          </p>
          <h2 className="font-editorial text-xl sm:text-2xl font-light text-white mt-0.5">
            {isWin
              ? 'Complete Windows Setup Walkthrough'
              : 'Complete Mac (macOS) Setup Walkthrough'}
          </h2>
        </div>
        <button
          type="button"
          onClick={() => setOsPage(isWin ? 'mac' : 'windows')}
          className="h-8 px-4 text-xs font-semibold bg-white/15 hover:bg-white/25 border border-white/25 text-white rounded-md whitespace-nowrap shrink-0 cursor-pointer transition-colors self-start sm:self-auto"
        >
          {isWin ? 'Switch to Mac Guide →' : 'Switch to Windows Guide →'}
        </button>
      </div>

      {/* ============================================================
          STEP 01: OS-SPECIFIC DOWNLOAD & EXTRACT
         ============================================================ */}
      {isWin ? (
        <section className="nesoi-card p-6 space-y-4" aria-label="Windows Step 1: Download and Extract ZIP">
          <div className="space-y-1">
            <h3 className="text-lg font-bold tracking-tight text-[#002962] dark:text-[#F1F5F9]">
              01. Download &amp; Extract All in Windows File Explorer
            </h3>
            <p className="text-[13.5px] text-[#3B5578] dark:text-[#9FB3CE]">
              Windows lets you preview files inside a <code>.zip</code> without extracting them — your browser <strong>cannot</strong> load an extension from inside a compressed ZIP. Always use <strong>Extract All…</strong> first.
            </p>
          </div>

          <figure className="rounded-lg border border-[#002962]/15 dark:border-[#93C5FD]/20 bg-[#F5F3F0] dark:bg-[#0D1626] overflow-hidden">
            <img
              src={winExtractImg}
              alt="Windows 11 File Explorer extracting ipmat-cuet-vocab-builder.zip into Documents ipmat-cuet-vocab-builder containing manifest.json"
              referrerPolicy="no-referrer"
              className="w-full h-auto block object-cover"
            />
            <figcaption className="px-4 py-2.5 text-xs text-[#3B5578] dark:text-[#9FB3CE] bg-white dark:bg-[#0D1626] border-t border-[#002962]/12 dark:border-[#93C5FD]/15">
              Right-click the downloaded ZIP in <strong className="text-[#002962] dark:text-white">Downloads</strong> &rarr; <strong className="text-[#002962] dark:text-white">Extract All…</strong> &rarr; save directly into <code className="font-semibold text-[#002962] dark:text-[#93C5FD]">Documents\ipmat-cuet-vocab-builder</code> so <code className="font-semibold text-[#002962] dark:text-[#93C5FD]">manifest.json</code> sits directly inside that folder.
            </figcaption>
          </figure>

          <ol className="list-decimal pl-5 space-y-2 text-[14.5px] text-[#1A3459] dark:text-[#CBD5E1] leading-relaxed">
            <li>
              Click <strong>Download Extension ZIP</strong> in the top-right corner of this website to save{' '}
              <code className="text-[13px] bg-[#F5F3F0] dark:bg-[#0D1626] border border-[#002962]/15 dark:border-[#93C5FD]/20 px-1.5 py-0.5 rounded text-[#002962] dark:text-[#DCE8FA]">ipmat-cuet-vocab-builder.zip</code> to your <strong>Downloads</strong> folder.
            </li>
            <li>
              Press <code className="text-[13px] bg-[#F5F3F0] dark:bg-[#0D1626] border border-[#002962]/15 dark:border-[#93C5FD]/20 px-1.5 py-0.5 rounded text-[#002962] dark:text-[#DCE8FA]">Win + E</code> to open File Explorer &rarr; open <strong>Downloads</strong> &rarr; right-click the ZIP file &rarr; click <strong>Extract All…</strong>.
            </li>
            <li>
              Click <strong>Browse…</strong>, choose your <strong>Documents</strong> folder (e.g.{' '}
              <code className="text-[13px] bg-[#F5F3F0] dark:bg-[#0D1626] border border-[#002962]/15 dark:border-[#93C5FD]/20 px-1.5 py-0.5 rounded text-[#002962] dark:text-[#DCE8FA]">C:\Users\YourName\Documents</code>), and click <strong>Extract</strong>.
            </li>
            <li>
              Open the extracted <code className="text-[13px] bg-[#F5F3F0] dark:bg-[#0D1626] border border-[#002962]/15 dark:border-[#93C5FD]/20 px-1.5 py-0.5 rounded text-[#002962] dark:text-[#DCE8FA]">ipmat-cuet-vocab-builder</code> folder once to make sure you immediately see <code className="text-[13px] bg-[#F5F3F0] dark:bg-[#0D1626] border border-[#002962]/15 dark:border-[#93C5FD]/20 px-1.5 py-0.5 rounded text-[#002962] dark:text-[#DCE8FA]">manifest.json</code>, <code className="text-[13px] bg-[#F5F3F0] dark:bg-[#0D1626] border border-[#002962]/15 dark:border-[#93C5FD]/20 px-1.5 py-0.5 rounded text-[#002962] dark:text-[#DCE8FA]">background.js</code>, and <code className="text-[13px] bg-[#F5F3F0] dark:bg-[#0D1626] border border-[#002962]/15 dark:border-[#93C5FD]/20 px-1.5 py-0.5 rounded text-[#002962] dark:text-[#DCE8FA]">icons\</code> (not another nested folder with the same name).
            </li>
          </ol>
        </section>
      ) : (
        <section className="nesoi-card p-6 space-y-4" aria-label="Mac Step 1: Download and Unzip in Finder">
          <div className="space-y-1">
            <h3 className="text-lg font-bold tracking-tight text-[#002962] dark:text-[#F1F5F9]">
              01. Download, Unzip in Finder &amp; Move to Documents
            </h3>
            <p className="text-[13.5px] text-[#3B5578] dark:text-[#9FB3CE]">
              Keep the unzipped extension folder inside <strong>Documents</strong> rather than Downloads so macOS Storage Management or cleanup never removes it while loaded.
            </p>
          </div>

          <figure className="rounded-lg border border-[#002962]/15 dark:border-[#93C5FD]/20 bg-[#F5F3F0] dark:bg-[#0D1626] overflow-hidden">
            <img
              src={macExtractImg}
              alt="macOS Finder extracting ipmat-cuet-vocab-builder.zip in Downloads and moving ipmat-cuet-vocab-builder into Documents with manifest.json visible"
              referrerPolicy="no-referrer"
              className="w-full h-auto block object-cover"
            />
            <figcaption className="px-4 py-2.5 text-xs text-[#3B5578] dark:text-[#9FB3CE] bg-white dark:bg-[#0D1626] border-t border-[#002962]/12 dark:border-[#93C5FD]/15">
              Double-click the ZIP in <strong className="text-[#002962] dark:text-white">Downloads</strong>, then drag <code className="font-semibold text-[#002962] dark:text-[#93C5FD]">ipmat-cuet-vocab-builder</code> into <strong className="text-[#002962] dark:text-white">Documents</strong> (check that <code className="font-semibold text-[#002962] dark:text-[#93C5FD]">manifest.json</code> is directly inside).
            </figcaption>
          </figure>

          <ol className="list-decimal pl-5 space-y-2 text-[14.5px] text-[#1A3459] dark:text-[#CBD5E1] leading-relaxed">
            <li>
              Click <strong>Download Extension ZIP</strong> in the top-right corner to download{' '}
              <code className="text-[13px] bg-[#F5F3F0] dark:bg-[#0D1626] border border-[#002962]/15 dark:border-[#93C5FD]/20 px-1.5 py-0.5 rounded text-[#002962] dark:text-[#DCE8FA]">ipmat-cuet-vocab-builder.zip</code> into <strong>Downloads</strong>.
            </li>
            <li>
              Open <strong>Finder</strong> (<code className="text-[13px] bg-[#F5F3F0] dark:bg-[#0D1626] border border-[#002962]/15 dark:border-[#93C5FD]/20 px-1.5 py-0.5 rounded text-[#002962] dark:text-[#DCE8FA]">Cmd + Space</code> &rarr; Finder) &rarr; go to <strong>Downloads</strong> &rarr; double-click the <code>.zip</code> file (if Safari or Chrome didn&apos;t already auto-extract it).
            </li>
            <li>
              Drag the extracted <code className="text-[13px] bg-[#F5F3F0] dark:bg-[#0D1626] border border-[#002962]/15 dark:border-[#93C5FD]/20 px-1.5 py-0.5 rounded text-[#002962] dark:text-[#DCE8FA]">cuet-vocabulary-builder</code> folder into <strong>Documents</strong> in the Finder sidebar (press <code className="text-[13px] bg-[#F5F3F0] dark:bg-[#0D1626] border border-[#002962]/15 dark:border-[#93C5FD]/20 px-1.5 py-0.5 rounded text-[#002962] dark:text-[#DCE8FA]">Cmd + Shift + O</code>).
            </li>
            <li>
              Verify that <code className="text-[13px] bg-[#F5F3F0] dark:bg-[#0D1626] border border-[#002962]/15 dark:border-[#93C5FD]/20 px-1.5 py-0.5 rounded text-[#002962] dark:text-[#DCE8FA]">manifest.json</code> is directly inside <code className="text-[13px] bg-[#F5F3F0] dark:bg-[#0D1626] border border-[#002962]/15 dark:border-[#93C5FD]/20 px-1.5 py-0.5 rounded text-[#002962] dark:text-[#DCE8FA]">Documents/cuet-vocabulary-builder</code> (if macOS created a <code>cuet-vocabulary-builder 2</code> folder from an earlier attempt, rename or delete the old one).
            </li>
          </ol>
        </section>
      )}

      {/* ============================================================
          STEP 02: PERSONAL GEMINI API KEY (Both Windows & Mac)
         ============================================================ */}
      <section className="nesoi-card p-6 space-y-3">
        <h3 className="text-lg font-bold tracking-tight text-[#002962] dark:text-[#F1F5F9]">
          02. Create your free personal Gemini API key
        </h3>
        <ol className="list-decimal pl-5 space-y-2 text-[14.5px] text-[#1A3459] dark:text-[#CBD5E1] leading-relaxed">
          <li>
            Open <strong>aistudio.google.com</strong> in your browser and sign in with your Google account.
          </li>
          <li>
            In the left sidebar, click <strong>Get API key</strong>, then click <strong>Create API key</strong>.
          </li>
          <li>
            Copy the generated key (starts with{' '}
            <code className="text-[13px] bg-[#F5F3F0] dark:bg-[#0D1626] border border-[#002962]/15 dark:border-[#93C5FD]/20 px-1.5 py-0.5 rounded text-[#002962] dark:text-[#DCE8FA]">AIza</code>) using{' '}
            <code className="text-[13px] bg-[#F5F3F0] dark:bg-[#0D1626] border border-[#002962]/15 dark:border-[#93C5FD]/20 px-1.5 py-0.5 rounded text-[#002962] dark:text-[#DCE8FA]">
              {isWin ? 'Ctrl + C' : 'Cmd + C'}
            </code>
            . It stays stored privately in local browser extension storage on your {isWin ? 'PC' : 'Mac'}.
          </li>
        </ol>
      </section>

      {/* ============================================================
          STEP 03: LOAD UNPACKED IN YOUR BROWSER
         ============================================================ */}
      <section className="nesoi-card p-6 space-y-4">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold tracking-tight text-[#002962] dark:text-[#F1F5F9]">
            03. Enable Developer mode &amp; Load unpacked in your browser
          </h3>
          <p className="text-[13.5px] text-[#3B5578] dark:text-[#9FB3CE]">
            Works identically in <strong className="text-[#002962] dark:text-white">Google Chrome</strong> (<code className="font-semibold text-[#002962] dark:text-[#93C5FD]">chrome://extensions</code>), <strong className="text-[#002962] dark:text-white">Brave</strong> (<code className="font-semibold text-[#002962] dark:text-[#93C5FD]">brave://extensions</code>), <strong className="text-[#002962] dark:text-white">Microsoft Edge</strong> (<code className="font-semibold text-[#002962] dark:text-[#93C5FD]">edge://extensions</code>), <strong className="text-[#002962] dark:text-white">Vivaldi</strong> (<code className="font-semibold text-[#002962] dark:text-[#93C5FD]">vivaldi://extensions</code>), <strong className="text-[#002962] dark:text-white">Opera / Opera GX</strong> (<code className="font-semibold text-[#002962] dark:text-[#93C5FD]">opera://extensions</code>), <strong className="text-[#002962] dark:text-white">Arc</strong> (<code className="font-semibold text-[#002962] dark:text-[#93C5FD]">arc://extensions</code>), and <strong className="text-[#002962] dark:text-white">Chromium / Ungoogled Chromium</strong> (<code className="font-semibold text-[#002962] dark:text-[#93C5FD]">chrome://extensions</code>).
          </p>
        </div>

        <figure className="rounded-lg border border-[#002962]/12 dark:border-[#93C5FD]/20 bg-[#F5F3F0] dark:bg-[#0D1626] overflow-hidden">
          <img
            src={chromiumLoadUnpackedImg}
            alt="Chromium Extensions page showing chrome://extensions address bar, Developer mode toggled ON, Load unpacked button highlighted, and IPMAT/CUET VOCAB BUILDER installed"
            referrerPolicy="no-referrer"
            className="w-full h-auto block object-cover"
          />
          <figcaption className="px-4 py-2.5 text-xs text-[#3B5578] dark:text-[#9FB3CE] bg-white dark:bg-[#0D1626] border-t border-[#002962]/12 dark:border-[#93C5FD]/15">
            Turn ON <strong className="text-[#002962] dark:text-white">Developer mode</strong> (top-right), click <strong className="text-[#002962] dark:text-white">Load unpacked</strong> (top-left), and choose your extracted <code className="font-semibold text-[#002962] dark:text-[#93C5FD]">ipmat-cuet-vocab-builder</code> folder.
          </figcaption>
        </figure>

        <ol className="list-decimal pl-5 space-y-2 text-[14.5px] text-[#1A3459] dark:text-[#CBD5E1] leading-relaxed">
          <li>
            Open a new tab in your browser ({isWin ? 'Ctrl + T' : 'Cmd + T'}), paste your browser&apos;s extensions URL (e.g.{' '}
            <code className="text-[13px] bg-[#F5F3F0] dark:bg-[#0D1626] border border-[#002962]/15 dark:border-[#93C5FD]/20 px-1.5 py-0.5 rounded text-[#002962] dark:text-[#DCE8FA]">chrome://extensions</code>,{' '}
            <code className="text-[13px] bg-[#F5F3F0] dark:bg-[#0D1626] border border-[#002962]/15 dark:border-[#93C5FD]/20 px-1.5 py-0.5 rounded text-[#002962] dark:text-[#DCE8FA]">edge://extensions</code>,{' '}
            <code className="text-[13px] bg-[#F5F3F0] dark:bg-[#0D1626] border border-[#002962]/15 dark:border-[#93C5FD]/20 px-1.5 py-0.5 rounded text-[#002962] dark:text-[#DCE8FA]">brave://extensions</code>,{' '}
            <code className="text-[13px] bg-[#F5F3F0] dark:bg-[#0D1626] border border-[#002962]/15 dark:border-[#93C5FD]/20 px-1.5 py-0.5 rounded text-[#002962] dark:text-[#DCE8FA]">arc://extensions</code>), and press <strong>Enter</strong>.
          </li>
          <li>
            Flip the <strong>Developer mode</strong> toggle <strong>ON</strong> (top-right in Chrome, Brave, Vivaldi, Opera, Arc; left sidebar or top-right in Microsoft Edge).
          </li>
          <li>
            Click <strong>Load unpacked</strong>, open{' '}
            <code className="text-[13px] bg-[#F5F3F0] dark:bg-[#0D1626] border border-[#002962]/15 dark:border-[#93C5FD]/20 px-1.5 py-0.5 rounded text-[#002962] dark:text-[#DCE8FA]">
              {isWin ? 'Documents\\ipmat-cuet-vocab-builder' : 'Documents/ipmat-cuet-vocab-builder'}
            </code>
            , and click <strong>{isWin ? 'Select Folder' : 'Select'}</strong>.
          </li>
          <li>
            {!isWin && (
              <>
                <strong>Arc on macOS tip:</strong> If the top bar hides extensions, press <code className="text-[12.5px] bg-[#F5F3F0] dark:bg-[#0D1626] border border-[#002962]/15 dark:border-[#93C5FD]/20 px-1 py-0.5 rounded text-[#002962] dark:text-[#DCE8FA]">Cmd + T</code>, type <em>Manage Extensions</em>, or go directly to <code className="text-[12.5px] bg-[#F5F3F0] dark:bg-[#0D1626] border border-[#002962]/15 dark:border-[#93C5FD]/20 px-1 py-0.5 rounded text-[#002962] dark:text-[#DCE8FA]">arc://extensions</code>.{' '}
              </>
            )}
            If the browser shows <em>&ldquo;Manifest file is missing or unreadable&rdquo;</em>, open one folder deeper so you select the folder directly containing <code className="text-[12.5px] bg-[#F5F3F0] dark:bg-[#0D1626] border border-[#002962]/15 dark:border-[#93C5FD]/20 px-1 py-0.5 rounded text-[#002962] dark:text-[#DCE8FA]">manifest.json</code>.
          </li>
        </ol>
      </section>

      {/* ============================================================
          STEP 04: PIN ICON & CONFIGURE SETTINGS
         ============================================================ */}
      <section className="nesoi-card p-6 space-y-4">
        <h3 className="text-lg font-semibold tracking-tight text-[#002962] dark:text-[#F1F5F9]">
          04. Pin the icon, paste your Gemini key &amp; test connection
        </h3>

        <figure className="rounded-lg border border-[#002962]/12 dark:border-[#93C5FD]/20 bg-[#F5F3F0] dark:bg-[#0D1626] overflow-hidden">
          <img
            src={pinAndSettingsImg}
            alt="Pinning IPMAT/CUET VOCAB BUILDER from the browser puzzle-piece Extensions menu and verifying Gemini 3.1 Flash Lite connection in Extension Settings"
            referrerPolicy="no-referrer"
            className="w-full h-auto block object-cover"
          />
          <figcaption className="px-4 py-2.5 text-xs text-[#3B5578] dark:text-[#9FB3CE] bg-white dark:bg-[#0D1626] border-t border-[#002962]/12 dark:border-[#93C5FD]/15">
            Pin the extension from the puzzle-piece toolbar icon, open <strong className="text-[#002962] dark:text-white">Settings</strong>, paste your key (powered by <strong className="text-[#002962] dark:text-white">Gemini 3.1 Flash Lite</strong>), and click <strong className="text-[#002962] dark:text-white">Test Gemini Connection</strong>.
          </figcaption>
        </figure>

        <ol className="list-decimal pl-5 space-y-2 text-[14.5px] text-[#1A3459] dark:text-[#CBD5E1] leading-relaxed">
          <li>
            Click the puzzle-piece <strong>Extensions</strong> button in the top-right toolbar (or cube icon in Opera / top-right menu in Arc) and click the <strong>Pin</strong> icon next to <strong>IPMAT/CUET VOCAB BUILDER</strong>.
          </li>
          <li>
            Click the pinned extension icon, then click <strong>Settings</strong> in the popup header.
          </li>
          <li>
            Paste your Gemini API key (<code className="text-[12.5px] bg-[#F5F3F0] dark:bg-[#0D1626] border border-[#002962]/15 dark:border-[#93C5FD]/20 px-1 py-0.5 rounded text-[#002962] dark:text-[#DCE8FA]">{isWin ? 'Ctrl + V' : 'Cmd + V'}</code>) — powered by <strong>Gemini 3.1 Flash Lite</strong> — set your Daily Study Goal &amp; <strong>In-Page Word Highlighter</strong> preference, and click <strong>Save Settings</strong>.
          </li>
          <li>
            Click <strong>Test Gemini Connection</strong> — you should immediately see a confirmation with a sample meaning for <em>pragmatic</em>.
          </li>
        </ol>
      </section>

      {/* ============================================================
          STEP 05: GOOGLE SHEETS 3-TAB AUTO-SAVE
         ============================================================ */}
      <section className="nesoi-card p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold tracking-tight text-[#002962] dark:text-[#F1F5F9]">
            05. Connect Google Sheets 3-tab auto-save ({isWin ? 'Windows' : 'macOS'})
          </h3>
          <button
            type="button"
            onClick={handleCopyScript}
            className="h-8 px-4 text-xs font-semibold bg-[#EEF3F9] dark:bg-[#172540] border border-[#002962]/20 dark:border-[#93C5FD]/25 rounded-md text-[#002962] dark:text-[#E8EEF7] hover:bg-[#E1EAF5] dark:hover:bg-[#1E3154] transition-colors cursor-pointer whitespace-nowrap"
          >
            {copiedScript ? 'Copied Script!' : 'Copy Apps Script'}
          </button>
        </div>

        <p className="text-[14px] text-[#3B5578] dark:text-[#9FB3CE] leading-relaxed">
          Download our starter 3-tab workbook (matching <code className="text-xs bg-[#F5F3F0] dark:bg-[#0D1626] border border-[#002962]/15 dark:border-[#93C5FD]/20 px-1 py-0.5 rounded text-[#002962] dark:text-[#DCE8FA]">Word, Meaning, Example Sentence</code> across <strong className="text-[#002962] dark:text-white">Words</strong>, <strong className="text-[#002962] dark:text-white">Idioms</strong>, and <strong className="text-[#002962] dark:text-white">Phrasal Verbs</strong>), open Google Sheets directly in your browser to import it, and deploy the Apps Script webhook below.
        </p>

        <div className="rounded-lg border border-[#002962]/12 dark:border-[#93C5FD]/15 bg-[#F5F3F0] dark:bg-[#0D1626] p-4 space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-[#002962] dark:text-[#F1F5F9]">
                Download Starter Template or Open Google Sheets
              </h4>
              <p className="text-xs text-[#3B5578] dark:text-[#9FB3CE] mt-0.5">
                Includes frozen headers across <strong>Words</strong>, <strong>Idioms</strong>, and <strong>Phrasal Verbs</strong> (.xlsx) or single-tab Words (.csv).
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleDownloadTemplateXlsx}
                className="h-8 px-3.5 text-xs font-semibold bg-[#002962] dark:bg-[#2563EB] text-white rounded-md hover:bg-[#001F4D] dark:hover:bg-[#1D4ED8] transition-colors cursor-pointer whitespace-nowrap"
              >
                Download 3-Tab Sheet (.xlsx)
              </button>
              <button
                type="button"
                onClick={handleDownloadTemplateCsv}
                className="h-8 px-3.5 text-xs font-semibold bg-white dark:bg-[#111C30] border border-[#002962]/20 dark:border-[#93C5FD]/22 text-[#002962] dark:text-[#E8EEF7] rounded-md hover:bg-[#EEF3F9] dark:hover:bg-[#172540] transition-colors cursor-pointer whitespace-nowrap"
              >
                Download Words CSV
              </button>
              <a
                href="https://docs.google.com/spreadsheets"
                target="_blank"
                rel="noopener noreferrer"
                className="h-8 px-3.5 inline-flex items-center text-xs font-semibold bg-[#EEF3F9] dark:bg-[#172540] border border-[#002962]/20 dark:border-[#93C5FD]/25 text-[#002962] dark:text-[#E8EEF7] rounded-md hover:bg-[#E1EAF5] dark:hover:bg-[#1E3154] transition-colors whitespace-nowrap"
              >
                Open in Google Sheets &rarr;
              </a>
            </div>
          </div>
          {templateMsg && (
            <p className="text-xs font-medium text-[#002962] dark:text-[#E8EEF7] bg-[#EEF3F9] dark:bg-[#172540] border border-[#002962]/20 dark:border-[#93C5FD]/25 rounded-md px-3 py-1.5">
              {templateMsg}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <figure className="rounded-lg border border-[#002962]/12 dark:border-[#93C5FD]/20 bg-[#F5F3F0] dark:bg-[#0D1626] overflow-hidden">
            <img
              src={sheetsDeployImg}
              alt="Google Apps Script Deploy New deployment as Web app with Who has access set to Anyone"
              referrerPolicy="no-referrer"
              className="w-full h-48 object-cover block"
            />
            <figcaption className="px-3.5 py-2 text-xs text-[#3B5578] dark:text-[#9FB3CE] bg-white dark:bg-[#0D1626] border-t border-[#002962]/12 dark:border-[#93C5FD]/15">
              Choose <strong className="text-[#002962] dark:text-white">Web app</strong>, set <strong className="text-[#002962] dark:text-white">Execute as: Me</strong> and <strong className="text-[#002962] dark:text-white">Who has access: Anyone</strong>.
            </figcaption>
          </figure>

          <figure className="rounded-lg border border-[#002962]/12 dark:border-[#93C5FD]/20 bg-[#F5F3F0] dark:bg-[#0D1626] overflow-hidden">
            <img
              src="/assets/aistudio/image_16d45d81.png"
              alt="Google Apps Script Authorise access dialog shown during first Web app deployment"
              referrerPolicy="no-referrer"
              className="w-full h-48 object-cover object-top block"
            />
            <figcaption className="px-3.5 py-2 text-xs text-[#3B5578] dark:text-[#9FB3CE] bg-white dark:bg-[#0D1626] border-t border-[#002962]/12 dark:border-[#93C5FD]/15">
              Click <strong className="text-[#002962] dark:text-white">Authorise access</strong> &rarr; choose your Google account &rarr; if warned &ldquo;Google hasn&apos;t verified this app&rdquo;, click <strong className="text-[#002962] dark:text-white">Advanced</strong> &rarr; <strong className="text-[#002962] dark:text-white">Go to Untitled project (unsafe)</strong> &rarr; <strong className="text-[#002962] dark:text-white">Allow</strong>.
            </figcaption>
          </figure>
        </div>

        <ol className="list-decimal pl-5 space-y-2 text-[14.5px] text-[#1A3459] dark:text-[#CBD5E1] leading-relaxed">
          <li>
            Click <strong>Open in Google Sheets &rarr;</strong> above, start a <strong>Blank spreadsheet</strong>, click <strong>File &rarr; Import &rarr; Upload</strong>, choose your downloaded <code className="text-[12.5px] bg-[#F5F3F0] dark:bg-[#0D1626] border border-[#002962]/15 dark:border-[#93C5FD]/20 px-1 py-0.5 rounded text-[#002962] dark:text-[#DCE8FA]">{STARTER_XLSX_FILENAME}</code>, and pick <strong>Replace spreadsheet</strong>.
          </li>
          <li>In the Google Sheets top menu, click <strong>Extensions &rarr; Apps Script</strong>.</li>
          <li>
            Select all placeholder text (<code className="text-[12.5px] bg-[#F5F3F0] dark:bg-[#0D1626] border border-[#002962]/15 dark:border-[#93C5FD]/20 px-1 py-0.5 rounded text-[#002962] dark:text-[#DCE8FA]">{isWin ? 'Ctrl + A' : 'Cmd + A'}</code>), delete it, paste the script below (<code className="text-[12.5px] bg-[#F5F3F0] dark:bg-[#0D1626] border border-[#002962]/15 dark:border-[#93C5FD]/20 px-1 py-0.5 rounded text-[#002962] dark:text-[#DCE8FA]">{isWin ? 'Ctrl + V' : 'Cmd + V'}</code>), and click the <strong>Save</strong> floppy icon.
          </li>
          <li>Click the blue <strong>Deploy &rarr; New deployment</strong> button (top-right). Click the gear next to <em>Select type</em> &rarr; choose <strong>Web app</strong>.</li>
          <li>Set <strong>Execute as</strong> to <strong>Me</strong>, set <strong>Who has access</strong> to <strong>Anyone</strong>, and click <strong>Deploy</strong>.</li>
          <li>When prompted <em>&ldquo;The web app requires you to authorise access to your data&rdquo;</em>, click <strong>Authorise access</strong>, pick your Google account, click <strong>Advanced &rarr; Go to Untitled project (unsafe) &rarr; Allow</strong>.</li>
          <li>
            Copy the final <strong>Web app URL</strong> (ends in <code className="text-[13px] bg-[#F5F3F0] dark:bg-[#0D1626] border border-[#002962]/15 dark:border-[#93C5FD]/20 px-1.5 py-0.5 rounded text-[#002962] dark:text-[#DCE8FA]">/exec</code>), paste it into the extension&apos;s <strong>Settings</strong> page (or this site&apos;s <strong>Sheet Template &amp; Setup</strong> modal), and run a live test.
          </li>
        </ol>

        <pre className="p-3.5 bg-[#F5F3F0] dark:bg-[#0D1626] border border-[#002962]/12 dark:border-[#93C5FD]/20 rounded-lg text-xs font-mono text-[#002962] dark:text-[#DCE8FA] overflow-x-auto max-h-56 leading-relaxed">
          {BRAVE_APPS_SCRIPT_CODE}
        </pre>
      </section>

      {/* ============================================================
          STEP 06: VERIFICATION & OS TROUBLESHOOTING
         ============================================================ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <section className="nesoi-card p-6 space-y-3">
          <h3 className="text-lg font-semibold tracking-tight text-[#002962] dark:text-[#F1F5F9]">
            06. Quick verification checklist ({isWin ? 'Windows' : 'Mac'})
          </h3>
          <ul className="list-disc pl-5 space-y-2 text-[14px] text-[#1A3459] dark:text-[#CBD5E1] leading-relaxed">
            <li>
              <strong>Highlight, right-click, or shortcut save:</strong> Open any article or PDF, highlight a word, and click <strong>Save to Vocab List</strong>, right-click <strong>Save to IPMAT/CUET VOCAB BUILDER</strong>, or press{' '}
              <code className="text-xs bg-[#F5F3F0] dark:bg-[#0D1626] border border-[#002962]/15 dark:border-[#93C5FD]/20 px-1 py-0.5 rounded text-[#002962] dark:text-[#DCE8FA]">
                {isWin ? 'Alt + Shift + V' : 'Option + Shift + V'}
              </code>
              .
            </li>
            <li>
              <strong>Passive revision highlights:</strong> Refresh an article containing a saved <em>New</em> or <em>Learning</em> word and hover over the dotted underline to peek its meaning.
            </li>
            <li>
              <strong>Two-way Google Sheets sync:</strong> Verify newly saved words append into <strong>Words</strong>, <strong>Idioms</strong>, or <strong>Phrasal Verbs</strong>, and test <strong>Pull from Sheet</strong> in Backup &amp; Export.
            </li>
            <li>
              <strong>THE VOCAB VAULT, PDF &amp; Anki Export:</strong> Open the extension&apos;s <strong>THE VOCAB VAULT</strong> page to test Audio Pronunciation, Flashcards, Quiz Mode, <strong>Download PDF</strong>, and <strong>Export Anki (.tsv)</strong>.
            </li>
          </ul>
        </section>

        <section className="nesoi-card p-6 space-y-3">
          <h3 className="text-lg font-semibold tracking-tight text-[#002962] dark:text-[#F1F5F9]">
            {isWin ? 'Common Windows mistakes to avoid' : 'Common Mac mistakes to avoid'}
          </h3>
          {isWin ? (
            <ul className="list-disc pl-5 space-y-2 text-[14px] text-[#1A3459] dark:text-[#CBD5E1] leading-relaxed">
              <li>
                <strong>Loading inside the ZIP without Extract All…:</strong> Windows Explorer lets you open a <code>.zip</code> as if it were a folder, but browsers reject it — always click <strong>Extract All…</strong> first.
              </li>
              <li>
                <strong>OneDrive moving/unsyncing the folder:</strong> If your Documents folder is synced with OneDrive &ldquo;Files On-Demand&rdquo;, right-click <code className="text-xs bg-[#F5F3F0] dark:bg-[#0D1626] border border-[#002962]/15 dark:border-[#93C5FD]/20 px-1 py-0.5 rounded text-[#002962] dark:text-[#DCE8FA]">cuet-vocabulary-builder</code> &rarr; <strong>Always keep on this device</strong> (or store under <code className="text-xs bg-[#F5F3F0] dark:bg-[#0D1626] border border-[#002962]/15 dark:border-[#93C5FD]/20 px-1 py-0.5 rounded text-[#002962] dark:text-[#DCE8FA]">C:\Extensions\</code>).
              </li>
              <li>
                <strong>Pasting the Apps Script /edit URL instead of /exec:</strong> Your webhook URL must end in <code className="text-xs bg-[#F5F3F0] dark:bg-[#0D1626] border border-[#002962]/15 dark:border-[#93C5FD]/20 px-1 py-0.5 rounded text-[#002962] dark:text-[#DCE8FA]">/exec</code>, and <em>Who has access</em> must be set to <strong>Anyone</strong>.
              </li>
              <li>
                <strong>Selecting the outer parent folder:</strong> Make sure the folder you choose in <em>Load unpacked</em> directly contains <code className="text-xs bg-[#F5F3F0] dark:bg-[#0D1626] border border-[#002962]/15 dark:border-[#93C5FD]/20 px-1 py-0.5 rounded text-[#002962] dark:text-[#DCE8FA]">manifest.json</code>.
              </li>
            </ul>
          ) : (
            <ul className="list-disc pl-5 space-y-2 text-[14px] text-[#1A3459] dark:text-[#CBD5E1] leading-relaxed">
              <li>
                <strong>Trying to install in Apple Safari:</strong> Safari cannot load unpacked Chromium ZIP extensions. Use Google Chrome, Brave, Arc, Edge, Vivaldi, or Opera on Mac.
              </li>
              <li>
                <strong>iCloud Drive optimizing Documents away:</strong> If iCloud &ldquo;Optimize Mac Storage&rdquo; removes local files, keep <code className="text-xs bg-[#F5F3F0] dark:bg-[#0D1626] border border-[#002962]/15 dark:border-[#93C5FD]/20 px-1 py-0.5 rounded text-[#002962] dark:text-[#DCE8FA]">cuet-vocabulary-builder</code> downloaded locally (or put it in <code className="text-xs bg-[#F5F3F0] dark:bg-[#0D1626] border border-[#002962]/15 dark:border-[#93C5FD]/20 px-1 py-0.5 rounded text-[#002962] dark:text-[#DCE8FA]">~/Extensions</code>).
              </li>
              <li>
                <strong>Duplicate <code>cuet-vocabulary-builder 2</code> folder:</strong> If you unzipped twice in Downloads, delete the duplicate before dragging to Documents so you select the folder with <code className="text-xs bg-[#F5F3F0] dark:bg-[#0D1626] border border-[#002962]/15 dark:border-[#93C5FD]/20 px-1 py-0.5 rounded text-[#002962] dark:text-[#DCE8FA]">manifest.json</code>.
              </li>
              <li>
                <strong>Apps Script /edit URL or &ldquo;Only myself&rdquo;:</strong> Always copy the deployed <code className="text-xs bg-[#F5F3F0] dark:bg-[#0D1626] border border-[#002962]/15 dark:border-[#93C5FD]/20 px-1 py-0.5 rounded text-[#002962] dark:text-[#DCE8FA]">/exec</code> Web app URL with <em>Who has access: Anyone</em>.
              </li>
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};
