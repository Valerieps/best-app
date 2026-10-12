import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useRef } from 'react';
const DURATION_MS = 1800;
/** The "plim": two short bell-like tones, synthesized locally (no audio file, no network). */
export function playPlim() {
    try {
        const audio = new AudioContext();
        const tones = [
            [1318.5, 0],
            [1760, 0.12],
        ];
        for (const [frequency, delay] of tones) {
            const oscillator = audio.createOscillator();
            const gain = audio.createGain();
            oscillator.type = 'sine';
            oscillator.frequency.value = frequency;
            const start = audio.currentTime + delay;
            gain.gain.setValueAtTime(0.0001, start);
            gain.gain.exponentialRampToValueAtTime(0.25, start + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.6);
            oscillator.connect(gain).connect(audio.destination);
            oscillator.start(start);
            oscillator.stop(start + 0.65);
        }
        setTimeout(() => void audio.close(), 1000);
    }
    catch {
        // No sound is fine.
    }
}
function readColors() {
    const style = getComputedStyle(document.documentElement);
    return ['--color-firework-1', '--color-firework-2', '--color-firework-3', '--color-firework-4'].map((name) => style.getPropertyValue(name).trim() || '#2f5d50');
}
/** A quick fireworks animation over the page, then `onDone`. Skipped with reduced motion. */
export function Fireworks({ onDone }) {
    const canvasRef = useRef(null);
    useEffect(() => {
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const canvas = canvasRef.current;
        const context = canvas?.getContext('2d');
        if (reduced || !canvas || !context) {
            const timer = setTimeout(onDone, 600);
            return () => clearTimeout(timer);
        }
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        const colors = readColors();
        const particles = [];
        for (let burst = 0; burst < 4; burst++) {
            const cx = canvas.width * (0.2 + 0.6 * Math.random());
            const cy = canvas.height * (0.2 + 0.35 * Math.random());
            for (let i = 0; i < 40; i++) {
                const angle = (Math.PI * 2 * i) / 40;
                const speed = 2 + Math.random() * 3;
                particles.push({
                    x: cx,
                    y: cy,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    color: colors[(burst + i) % colors.length],
                });
            }
        }
        const started = performance.now();
        let frame = 0;
        const draw = (time) => {
            const progress = (time - started) / DURATION_MS;
            context.clearRect(0, 0, canvas.width, canvas.height);
            if (progress >= 1) {
                onDone();
                return;
            }
            context.globalAlpha = 1 - progress;
            for (const particle of particles) {
                particle.x += particle.vx;
                particle.y += particle.vy;
                particle.vy += 0.05;
                context.fillStyle = particle.color;
                context.beginPath();
                context.arc(particle.x, particle.y, 2.5, 0, Math.PI * 2);
                context.fill();
            }
            frame = requestAnimationFrame(draw);
        };
        frame = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(frame);
    }, [onDone]);
    return _jsx("canvas", { ref: canvasRef, className: "fireworks", "aria-hidden": "true" });
}
