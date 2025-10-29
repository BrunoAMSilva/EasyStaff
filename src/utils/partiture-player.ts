import { PianoAudioPlayer } from "./audio-engine";

export interface HostContext {
    host: HTMLElement;
    grid: Element;
    beats: Element[];
    notes: Element[];
    totalBeats: number;
    spacing: number;
    progress: number;
    lastProgress: number;
    playheadX: number;
    maxScroll: number;
    initialScroll: number;
    playing: boolean;
    playStartBeat: number;
    playStartTime: number;
    scrubbing: boolean;
    resumeAfterScrub: boolean;
    scrubStartX: number;
    scrubStartBeat: number;
    ignoreScroll: boolean;
    ignoreScrollRaf: number | null;
    observer: IntersectionObserver | null;
    interval: number | null;
    playheadEl: Element | null;
    initialised: boolean;
    reduced: boolean;
    setBeat: (beat: number, options?: { sync?: boolean; source?: string }) => void;
    play: () => void;
    pause: () => void;
    tick: (now: number) => void;
    onTempoChange: () => void;
    handleSeek: (detail: any) => void;
    remeasure: () => void;
    destroy: () => void;
    syncScroll: () => void;
    onPointerDown: (event: PointerEvent) => void;
    onPointerMove: (event: PointerEvent) => void;
    onPointerUp: (event: PointerEvent) => void;
    onPointerCancel: (event: PointerEvent) => void;
    onWheel: (event: WheelEvent) => void;
    onScroll: () => void;
}

export interface PlayerState {
    tempo: number;
    msPerBeat: number;
    hosts: HostContext[];
    playing: boolean;
    rafId: number | null;
    audioScheduled: boolean;
}

export interface PartiturePlayerConfig {
    defaultTempo?: number;
    totalBeatsHint?: number;
    playheadBandHalf?: number;
    playStartDelayMs?: number;
    prefersReducedMotion?: boolean;
}

export class PartiturePlayer {
    private config: Required<PartiturePlayerConfig>;
    private state: PlayerState;
    private audioPlayer: PianoAudioPlayer;
    private audioInitialized = false;
    private notesForAudio: any[] = [];
    private divisions = 1;

    constructor(config: PartiturePlayerConfig = {}) {
        this.config = {
            defaultTempo: 120,
            totalBeatsHint: 0,
            playheadBandHalf: 12,
            playStartDelayMs: 1000,
            prefersReducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
            ...config,
        };

        this.state = {
            tempo: this.config.defaultTempo,
            msPerBeat: (60 / this.config.defaultTempo) * 1000,
            hosts: [],
            playing: false,
            rafId: null,
            audioScheduled: false,
        };

        this.audioPlayer = PianoAudioPlayer.getInstance();
    }

    setAudioData(notesForAudio: any[], divisions: number) {
        this.notesForAudio = notesForAudio;
        this.divisions = divisions;
    }

    private clamp(value: number, min: number, max: number): number {
        return Math.min(max, Math.max(min, value));
    }

    private averageSpacing(beats: Element[]): number {
        if (!beats || beats.length < 2) return 0;
        let total = 0;
        let samples = 0;
        const limit = Math.min(8, beats.length - 1);
        for (let i = 0; i < limit; i++) {
            const a = beats[i].getBoundingClientRect();
            const b = beats[i + 1].getBoundingClientRect();
            const delta = b.left - a.left;
            if (!Number.isFinite(delta) || delta === 0) continue;
            total += delta;
            samples++;
        }
        return samples ? total / samples : 0;
    }

    private createHost(hostEl: HTMLElement): HostContext | null {
        const grid = hostEl.querySelector(".staff-grid");
        if (!grid) return null;

        const beats = Array.from(grid.querySelectorAll(".beat"));
        const notes = Array.from(grid.querySelectorAll(".note-visual"));

        const ctx: HostContext = {
            host: hostEl,
            grid,
            beats,
            notes,
            totalBeats: beats.length || this.config.totalBeatsHint,
            spacing: 0,
            progress: 0,
            lastProgress: 0,
            playheadX: 0,
            maxScroll: 0,
            initialScroll: 0,
            playing: false,
            playStartBeat: 0,
            playStartTime: 0,
            scrubbing: false,
            resumeAfterScrub: false,
            scrubStartX: 0,
            scrubStartBeat: 0,
            ignoreScroll: false,
            ignoreScrollRaf: null,
            observer: null,
            interval: null,
            playheadEl: hostEl.querySelector(".playhead") || null,
            initialised: false,
            reduced: false,
            setBeat: () => {},
            play: () => {},
            pause: () => {},
            tick: () => {},
            onTempoChange: () => {},
            handleSeek: () => {},
            remeasure: () => {},
            destroy: () => {},
            syncScroll: () => {},
            onPointerDown: () => {},
            onPointerMove: () => {},
            onPointerUp: () => {},
            onPointerCancel: () => {},
            onWheel: () => {},
            onScroll: () => {},
        };

        ctx.reduced =
            this.config.prefersReducedMotion ||
            !ctx.totalBeats ||
            beats.length === 0;

        ctx.spacing = this.averageSpacing(beats);
        if (!Number.isFinite(ctx.spacing) || ctx.spacing <= 0) {
            ctx.spacing = 0;
            ctx.reduced = true;
        }

        const setScroll = (value: number) => {
            const clamped = this.clamp(value, 0, ctx.maxScroll);
            if (Math.abs(ctx.host.scrollLeft - clamped) < 0.5) return;
            ctx.ignoreScroll = true;
            if (ctx.ignoreScrollRaf !== null) {
                window.cancelAnimationFrame(ctx.ignoreScrollRaf);
                ctx.ignoreScrollRaf = null;
            }
            ctx.host.scrollLeft = clamped;
            ctx.ignoreScrollRaf = window.requestAnimationFrame(() => {
                ctx.ignoreScroll = false;
                ctx.ignoreScrollRaf = null;
            });
        };

        const syncScroll = () => {
            const spacing = ctx.spacing > 0 ? ctx.spacing : 0;
            const target = spacing
                ? ctx.initialScroll + ctx.progress * spacing
                : ctx.initialScroll;
            setScroll(target);
        };

        const setBeat = (beat: number, options: { sync?: boolean; source?: string } = {}) => {
            const { sync = true, source = "set" } = options;
            const clamped = this.clamp(beat, 0, ctx.totalBeats || 0);

            // Detect if playback looped back to the beginning
            const hasLooped = source === "tick" && ctx.lastProgress > ctx.totalBeats * 0.9 && clamped < ctx.totalBeats * 0.1;

            ctx.lastProgress = ctx.progress;
            ctx.progress = clamped;

            if (sync) syncScroll();

            if (source !== "tick" && ctx.playing && !ctx.reduced) {
                ctx.playStartBeat = clamped;
                ctx.playStartTime = performance.now();
            }

            // Reschedule audio when looping occurs
            if (hasLooped && this.state.playing) {
                this.scheduleAudio(0);
            }
        };

        const handleSeek = (detail: any) => {
            if (!detail) return;
            if (typeof detail.beat === "number") {
                setBeat(detail.beat);
            } else if (typeof detail.progress === "number") {
                setBeat(detail.progress * ctx.totalBeats);
            } else if (typeof detail.deltaBeat === "number") {
                setBeat(ctx.progress + detail.deltaBeat);
            }
        };

        const handleScroll = () => {
            if (ctx.ignoreScroll || ctx.spacing <= 0) return;
            const beat =
                (ctx.host.scrollLeft - ctx.initialScroll) / ctx.spacing;
            setBeat(beat, { sync: false, source: "scroll" });
        };

        const finishScrub = (pointerId: number) => {
            ctx.scrubbing = false;
            try {
                if (ctx.host.hasPointerCapture(pointerId)) {
                    ctx.host.releasePointerCapture(pointerId);
                }
            } catch (e) {}
            if (ctx.resumeAfterScrub) this.setPlaying(true);
        };

        const attachInputHandlers = () => {
            ctx.onPointerDown = (event: PointerEvent) => {
                if (!event.isPrimary) return;
                ctx.scrubbing = true;
                ctx.resumeAfterScrub = this.state.playing;
                this.setPlaying(false);
                ctx.scrubStartX = event.clientX;
                ctx.scrubStartBeat = ctx.progress;
                try {
                    ctx.host.setPointerCapture(event.pointerId);
                } catch (e) {}
            };

            ctx.onPointerMove = (event: PointerEvent) => {
                if (!ctx.scrubbing) return;
                const deltaPx = event.clientX - ctx.scrubStartX;
                const beatsDelta = ctx.spacing
                    ? deltaPx / ctx.spacing
                    : 0;
                setBeat(ctx.scrubStartBeat - beatsDelta);
            };

            ctx.onPointerUp = (event: PointerEvent) => {
                if (ctx.scrubbing) finishScrub(event.pointerId);
            };

            ctx.onPointerCancel = (event: PointerEvent) => {
                if (ctx.scrubbing) finishScrub(event.pointerId);
            };

            ctx.onWheel = (event: WheelEvent) => {
                if (!event.shiftKey || ctx.spacing <= 0) return;
                event.preventDefault();
                setBeat(ctx.progress + event.deltaY / ctx.spacing);
            };

            ctx.onScroll = handleScroll;

            ctx.host.addEventListener("pointerdown", ctx.onPointerDown);
            ctx.host.addEventListener("pointermove", ctx.onPointerMove);
            ctx.host.addEventListener("pointerup", ctx.onPointerUp);
            ctx.host.addEventListener("pointercancel", ctx.onPointerCancel);
            ctx.host.addEventListener("wheel", ctx.onWheel, {
                passive: false,
            });
            ctx.host.addEventListener("scroll", ctx.onScroll, {
                passive: true,
            });
        };

        const refreshObserver = () => {
            if (ctx.observer) {
                try {
                    ctx.observer.disconnect();
                } catch (e) {}
                ctx.observer = null;
            }

            const hostWidth =
                ctx.host.clientWidth ||
                ctx.host.getBoundingClientRect().width ||
                0;
            if (!hostWidth) return;

            const bandStart = this.clamp(
                ctx.playheadX - this.config.playheadBandHalf,
                0,
                hostWidth,
            );
            const bandEnd = this.clamp(
                ctx.playheadX + this.config.playheadBandHalf,
                0,
                hostWidth,
            );
            const rootMargin = `0px -${Math.max(
                0,
                hostWidth - bandEnd,
            )}px 0px -${bandStart}px`;

            ctx.observer = new IntersectionObserver(
                (entries) => {
                    const viewportCenter =
                        (window.innerWidth ||
                            document.documentElement.clientWidth) / 2;
                    entries.forEach((entry) => {
                        const target = entry.target;
                        if (!target) return;
                        if (entry.isIntersecting) {
                            target.classList.add("active");
                            target.classList.remove("complete");
                        } else {
                            target.classList.remove("active");
                            const rect = entry.boundingClientRect;
                            if (rect && rect.right < viewportCenter) {
                                target.classList.add("complete");
                            } else {
                                target.classList.remove("complete");
                            }
                        }
                    });
                },
                { root: ctx.host, threshold: [0], rootMargin },
            );

            const observe = (el: Element) => ctx.observer && ctx.observer.observe(el);
            ctx.beats.forEach(observe);
            ctx.notes.forEach(observe);
        };

        const remeasure = () => {
            const rect = ctx.host.getBoundingClientRect();
            const hostWidth = rect.width || ctx.host.offsetWidth || 0;
            const hostClientWidth = ctx.host.clientWidth || hostWidth;
            const viewportCenter =
                (window.innerWidth || document.documentElement.clientWidth) / 2;
            ctx.playheadX = Math.round(viewportCenter - rect.left);

            ctx.spacing = this.averageSpacing(ctx.beats);
            if (!Number.isFinite(ctx.spacing) || ctx.spacing <= 0) {
                ctx.spacing = 0;
                ctx.reduced = true;
            }

            ctx.maxScroll = Math.max(
                0,
                ctx.host.scrollWidth - hostClientWidth,
            );

            let desiredScroll = ctx.initialScroll;
            const firstBeat = ctx.beats[0];
            if (firstBeat) {
                const beatRect = firstBeat.getBoundingClientRect();
                desiredScroll =
                    ctx.host.scrollLeft +
                    (beatRect.left - (rect.left + ctx.playheadX));
            } else {
                desiredScroll = 0;
            }
            desiredScroll = this.clamp(desiredScroll, 0, ctx.maxScroll);

            if (!ctx.initialised) {
                ctx.initialScroll = 0;
                ctx.initialised = true;
            } else {
                ctx.initialScroll = desiredScroll;
            }

            syncScroll();
            refreshObserver();
        };

        const startInterval = () => {
            if (ctx.interval || ctx.totalBeats <= 0) return;
            let beat = ctx.progress;
            ctx.interval = window.setInterval(() => {
                beat = (beat + 1) % ctx.totalBeats;
                setBeat(beat, { source: "interval" });
            }, this.state.msPerBeat);
        };

        const stopInterval = () => {
            if (!ctx.interval) return;
            window.clearInterval(ctx.interval);
            ctx.interval = null;
        };

        const play = () => {
            if (ctx.playing) return;
            ctx.playing = true;
            if (ctx.reduced) {
                startInterval();
                return;
            }
            ctx.playStartBeat = ctx.progress;
            // Use minimal delay to match audio scheduling
            const delay = 50;
            ctx.playStartTime = performance.now() + delay;
        };

        const pause = () => {
            if (!ctx.playing) return;
            ctx.playing = false;
            if (ctx.reduced) {
                stopInterval();
            }
        };

        const onTempoChange = () => {
            if (ctx.reduced) {
                const wasRunning = ctx.playing;
                stopInterval();
                if (wasRunning) startInterval();
                return;
            }
            if (ctx.playing) {
                ctx.playStartBeat = ctx.progress;
                ctx.playStartTime = performance.now();
            }
        };

        const tick = (now: number) => {
            if (!ctx.playing || ctx.reduced || ctx.scrubbing) return;
            const msPerBeat = this.state.msPerBeat;
            if (!Number.isFinite(msPerBeat) || msPerBeat <= 0) return;
            if (!ctx.playStartTime) {
                ctx.playStartTime = now;
                ctx.playStartBeat = ctx.progress;
            }
            if (now < ctx.playStartTime) {
                // Hold the current beat during the pre-roll countdown.
                setBeat(ctx.playStartBeat, { source: "tick" });
                return;
            }
            const elapsed = now - ctx.playStartTime;
            const elapsedBeats = elapsed / msPerBeat;
            if (!Number.isFinite(elapsedBeats)) return;
            let beat = ctx.playStartBeat + elapsedBeats;
            if (ctx.totalBeats > 0) {
                beat %= ctx.totalBeats;
                if (beat < 0) beat += ctx.totalBeats;
            }
            setBeat(beat, { source: "tick" });
        };

        const destroy = () => {
            pause();
            stopInterval();
            if (ctx.observer) {
                try {
                    ctx.observer.disconnect();
                } catch (e) {}
                ctx.observer = null;
            }
            if (ctx.ignoreScrollRaf !== null) {
                window.cancelAnimationFrame(ctx.ignoreScrollRaf);
                ctx.ignoreScrollRaf = null;
            }
            ctx.host.removeEventListener("pointerdown", ctx.onPointerDown);
            ctx.host.removeEventListener("pointermove", ctx.onPointerMove);
            ctx.host.removeEventListener("pointerup", ctx.onPointerUp);
            ctx.host.removeEventListener("pointercancel", ctx.onPointerCancel);
            ctx.host.removeEventListener("wheel", ctx.onWheel);
            ctx.host.removeEventListener("scroll", ctx.onScroll);
        };

        ctx.setBeat = setBeat;
        ctx.play = play;
        ctx.pause = pause;
        ctx.tick = tick;
        ctx.onTempoChange = onTempoChange;
        ctx.handleSeek = handleSeek;
        ctx.remeasure = remeasure;
        ctx.destroy = destroy;
        ctx.syncScroll = syncScroll;

        attachInputHandlers();
        remeasure();

        return ctx;
    }

    rebuildHosts() {
        this.state.hosts.forEach((host) => host.destroy());
        this.state.hosts = [];

        const hosts = Array.from(document.querySelectorAll(".staff-host"));
        hosts.forEach((element) => {
            const host = this.createHost(element as HTMLElement);
            if (!host) return;
            this.state.hosts.push(host);
        });

        this.state.hosts.forEach((host) =>
            this.state.playing ? host.play() : host.pause(),
        );

        this.ensureTick();
    }

    private ensureTick() {
        if (this.state.rafId !== null) return;
        const step = (now: number) => {
            this.state.hosts.forEach((host) => host.tick(now));
            this.state.rafId = window.requestAnimationFrame(step);
        };
        this.state.rafId = window.requestAnimationFrame(step);
    }

    private async ensureAudioInitialized(): Promise<boolean> {
        if (this.audioInitialized) return true;

        try {
            await this.audioPlayer.initialize();
            this.audioInitialized = true;
            return true;
        } catch (error) {
            console.error('Failed to initialize audio:', error);
            return false;
        }
    }

    private scheduleAudio(fromBeat = 0) {
        if (!this.audioInitialized || !this.notesForAudio) return;

        // Stop any currently playing audio
        this.audioPlayer.stopAll();

        // Use minimal delay to account for audio scheduling overhead
        // This allows audio to start immediately at the current visual position
        const delay = 50; // Small delay for browser audio scheduling

        // Schedule notes from the current beat (supports fractional beats)
        this.audioPlayer.scheduleNotes(
            this.notesForAudio,
            this.state.tempo,
            this.divisions,
            fromBeat,
            delay
        );

        this.state.audioScheduled = true;
    }

    private stopAudio() {
        if (!this.audioInitialized) return;
        this.audioPlayer.stopAll();
        this.state.audioScheduled = false;
    }

    async setPlaying(shouldPlay: boolean) {
        const play = !!shouldPlay;
        if (this.state.playing === play) {
            this.state.hosts.forEach((host) =>
                play ? host.play() : host.pause(),
            );
            return;
        }
        this.state.playing = play;
        document.body.classList.toggle("playing", play);

        if (play) {
            // Initialize audio on first play - do this before starting visual playback
            const initialized = await this.ensureAudioInitialized();

            if (initialized && this.state.hosts.length > 0) {
                // Use precise beat position from visual animation (don't floor)
                const currentBeat = this.state.hosts[0]?.progress || 0;
                this.scheduleAudio(currentBeat);
            }

            // Start visual playback after audio is initialized and scheduled
            this.state.hosts.forEach((host) => host.play());
        } else {
            // Stop audio when pausing
            this.stopAudio();
            this.state.hosts.forEach((host) => host.pause());
        }
    }

    handleTempoChange(newTempo: number) {
        const tempoValue = Number(newTempo);
        if (!Number.isFinite(tempoValue) || tempoValue <= 0) return;
        if (tempoValue === this.state.tempo) return;
        this.state.tempo = tempoValue;
        this.state.msPerBeat = (60 / tempoValue) * 1000;
        this.state.hosts.forEach((host) => host.onTempoChange());

        // Reschedule audio with new tempo if playing
        if (this.state.playing && this.state.hosts.length > 0) {
            const currentBeat = this.state.hosts[0]?.progress || 0;
            this.scheduleAudio(currentBeat);
        }
    }

    handleSeek(detail: any) {
        this.state.hosts.forEach((host) => host.handleSeek(detail));

        // Reschedule audio from new position if playing
        if (this.state.playing && this.state.hosts.length > 0) {
            const currentBeat = this.state.hosts[0]?.progress || 0;
            this.scheduleAudio(currentBeat);
        }
    }

    setupEventListeners() {
        let resizeTimer: number | null = null;
        window.addEventListener("resize", () => {
            window.clearTimeout(resizeTimer!);
            resizeTimer = window.setTimeout(() => {
                this.state.hosts.forEach((host) => host.remeasure());
            }, 120);
        });

        document.addEventListener("visibilitychange", () => {
            if (document.hidden) this.setPlaying(false);
        });

        document.addEventListener("piano:play-toggle", (event: any) => {
            this.setPlaying(!!event.detail);
        });

        document.addEventListener("piano:tempo-change", (event: any) => {
            this.handleTempoChange(event.detail);
        });

        document.addEventListener("piano:seek", (event: any) => {
            this.handleSeek(event.detail);
        });

        // Cleanup audio on page unload
        window.addEventListener('beforeunload', () => {
            this.audioPlayer.dispose();
        });
    }

    debug() {
        console.group("piano_staff");
        console.log("tempo", this.state.tempo);
        console.log("msPerBeat", this.state.msPerBeat);
        console.log("audioInitialized", this.audioInitialized);
        console.log("audioScheduled", this.state.audioScheduled);
        this.state.hosts.forEach((host, index) => {
            console.group(`host[${index}]`);
            console.log("progress", host.progress);
            console.log("totalBeats", host.totalBeats);
            console.log("spacing", host.spacing);
            console.log("scrollLeft", host.host.scrollLeft);
            console.log("reduced", host.reduced);
            console.groupEnd();
        });
        console.groupEnd();
    }

    // Public API
    play() { return this.setPlaying(true); }
    pause() { return this.setPlaying(false); }
    setTempo(tempo: number) { return this.handleTempoChange(tempo); }
    seek(detail: any) { return this.handleSeek(detail); }
    isPlaying() { return this.state.playing; }
    rebuild() { return this.rebuildHosts(); }
}