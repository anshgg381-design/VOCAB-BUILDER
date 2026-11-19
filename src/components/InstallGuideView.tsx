import React, { useState } from 'react';
import { BRAVE_APPS_SCRIPT_CODE } from '../utils/googleSheets';

export const InstallGuideView: React.FC = () => {
  const [copiedScript, setCopiedScript] = useState(false);

  const handleCopyScript = async () => {
    try {
      await navigator.clipboard.writeText(BRAVE_APPS_SCRIPT_CODE);
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 1800);
    } catch {
      // Clipboard fallback ignored silently
    }
  };

  return (
    <div className="max-w-[820px] mx-auto space-y-8">
      <div className="pb-5 border-b border-slate-200">
        <h1 className="text-[28px] font-semibold tracking-tight text-slate-900">
          Install &amp; Test in Brave Desktop
        </h1>
        <p className="mt-1.5 text-[15px] text-slate-600">
          Complete beginner guide — no coding, no terminal commands, and optional automatic saving to a 3-tab Google Sheet.
        </p>
      </div>

      {/* Step 1 */}
      <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">
          01. Download and unzip the extension folder
        </h2>
        <ol className="list-decimal pl-5 space-y-2 text-[14.5px] text-slate-700 leading-relaxed">
          <li>
            Click <strong>Download Extension ZIP</strong> in the top-right corner of this page to download{' '}
            <code className="text-[13px] bg-slate-100 px-1.5 py-0.5 rounded">cuet-ug-2027-vocabulary-collector.zip</code>.
          </li>
          <li>
            Right-click the downloaded ZIP file and choose <strong>Extract All</strong> (Windows) or double-click it (macOS).
          </li>
          <li>
            Move the extracted <code className="text-[13px] bg-slate-100 px-1.5 py-0.5 rounded">cuet-vocabulary-builder</code> folder somewhere permanent (such as your <strong>Documents</strong> folder). Do not delete this folder after loading it in Brave.
          </li>
        </ol>
      </section>

      {/* Step 2 */}
      <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">
          02. Get your free Gemini API key
        </h2>
        <ol className="list-decimal pl-5 space-y-2 text-[14.5px] text-slate-700 leading-relaxed">
          <li>
            Open <strong>aistudio.google.com</strong> in Brave and sign in with your Google account.
          </li>
          <li>
            Click <strong>Get API key</strong> in the left navigation menu.
          </li>
          <li>
            Click <strong>Create API key</strong> and copy the key (it begins with{' '}
            <code className="text-[13px] bg-slate-100 px-1.5 py-0.5 rounded">AIza</code>). Keep it private.
          </li>
        </ol>
      </section>

      {/* Step 3 */}
      <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">
          03. Load the extension in Brave
        </h2>
        <ol className="list-decimal pl-5 space-y-2 text-[14.5px] text-slate-700 leading-relaxed">
          <li>
            Open a new tab in Brave, type{' '}
            <code className="text-[13px] bg-slate-100 px-1.5 py-0.5 rounded">brave://extensions</code> in the address bar, and press <strong>Enter</strong>.
          </li>
          <li>
            Turn ON the <strong>Developer mode</strong> switch in the top-right corner.
          </li>
          <li>
            Click <strong>Load unpacked</strong> in the top-left corner.
          </li>
          <li>
            Select your extracted <code className="text-[13px] bg-slate-100 px-1.5 py-0.5 rounded">cuet-vocabulary-builder</code> folder (the folder that contains{' '}
            <code className="text-[13px] bg-slate-100 px-1.5 py-0.5 rounded">manifest.json</code>).
          </li>
          <li>
            Click the puzzle-piece <strong>Extensions</strong> icon in Brave&apos;s toolbar and pin <strong>CUET Vocabulary Builder</strong> for one-click access.
          </li>
        </ol>
      </section>

      {/* Step 4 */}
      <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">
          04. Save your API key &amp; test the connection
        </h2>
        <ol className="list-decimal pl-5 space-y-2 text-[14.5px] text-slate-700 leading-relaxed">
          <li>Click the pinned <strong>CUET Vocabulary Builder</strong> icon in Brave.</li>
          <li>Click <strong>Settings</strong> in the top-right of the popup.</li>
          <li>Paste your Gemini API key, keep <strong>Gemini 2.5 Flash</strong> selected (or choose another model), and click <strong>Save Settings</strong>.</li>
          <li>Click <strong>Test Gemini Connection</strong>. You should see a confirmation message with a sample meaning for <em>pragmatic</em>.</li>
        </ol>
      </section>

      {/* Step 5: Google Sheets Auto-Save in Brave */}
      <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">
            05. Enable automatic Google Sheets saving in Brave
          </h2>
          <button
            type="button"
            onClick={handleCopyScript}
            className="h-8 px-3 text-xs font-medium bg-white border border-slate-300 rounded-md text-slate-800 hover:bg-slate-50 cursor-pointer"
          >
            {copiedScript ? 'Copied Script!' : 'Copy Apps Script'}
          </button>
        </div>
        <p className="text-[14px] text-slate-600 leading-relaxed">
          In this web app, you can sign in directly with Google on the <strong>Live Preview</strong> or <strong>My CUET Library</strong> tab. To also auto-save from your unpacked Brave extension into the exact same 3 tabs (<strong>Words</strong>, <strong>Idioms</strong>, <strong>Phrasal Verbs</strong>), attach this short script to your Google Sheet once:
        </p>
        <ol className="list-decimal pl-5 space-y-2 text-[14.5px] text-slate-700 leading-relaxed">
          <li>Open your CUET Google Sheet (or create a new one at <strong>sheets.new</strong>).</li>
          <li>Click <strong>Extensions &rarr; Apps Script</strong> in the Google Sheets toolbar.</li>
          <li>Replace the default editor text with the script below and save it.</li>
          <li>Click <strong>Deploy &rarr; New deployment</strong>, choose <strong>Web app</strong>, set <strong>Who has access</strong> to <strong>Anyone</strong>, and click <strong>Deploy</strong>.</li>
          <li>Copy the Web App URL (ending in <code className="text-[13px] bg-slate-100 px-1.5 py-0.5 rounded">/exec</code>), paste it into <strong>Google Sheets Auto-Save URL</strong> on the extension&apos;s Settings page, click <strong>Save Settings</strong>, and click <strong>Test Google Sheet</strong>.</li>
        </ol>
        <pre className="p-3.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-800 overflow-x-auto max-h-56 leading-relaxed">
          {BRAVE_APPS_SCRIPT_CODE}
        </pre>
      </section>

      {/* Step 6: Testing Checklist */}
      <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">
          06. Quick verification checklist
        </h2>
        <ul className="list-disc pl-5 space-y-2 text-[14.5px] text-slate-700 leading-relaxed">
          <li>
            <strong>Webpage text selection:</strong> Open any article on Aeon, Medium, Substack, or a newspaper. Highlight a word, idiom, or phrasal verb. Click <strong>Save to CUET List</strong>, confirm or adjust the category, and click <strong>Save</strong>.
          </li>
          <li>
            <strong>Automatic Google Sheet row:</strong> Immediately after Gemini returns the meaning and example sentence, check your Google Sheet—the entry appears automatically in the <strong>Words</strong>, <strong>Idioms</strong>, or <strong>Phrasal Verbs</strong> tab with three columns (Expression, Meaning, Example Sentence).
          </li>
          <li>
            <strong>Manual &amp; bulk entry:</strong> Click the extension icon, paste{' '}
            <code className="text-[13px] bg-slate-100 px-1.5 py-0.5 rounded">aberration, meticulous, break the ice, come across</code>, leave category on <strong>Auto-detect</strong>, and click <strong>Save and Analyse</strong>.
          </li>
          <li>
            <strong>Local persistence &amp; backups:</strong> Close Brave completely, reopen it, and open <strong>My CUET Library</strong>. Every saved entry remains intact, and JSON/CSV export stays available at any time.
          </li>
        </ul>
      </section>

      {/* Privacy & Backup Notes */}
      <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-2.5">
        <h2 className="text-lg font-semibold text-slate-900">
          Important Storage &amp; Security Notes
        </h2>
        <ul className="list-disc pl-5 space-y-2 text-[14px] text-slate-600 leading-relaxed">
          <li>
            <strong>Periodic backups:</strong> All vocabulary, idioms, and phrasal verbs live locally in Brave via{' '}
            <code className="text-[12.5px] bg-slate-100 px-1.5 py-0.5 rounded">chrome.storage.local</code> (plus your connected Google Sheet when enabled). Export a JSON backup regularly.
          </li>
          <li>
            <strong>Personal-use API key storage:</strong> Your Gemini API key is never hardcoded, never shared with webpage scripts, and never included in exported backups. Keep this extension strictly for your personal study.
          </li>
        </ul>
      </section>
    </div>
  );
};
