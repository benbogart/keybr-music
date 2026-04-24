import { readFileSync } from "node:fs";
import { basename } from "node:path";

type WavPcm = {
  readonly sampleRate: number;
  /** Single channel, normalized float in [-1, 1] */
  readonly channel: Float32Array;
};

/**
 * Minimal signed 16-bit little-endian PCM RIFF WAVE (mono) loader for tests and fixtures.
 */
export function readWavFilePcm16MonoOrThrow(path: string): WavPcm {
  const buf = readFileSync(path);
  return parseWavFilePcm16MonoOrThrow(buf, basename(path));
}

export function parseWavFilePcm16MonoOrThrow(
  buf: Buffer,
  nameForError = "wav",
): WavPcm {
  if (buf.length < 44) {
    throw new Error(`${nameForError}: file too small`);
  }
  if (buf.toString("ascii", 0, 4) !== "RIFF") {
    throw new Error(`${nameForError}: not RIFF`);
  }
  if (buf.toString("ascii", 8, 12) !== "WAVE") {
    throw new Error(`${nameForError}: not WAVE`);
  }

  let offset = 12;
  let dataOffset = 0;
  let dataSize = 0;
  let sampleRate = 0;
  let numChannels = 0;
  let bits = 0;

  while (offset + 8 <= buf.length) {
    const id = buf.toString("ascii", offset, offset + 4);
    const size = buf.readUInt32LE(offset + 4);
    const chunkData = offset + 8;
    if (id === "fmt ") {
      const audioFormat = buf.readUInt16LE(chunkData);
      numChannels = buf.readUInt16LE(chunkData + 2);
      sampleRate = buf.readUInt32LE(chunkData + 4);
      bits = buf.readUInt16LE(chunkData + 14);
      if (audioFormat !== 1) {
        throw new Error(
          `${nameForError}: expected PCM (format 1), got ${audioFormat}`,
        );
      }
      if (bits !== 16) {
        throw new Error(
          `${nameForError}: expected 16 bits per sample, got ${bits}`,
        );
      }
    } else if (id === "data") {
      dataOffset = chunkData;
      dataSize = size;
      break;
    }
    offset = chunkData + size + (size & 1);
  }

  if (dataSize === 0 || sampleRate === 0) {
    throw new Error(`${nameForError}: missing data or format chunk`);
  }
  if (numChannels < 1) {
    throw new Error(`${nameForError}: no channels`);
  }

  const bytesPerFrame = (bits / 8) * numChannels;
  if (dataSize % bytesPerFrame !== 0) {
    throw new Error(
      `${nameForError}: data size is not a whole number of frames`,
    );
  }
  const nFrames = dataSize / bytesPerFrame;
  const channel = new Float32Array(nFrames);
  let p = dataOffset;
  const scale = 1 / 32768;
  for (let i = 0; i < nFrames; i += 1) {
    let s = 0;
    for (let c = 0; c < numChannels; c += 1) {
      // Average channels if more than one (e.g. stereo) so tests keep one “mono” view.
      s += buf.readInt16LE(p);
      p += 2;
    }
    channel[i] = s * (scale / numChannels);
  }

  return { sampleRate, channel };
}
