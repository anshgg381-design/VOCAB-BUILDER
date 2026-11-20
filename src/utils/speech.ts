export function canSpeakExpression(): boolean {
  return (
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof SpeechSynthesisUtterance !== 'undefined'
  );
}

export function speakExpression(text: string): boolean {
  const cleaned = text.trim();
  if (!cleaned || !canSpeakExpression()) return false;

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(cleaned);
    utterance.lang = 'en-IN';
    utterance.rate = 0.94;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
    return true;
  } catch {
    return false;
  }
}
