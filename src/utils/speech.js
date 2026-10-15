// Dictation (Web Speech API) differs between browsers: Safari sends each new phrase once, but Chrome on Android re-sends results
// already delivered (the whole session each time, or the same sentence growing word by word, each marked final). Appending each event's
// "final" results to the note therefore repeats the sentence many times. Instead the note is REBUILT at every event:
//   note = what was in the box when recording started + the whole transcript of this recording session.

// "Bonjour" / "Bonjour je m'appelle" (a growing repeat of the previous segment) count once, the longest wins.
export function transcriptOf(results) {
  const segments = [];
  for (let i = 0; i < results.length; i++) {
    const t = String((results[i] && results[i][0] && results[i][0].transcript) || '').trim();
    if (!t) continue;
    const last = segments[segments.length - 1];
    if (last && (t.toLowerCase().startsWith(last.toLowerCase()) || last.toLowerCase().startsWith(t.toLowerCase()))) {
      segments[segments.length - 1] = t.length >= last.length ? t : last;
    } else segments.push(t);
  }
  return segments.join(' ');
}

export const joinNote = (base, spoken) => [String(base || '').trim(), spoken].filter(Boolean).join(' ');
