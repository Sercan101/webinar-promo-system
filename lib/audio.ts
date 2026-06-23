// Komprimiert Audio im Browser VOR dem Upload: mono, 16 kHz, niedrige Bitrate (mp3).
// Ist die Aufnahme zu lang fürs Inline-Limit, wird auf die ersten Minuten gekürzt,
// die noch passen (enthält meist den ganzen Pitch). lamejs wird lazy geladen.

export interface CompressedAudio {
  file: File;
  trimmed: boolean;
  usedSeconds: number;
  totalSeconds: number;
}

export async function compressAudio(
  file: File,
  targetBytes = 3_000_000, // mp3-Größe; base64 (+33%) bleibt damit unter Vercels ~4,5-MB-Body-Limit
  bitrateKbps = 16,
): Promise<CompressedAudio> {
  const lamejs = await import("@breezystack/lamejs");
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ac = new Ctx();
  const decoded = await ac.decodeAudioData(await file.arrayBuffer());
  ac.close();

  const totalSeconds = decoded.duration;
  const sampleRate = 16000;
  const maxSeconds = Math.floor((targetBytes * 8) / (bitrateKbps * 1000));
  const usedSeconds = Math.min(totalSeconds, maxSeconds);
  const trimmed = usedSeconds < totalSeconds - 0.5;

  // Resample auf 16 kHz + Downmix auf mono über OfflineAudioContext.
  const length = Math.max(1, Math.ceil(usedSeconds * sampleRate));
  const offline = new OfflineAudioContext(1, length, sampleRate);
  const src = offline.createBufferSource();
  src.buffer = decoded;
  src.connect(offline.destination);
  src.start(0, 0, usedSeconds);
  const rendered = await offline.startRendering();
  const samples = rendered.getChannelData(0);

  // Float32 -> Int16 PCM
  const pcm = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }

  // mp3 encodieren (mono, 16 kHz, niedrige Bitrate)
  const enc = new lamejs.Mp3Encoder(1, sampleRate, bitrateKbps);
  const chunks: Uint8Array[] = [];
  const BLOCK = 1152;
  for (let i = 0; i < pcm.length; i += BLOCK) {
    const buf = enc.encodeBuffer(pcm.subarray(i, i + BLOCK));
    if (buf.length) chunks.push(new Uint8Array(buf));
  }
  const end = enc.flush();
  if (end.length) chunks.push(new Uint8Array(end));

  const blob = new Blob(chunks as BlobPart[], { type: "audio/mpeg" });
  const name = file.name.replace(/\.[^.]+$/, "") + "-komprimiert.mp3";
  return { file: new File([blob], name, { type: "audio/mpeg" }), trimmed, usedSeconds, totalSeconds };
}
