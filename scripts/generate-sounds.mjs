import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const outDir = join(dirname(fileURLToPath(import.meta.url)), '../resources/sounds')
mkdirSync(outDir, { recursive: true })

function wavFromSamples(samples, sampleRate = 44100) {
  const buffer = Buffer.alloc(44 + samples.length * 2)
  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(36 + samples.length * 2, 4)
  buffer.write('WAVE', 8)
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20)
  buffer.writeUInt16LE(1, 22)
  buffer.writeUInt32LE(sampleRate, 24)
  buffer.writeUInt32LE(sampleRate * 2, 28)
  buffer.writeUInt16LE(2, 32)
  buffer.writeUInt16LE(16, 34)
  buffer.write('data', 36)
  buffer.writeUInt32LE(samples.length * 2, 40)
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    buffer.writeInt16LE(Math.round(s * 32767), 44 + i * 2)
  }
  return buffer
}

function tone(freq, duration, { attack = 0.01, decay = 0.2, sampleRate = 44100, gain = 0.45, type = 'sine' } = {}) {
  const n = Math.floor(duration * sampleRate)
  const samples = new Float64Array(n)
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate
    const env = t < attack ? t / attack : Math.exp(-(t - attack) / decay)
    const phase = 2 * Math.PI * freq * t
    const wave = type === 'square' ? Math.sign(Math.sin(phase)) : Math.sin(phase)
    samples[i] = wave * env * gain
  }
  return samples
}

function concat(parts) {
  const len = parts.reduce((s, p) => s + p.length, 0)
  const out = new Float64Array(len)
  let o = 0
  for (const part of parts) {
    out.set(part, o)
    o += part.length
  }
  return out
}

function silence(duration, sampleRate = 44100) {
  return new Float64Array(Math.floor(duration * sampleRate))
}

const sounds = {
  chime: concat([tone(523.25, 0.35, { decay: 0.28, gain: 0.4 }), tone(659.25, 0.38, { decay: 0.32, gain: 0.38 }), tone(783.99, 0.7, { decay: 0.5, gain: 0.42 })]),
  ding: concat([tone(880, 0.18, { decay: 0.12, gain: 0.4 }), silence(0.08), tone(1174, 0.55, { decay: 0.4, gain: 0.38 })]),
  horn: concat([tone(196, 0.55, { decay: 0.45, gain: 0.5, type: 'square' }), tone(246.94, 0.7, { decay: 0.5, gain: 0.42, type: 'square' })]),
  alarm: concat([
    tone(740, 0.22, { decay: 0.12, gain: 0.42 }),
    silence(0.06),
    tone(587, 0.22, { decay: 0.12, gain: 0.42 }),
    silence(0.06),
    tone(740, 0.22, { decay: 0.12, gain: 0.42 }),
    silence(0.06),
    tone(587, 0.4, { decay: 0.22, gain: 0.4 })
  ]),
  wood: concat([tone(220, 0.08, { attack: 0.002, decay: 0.05, gain: 0.55 }), silence(0.05), tone(196, 0.12, { attack: 0.002, decay: 0.08, gain: 0.5 })])
}

for (const [name, samples] of Object.entries(sounds)) {
  writeFileSync(join(outDir, `${name}.wav`), wavFromSamples(samples))
}

console.log('sounds written to', outDir)
