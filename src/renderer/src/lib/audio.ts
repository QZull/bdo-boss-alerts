let audioCtx: AudioContext | null = null

function context(): AudioContext {
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new AudioContext()
  }
  return audioCtx
}

function fromBase64(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function pcmWavToBuffer(ctx: AudioContext, bytes: Uint8Array): AudioBuffer {
  let offset = 12
  let channels = 1
  let sampleRate = 44100
  let bits = 16
  let dataStart = 44
  let dataSize = Math.max(0, bytes.length - 44)

  while (offset + 8 <= bytes.length) {
    const id = String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3])
    const size = bytes[offset + 4] | (bytes[offset + 5] << 8) | (bytes[offset + 6] << 16) | (bytes[offset + 7] << 24)
    const next = offset + 8 + size
    if (id === 'fmt ') {
      channels = bytes[offset + 10] | (bytes[offset + 11] << 8)
      sampleRate = bytes[offset + 12] | (bytes[offset + 13] << 8) | (bytes[offset + 14] << 16) | (bytes[offset + 15] << 24)
      bits = bytes[offset + 22] | (bytes[offset + 23] << 8)
    }
    if (id === 'data') {
      dataStart = offset + 8
      dataSize = size
      break
    }
    offset = next + (size % 2)
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset + dataStart, dataSize)
  const frames = Math.floor(dataSize / ((bits / 8) * channels))
  const buffer = ctx.createBuffer(channels, frames, sampleRate)
  for (let ch = 0; ch < channels; ch++) {
    const channel = buffer.getChannelData(ch)
    for (let i = 0; i < frames; i++) {
      channel[i] = bits === 16
        ? view.getInt16((i * channels + ch) * 2, true) / 32768
        : (view.getUint8(i * channels + ch) - 128) / 128
    }
  }
  return buffer
}

export async function playPackedSound(base64: string, mime: string, volume: number): Promise<void> {
  const ctx = context()
  if (ctx.state === 'suspended') await ctx.resume()
  if (ctx.state !== 'running') throw new Error('audio-suspended')

  const bytes = fromBase64(base64)
  const copy = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)

  let buffer: AudioBuffer
  try {
    buffer = await ctx.decodeAudioData(copy)
  } catch {
    buffer = pcmWavToBuffer(ctx, bytes)
  }

  const gain = ctx.createGain()
  gain.gain.value = Math.min(1, Math.max(0, volume))
  const source = ctx.createBufferSource()
  source.buffer = buffer
  source.connect(gain)
  gain.connect(ctx.destination)
  source.start()
  source.onended = () => {
    source.disconnect()
    gain.disconnect()
  }
}
