import React from 'react';
import {
  ArrowRight,
  BookOpen,
  FileSpreadsheet,
  Globe,
  Keyboard,
  ShieldCheck,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { SUPPORTED_BROWSERS } from '../utils/browserSupport';

interface HowItWorksViewProps {
  onOpenPreview: () => void;
  onOpenInstallGuide: () => void;
  onOpenLibrary: () => void;
}

const PIPELINE_STEPS = [
  {
    step: '01',
    title: 'Highlight text, right-click, or press Alt+Shift+V on any webpage',
    file: 'extension/content.js · background.js',
    summary:
      'While reading essays on Aeon, newspapers, or PDFs/articles in Brave, Chrome, Edge, Vivaldi, Opera, or Arc, highlighting any English word, idiom, or phrasal verb wakes an isolated Shadow DOM trigger next to your cursor — plus you can right-click "Save to IPMAT/CUET VOCAB BUILDER" or press Alt+Shift+V even on embedded PDFs.',
    details: [
      'Reads only your selected expression and its surrounding sentence — never scrapes full articles or tracks browsing history.',
      'Optional In-Page Word Highlighter underlines saved New (orange dotted) and Learning (teal dotted) words whenever they appear on articles, with hover-to-peek meaning and example tooltips.',
      'Press Alt+Shift+V (or Alt+Shift+S), or right-click and choose "Save to IPMAT/CUET VOCAB BUILDER", to capture even when sites block floating page overlays.',
    ],
  },
  {
    step: '02',
    title: 'Smart Auto-Categorisation (Editable before saving)',
    file: 'extension/shared.js',
    summary:
      'Before contacting Gemini, a lightweight rule engine classifies your selection into one of three IPMAT & CUET collections — and lets you override it in one click.',
    details: [
      'Single words (e.g., "pragmatic", "ephemeral") route automatically to Vocabulary (Words).',
      'Verb + particle combinations (e.g., "put off", "come across", "look forward to") route to Phrasal Verbs.',
      'Multi-word figurative expressions (e.g., "break the ice", "a blessing in disguise") route to Idioms.',
    ],
  },
  {
    step: '03',
    title: 'Strict 3-Field Gemini AI Analysis',
    file: 'extension/background.js',
    summary:
      'The Manifest V3 background worker calls your personal Gemini API key (Gemini 3.1 Flash Lite) with strict structured-JSON instructions built for IPMAT and CUET revision speed.',
    details: [
      'Sends the expression plus your article sentence so polysemous words (words with multiple meanings) return only the exact meaning that fits your context.',
      'Enforces a clean 3-key JSON schema: Expression, one plain-English Meaning, and one original Example Sentence — no synonym clutter.',
      'Your Gemini API key stays inside the background worker and chrome.storage.local — webpage content scripts never have access to it.',
    ],
  },
  {
    step: '04',
    title: 'Bidirectional Sync: Local Library + 3-Tab Google Sheet Push & Pull',
    file: 'background.js · Google Apps Script Web App',
    summary:
      'Every analysed entry saves first to local browser storage for offline speed, appends immediately to your Google Sheet, and supports two-way Pull from Sheet across devices.',
    details: [
      'Routes Vocabulary -> Words tab, Idioms -> Idioms tab, and Phrasal Verbs -> Phrasal Verbs tab with 3 clean columns.',
      'Use Push to Sheet and Pull from Sheet in both the web dashboard and extension Backup & Export panel to sync new rows or edits made directly in Sheets while preserving local mastery levels and favourites.',
      'Updates the extension toolbar badge counter showing how many words you have saved toward your daily target (and turns green ✓ when your daily goal is hit).',
    ],
  },
  {
    step: '05',
    title: 'Active Recall: Flashcards, Quizzes, PDF Study Sheets & Anki (.tsv)',
    file: 'extension/dashboard.html · Web Workbench',
    summary:
      'THE VOCAB VAULT — both here on the web and inside the extension dashboard — turns raw collected expressions into a structured exam-prep system.',
    details: [
      'Track mastery across New, Learning, and Mastered states with an interactive progress bar and category/mastery insights.',
      'Revise with Flip Flashcards (Study Mode), 5–20 question Multiple-Choice Quizzes (Random or Choose Words), and one-click Audio Pronunciation.',
      'Generate category-filtered A4 Printable PDF Study Sheets directly inside the extension dashboard or web library, or click Export Anki (.tsv) for instant Anki deck import.',
    ],
  },
];

export const HowItWorksView: React.FC<HowItWorksViewProps> = ({
  onOpenPreview,
  onOpenInstallGuide,
  onOpenLibrary,
}) => {
  return (
    <div className="max-w-[960px] mx-auto space-y-6">
      {/* Midnight Navy Hero Overview */}
      <section className="nesoi-navy-panel rounded-xl text-white p-6 sm:p-8 shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="max-w-2xl space-y-2">
            <p className="text-[11px] font-mono font-semibold uppercase tracking-[0.14em] text-[#FDBA74]">
              Architecture &amp; Workflow
            </p>
            <h1 className="text-[30px] sm:text-[38px] font-light tracking-[-0.03em] text-white leading-[1.08]">
              How IPMAT/CUET VOCAB BUILDER Works<span className="text-[#EA580C] font-semibold" aria-hidden="true">.</span>
            </h1>
            <p className="text-[14.5px] text-[#DCE8FA] leading-relaxed">
              From highlighting an unfamiliar phrase on any website to revising flashcards, quizzing yourself, printing PDF study sheets, and syncing rows into Google Sheets — here is every step inside the Manifest V3 extension and web workbench.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onOpenPreview}
              className="h-9 px-4 text-[13px] font-semibold bg-white text-[#002962] rounded-md hover:bg-[#EEF3F9] transition-colors inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              Try Live Preview
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onOpenInstallGuide}
              className="h-9 px-4 text-[13px] font-semibold bg-white/10 text-white border border-white/25 rounded-md hover:bg-white/20 transition-colors cursor-pointer whitespace-nowrap"
            >
              Install Guide
            </button>
          </div>
        </div>

        {/* 4-Stage Visual Flow Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {[
            {
              icon: BookOpen,
              step: '1. Capture',
              desc: 'Highlight, right-click menu, or press Alt+Shift+V',
            },
            {
              icon: Sparkles,
              step: '2. Analyse',
              desc: 'Gemini returns 1 plain meaning + 1 sentence',
            },
            {
              icon: FileSpreadsheet,
              step: '3. Sync',
              desc: 'Local library + Words / Idioms / Phrasal Verbs tabs',
            },
            {
              icon: Volume2,
              step: '4. Master',
              desc: 'Flashcards, MCQs, Audio, Insights & Daily Streak',
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="rounded-lg bg-white/10 border border-white/20 px-4 py-3.5 space-y-1.5"
              >
                <div className="flex items-center gap-2 text-[#FDBA74]">
                  <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span className="text-xs font-semibold uppercase tracking-[0.06em] text-white">
                    {item.step}
                  </span>
                </div>
                <p className="text-[12.5px] text-[#DCE8FA] leading-snug">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Detailed Step-by-Step Pipeline */}
      <section aria-label="Step-by-step extension pipeline" className="space-y-4">
        {PIPELINE_STEPS.map((item) => (
          <article key={item.step} className="nesoi-card p-6 space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-[19px] sm:text-[20px] font-semibold tracking-[-0.02em] text-[#002962] dark:text-[#F1F5F9]">
                <span className="font-mono text-sm text-[#EA580C] dark:text-[#FB923C] mr-2 tabular-nums">{item.step}</span>
                {item.title}
              </h2>
              <code className="text-[11.5px] font-mono bg-[#F5F3F0] dark:bg-[#0D1626] border border-[#002962]/15 dark:border-[#93C5FD]/20 px-2 py-0.5 rounded text-[#3B5578] dark:text-[#9FB3CE]">
                {item.file}
              </code>
            </div>
            <p className="text-[14.5px] text-[#1A3459] dark:text-[#CBD5E1] leading-relaxed">{item.summary}</p>
            <ul className="list-disc pl-5 space-y-1.5 text-[13.5px] text-[#3B5578] dark:text-[#9FB3CE] leading-relaxed">
              {item.details.map((bullet, i) => (
                <li key={i}>{bullet}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      {/* Keyboard Shortcuts & Privacy Guarantees */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <section className="nesoi-card p-6 space-y-3">
          <div className="flex items-center gap-2 text-[#002962] dark:text-[#F1F5F9]">
            <Keyboard className="w-4 h-4 text-[#EA580C] dark:text-[#FB923C]" aria-hidden="true" />
            <h2 className="text-base font-semibold text-[#002962] dark:text-[#F1F5F9]">Power Shortcuts &amp; Built-In Tools</h2>
          </div>
          <ul className="space-y-2 text-[13.5px] text-[#3B5578] dark:text-[#9FB3CE] leading-relaxed">
            <li>
              <code className="text-xs bg-[#F5F3F0] dark:bg-[#0D1626] border border-[#002962]/15 dark:border-[#93C5FD]/20 px-1.5 py-0.5 rounded font-semibold text-[#002962] dark:text-[#DCE8FA]">
                Alt + Shift + V
              </code>{' '}
              /{' '}
              <code className="text-xs bg-[#F5F3F0] dark:bg-[#0D1626] border border-[#002962]/15 dark:border-[#93C5FD]/20 px-1.5 py-0.5 rounded font-semibold text-[#002962] dark:text-[#DCE8FA]">
                Alt + Shift + S
              </code>{' '}
              &amp; <strong className="text-[#002962] dark:text-white">Right-Click Context Menu</strong> — Save highlighted text anytime, even on embedded PDFs or sites that block page overlays.
            </li>
            <li>
              <strong className="text-[#002962] dark:text-white">In-Page Word Highlighter:</strong> Optionally underline saved <em>New</em> and <em>Learning</em> words as you browse articles, with hover-to-peek meanings.
            </li>
            <li>
              <code className="text-xs bg-[#F5F3F0] dark:bg-[#0D1626] border border-[#002962]/15 dark:border-[#93C5FD]/20 px-1.5 py-0.5 rounded font-semibold text-[#002962] dark:text-[#DCE8FA]">
                Space
              </code>{' '}
              ·{' '}
              <code className="text-xs bg-[#F5F3F0] dark:bg-[#0D1626] border border-[#002962]/15 dark:border-[#93C5FD]/20 px-1.5 py-0.5 rounded font-semibold text-[#002962] dark:text-[#DCE8FA]">
                1
              </code>{' '}
              ·{' '}
              <code className="text-xs bg-[#F5F3F0] dark:bg-[#0D1626] border border-[#002962]/15 dark:border-[#93C5FD]/20 px-1.5 py-0.5 rounded font-semibold text-[#002962] dark:text-[#DCE8FA]">
                2
              </code>{' '}
              — In Study Mode, flip the flashcard and mark <em>Needs Review</em> or <em>Known</em> hands-free.
            </li>
            <li>
              <strong className="text-[#002962] dark:text-white">Audio Pronunciation &amp; Live Badge:</strong> Listen to expressions in English speech synthesis and track today&apos;s daily goal count right on the toolbar icon.
            </li>
          </ul>
        </section>

        <section className="nesoi-card p-6 space-y-3">
          <div className="flex items-center gap-2 text-[#002962] dark:text-[#F1F5F9]">
            <ShieldCheck className="w-4 h-4 text-[#EA580C] dark:text-[#FB923C]" aria-hidden="true" />
            <h2 className="text-base font-semibold text-[#002962] dark:text-[#F1F5F9]">Privacy, Permissions &amp; Web vs Extension</h2>
          </div>
          <ul className="space-y-2 text-[13.5px] text-[#3B5578] dark:text-[#9FB3CE] leading-relaxed">
            <li>
              <strong className="text-[#002962] dark:text-white">Minimal Permission Footprint:</strong> The extension requests only <code className="text-xs bg-[#F5F3F0] dark:bg-[#0D1626] border border-[#002962]/15 dark:border-[#93C5FD]/20 px-1 py-0.5 rounded text-[#002962] dark:text-[#DCE8FA]">storage</code> and <code className="text-xs bg-[#F5F3F0] dark:bg-[#0D1626] border border-[#002962]/15 dark:border-[#93C5FD]/20 px-1 py-0.5 rounded text-[#002962] dark:text-[#DCE8FA]">contextMenus</code> plus explicit host access to Gemini API and Google Apps Script — never cookies or browsing history.
            </li>
            <li>
              <strong className="text-[#002962] dark:text-white">Two-Way Google Sheets Push &amp; Pull:</strong> Auto-saves new words immediately and lets you Pull edits/rows back down from Sheets across devices.
            </li>
            <li>
              <strong className="text-[#002962] dark:text-white">PDF Study Sheets &amp; Anki (.tsv):</strong> Download category-filtered A4 PDF study sheets or Anki-ready <code className="text-xs bg-[#F5F3F0] dark:bg-[#0D1626] border border-[#002962]/15 dark:border-[#93C5FD]/20 px-1 py-0.5 rounded text-[#002962] dark:text-[#DCE8FA]">.tsv</code> decks directly from both the web library and extension dashboard.
            </li>
          </ul>
          <div className="pt-1">
            <button
              type="button"
              onClick={onOpenLibrary}
              className="h-9 px-4 text-[13px] font-semibold bg-[#EEF3F9] dark:bg-[#172540] border border-[#002962]/20 dark:border-[#93C5FD]/25 text-[#002962] dark:text-[#E8EEF7] rounded-md hover:bg-[#E1EAF5] dark:hover:bg-[#1E3154] transition-colors cursor-pointer whitespace-nowrap"
            >
              Open THE VOCAB VAULT
            </button>
          </div>
        </section>
      </div>

      {/* Supported Browsers Compatibility Matrix */}
      <section className="nesoi-card p-6 space-y-3.5" aria-label="Supported Chromium browsers">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[#002962] dark:text-[#F1F5F9]">
            <Globe className="w-4 h-4 text-[#EA580C] dark:text-[#FB923C]" aria-hidden="true" />
            <h2 className="text-base font-semibold text-[#002962] dark:text-[#F1F5F9]">
              Compatible Desktop Browsers (Windows &amp; macOS)
            </h2>
          </div>
          <button
            type="button"
            onClick={onOpenInstallGuide}
            className="text-xs font-semibold text-[#002962] dark:text-[#93C5FD] hover:text-[#EA580C] dark:hover:text-[#FB923C] hover:underline cursor-pointer transition-colors"
          >
            Open Windows &amp; Mac Install Guide &rarr;
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {SUPPORTED_BROWSERS.map((b) => (
            <div key={b.id} className="rounded-lg bg-[#F5F3F0] dark:bg-[#0D1626] border border-[#002962]/12 dark:border-[#93C5FD]/15 px-3.5 py-2.5">
              <div className="text-[13px] font-semibold text-[#002962] dark:text-[#F1F5F9]">{b.name}</div>
              <code className="text-[11.5px] font-mono font-semibold text-[#3B5578] dark:text-[#9FB3CE]">
                {b.extensionsUrl}
              </code>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
