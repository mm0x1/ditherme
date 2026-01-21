/**
 * Video timeline component
 * Handles playback controls, scrubbing, and frame navigation
 */

import { app } from '../../app.ts';
import type { VideoMetadata } from '../../types/video.ts';
import { getVideoManager } from '../../engine/video/video-manager.ts';

/**
 * Timeline controls interface
 */
export interface TimelineControls {
    setVideo(metadata: VideoMetadata): void;
    setFrame(index: number): void;
    play(): void;
    pause(): void;
    toggle(): void;
    isPlaying(): boolean;
    onFrameChange?: (index: number) => void;
    destroy(): void;
}

/**
 * Format time as MM:SS.FF (minutes:seconds.frames)
 */
function formatTime(frame: number, frameRate: number, totalFrames: number): string {
    const totalSeconds = frame / frameRate;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const frameInSecond = frame % Math.round(frameRate);

    const maxSeconds = totalFrames / frameRate;
    const maxMinutes = Math.floor(maxSeconds / 60);

    if (maxMinutes > 0) {
        return `${minutes}:${seconds.toString().padStart(2, '0')}.${frameInSecond.toString().padStart(2, '0')}`;
    }
    return `${seconds}.${frameInSecond.toString().padStart(2, '0')}`;
}

/**
 * Initialize the video timeline
 */
export function initTimeline(container: HTMLElement): TimelineControls {
    let metadata: VideoMetadata | null = null;
    let currentFrame = 0;
    let playing = false;
    let animationId: number | null = null;
    let lastFrameTime = 0;
    let onFrameChangeCallback: ((index: number) => void) | undefined;

    // Create timeline elements
    const timeline = document.createElement('div');
    timeline.className = 'timeline';
    timeline.innerHTML = `
        <div class="timeline-controls">
            <button class="timeline-btn" id="timeline-prev" title="Previous frame (Left)">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="19 20 9 12 19 4 19 20"></polygon>
                    <line x1="5" y1="19" x2="5" y2="5"></line>
                </svg>
            </button>
            <button class="timeline-btn timeline-play" id="timeline-play" title="Play/Pause (Space)">
                <svg class="play-icon" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
                <svg class="pause-icon" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style="display: none;">
                    <rect x="6" y="4" width="4" height="16"></rect>
                    <rect x="14" y="4" width="4" height="16"></rect>
                </svg>
            </button>
            <button class="timeline-btn" id="timeline-next" title="Next frame (Right)">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="5 4 15 12 5 20 5 4"></polygon>
                    <line x1="19" y1="5" x2="19" y2="19"></line>
                </svg>
            </button>
        </div>
        <div class="timeline-scrubber">
            <div class="timeline-track">
                <div class="timeline-progress" id="timeline-progress"></div>
                <div class="timeline-thumb" id="timeline-thumb"></div>
            </div>
        </div>
        <div class="timeline-time">
            <span id="timeline-current">0.00</span>
            <span class="timeline-separator">/</span>
            <span id="timeline-total">0.00</span>
        </div>
    `;

    container.appendChild(timeline);

    // Get element references
    const prevBtn = timeline.querySelector('#timeline-prev') as HTMLButtonElement;
    const playBtn = timeline.querySelector('#timeline-play') as HTMLButtonElement;
    const nextBtn = timeline.querySelector('#timeline-next') as HTMLButtonElement;
    const playIcon = playBtn.querySelector('.play-icon') as SVGElement;
    const pauseIcon = playBtn.querySelector('.pause-icon') as SVGElement;
    const scrubber = timeline.querySelector('.timeline-scrubber') as HTMLElement;
    const progress = timeline.querySelector('#timeline-progress') as HTMLElement;
    const thumb = timeline.querySelector('#timeline-thumb') as HTMLElement;
    const currentTimeEl = timeline.querySelector('#timeline-current') as HTMLElement;
    const totalTimeEl = timeline.querySelector('#timeline-total') as HTMLElement;

    /**
     * Update the UI to reflect current state
     */
    function updateUI(): void {
        if (!metadata) return;

        const percent = (currentFrame / (metadata.frameCount - 1)) * 100;
        progress.style.width = `${percent}%`;
        thumb.style.left = `${percent}%`;
        currentTimeEl.textContent = formatTime(currentFrame, metadata.frameRate, metadata.frameCount);

        // Update play/pause button
        if (playing) {
            playIcon.style.display = 'none';
            pauseIcon.style.display = 'block';
        } else {
            playIcon.style.display = 'block';
            pauseIcon.style.display = 'none';
        }
    }

    /**
     * Set the current frame and trigger callback
     */
    function setFrameInternal(index: number, notify = true): void {
        if (!metadata) return;

        currentFrame = Math.max(0, Math.min(metadata.frameCount - 1, index));
        updateUI();

        if (notify) {
            app.setState({ currentFrame });
            onFrameChangeCallback?.(currentFrame);
        }
    }

    /**
     * Playback loop
     */
    function playbackLoop(time: number): void {
        if (!playing || !metadata) return;

        const frameDuration = 1000 / metadata.frameRate;
        const elapsed = time - lastFrameTime;

        if (elapsed >= frameDuration) {
            lastFrameTime = time - (elapsed % frameDuration);

            // Advance frame
            const nextFrame = currentFrame + 1;
            if (nextFrame >= metadata.frameCount) {
                // Loop back to start
                setFrameInternal(0);
            } else {
                setFrameInternal(nextFrame);
            }
        }

        animationId = requestAnimationFrame(playbackLoop);
    }

    /**
     * Start playback
     */
    function play(): void {
        if (playing || !metadata) return;

        playing = true;
        lastFrameTime = performance.now();
        app.setState({ isPlaying: true });
        app.emit('videoplaystate', { playing: true });
        animationId = requestAnimationFrame(playbackLoop);
        updateUI();
    }

    /**
     * Pause playback
     */
    function pause(): void {
        if (!playing) return;

        playing = false;
        app.setState({ isPlaying: false });
        app.emit('videoplaystate', { playing: false });
        if (animationId !== null) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        updateUI();
    }

    /**
     * Toggle play/pause
     */
    function toggle(): void {
        if (playing) {
            pause();
        } else {
            play();
        }
    }

    /**
     * Handle scrubber interaction
     */
    function handleScrub(event: MouseEvent | TouchEvent): void {
        if (!metadata) return;

        const rect = scrubber.getBoundingClientRect();
        const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
        const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
        const percent = x / rect.width;
        const frame = Math.round(percent * (metadata.frameCount - 1));

        setFrameInternal(frame);
    }

    // Event listeners
    prevBtn.addEventListener('click', () => {
        pause();
        setFrameInternal(currentFrame - 1);
    });

    nextBtn.addEventListener('click', () => {
        pause();
        setFrameInternal(currentFrame + 1);
    });

    playBtn.addEventListener('click', toggle);

    // Scrubber interaction
    let scrubbing = false;

    scrubber.addEventListener('mousedown', (e) => {
        scrubbing = true;
        pause();
        handleScrub(e);
    });

    document.addEventListener('mousemove', (e) => {
        if (scrubbing) {
            handleScrub(e);
        }
    });

    document.addEventListener('mouseup', () => {
        scrubbing = false;
    });

    // Touch support
    scrubber.addEventListener('touchstart', (e) => {
        scrubbing = true;
        pause();
        handleScrub(e);
    });

    document.addEventListener('touchmove', (e) => {
        if (scrubbing) {
            handleScrub(e);
        }
    });

    document.addEventListener('touchend', () => {
        scrubbing = false;
    });

    // Keyboard shortcuts
    function handleKeyboard(e: KeyboardEvent): void {
        if (!metadata) return;

        // Ignore if focus is in an input
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
            return;
        }

        switch (e.key) {
            case ' ':
                e.preventDefault();
                toggle();
                break;
            case 'ArrowLeft':
                e.preventDefault();
                pause();
                setFrameInternal(currentFrame - 1);
                break;
            case 'ArrowRight':
                e.preventDefault();
                pause();
                setFrameInternal(currentFrame + 1);
                break;
            case 'Home':
                e.preventDefault();
                pause();
                setFrameInternal(0);
                break;
            case 'End':
                e.preventDefault();
                pause();
                setFrameInternal(metadata.frameCount - 1);
                break;
        }
    }

    document.addEventListener('keydown', handleKeyboard);

    // Watch for state changes
    const unwatch = app.watch('currentFrame', (frame) => {
        if (frame !== currentFrame) {
            currentFrame = frame;
            updateUI();
        }
    });

    // Return controls
    const controls: TimelineControls = {
        setVideo(meta: VideoMetadata): void {
            metadata = meta;
            currentFrame = 0;
            totalTimeEl.textContent = formatTime(meta.frameCount - 1, meta.frameRate, meta.frameCount);
            timeline.classList.remove('hidden');
            updateUI();
        },

        setFrame(index: number): void {
            setFrameInternal(index);
        },

        play,
        pause,
        toggle,

        isPlaying(): boolean {
            return playing;
        },

        set onFrameChange(callback: ((index: number) => void) | undefined) {
            onFrameChangeCallback = callback;
        },

        destroy(): void {
            pause();
            document.removeEventListener('keydown', handleKeyboard);
            unwatch();
            timeline.remove();
        },
    };

    // Hide timeline initially
    timeline.classList.add('hidden');

    return controls;
}

// Singleton timeline instance
let timelineControls: TimelineControls | null = null;

/**
 * Get or create the timeline controls
 */
export function getTimeline(): TimelineControls | null {
    return timelineControls;
}

/**
 * Set the timeline controls instance
 */
export function setTimeline(controls: TimelineControls): void {
    timelineControls = controls;
}
