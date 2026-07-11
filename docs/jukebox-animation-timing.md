# Jukebox animation timing

Jukebox lyrics animations are synchronized to media playback through a shared
clock and a small set of animation controllers. This document describes that
architecture and the rules for adding or changing a media-timed animation.

## Goals

The timing layer must keep an animation correct when:

- the animated React node mounts after playback has started,
- React reuses or remounts a node,
- playback pauses, resumes, seeks, or changes rate,
- the media element buffers,
- a virtualized lyrics row enters or leaves the DOM,
- React Strict Mode replays a ref lifecycle, and
- browser scheduling differs between Chromium and Firefox.

The central rule is:

> `HTMLMediaElement.currentTime` is the authoritative playback position at
> every synchronization point.

Animation code must not independently reconstruct media time from
`performance.now()`, wait for a WebVTT cue, or assume that a ref will be ready
when an unrelated effect runs.

## Architecture

```text
HTMLMediaElement
  │
  ├─ readPlaybackSnapshot()
  │    └─ currentTime, duration, playbackRate, playing/paused
  │
  └─ useMediaClock()
       ├─ media events + visibility restoration
       ├─ one cancellable requestAnimationFrame loop while advancing
       └─ consumers
            ├─ usePlayerLyricsState() → current lyrics frame
            ├─ usePlayerState() → transport changes
            ├─ useWebAnimationController() → WAAPI Animation
            └─ synchronizeGsapTimeline() → GSAP timeline
```

The relevant implementation files are:

| Responsibility                                    | File                                                        |
| ------------------------------------------------- | ----------------------------------------------------------- |
| Media snapshots, clock subscription, frame lookup | `packages/jukebox/src/hooks/useMediaClock.ts`               |
| Current lyrics frame selection                    | `packages/jukebox/src/hooks/usePlayerLyricsState.ts`        |
| Playback and controller types                     | `packages/jukebox/src/hooks/types.ts`                       |
| Web Animations API lifecycle                      | `packages/jukebox/src/hooks/useWebAnimationController.ts`   |
| GSAP synchronization                              | `packages/jukebox/src/hooks/useTrackwiseTimelineControl.ts` |
| General cancellable frame loop                    | `packages/jukebox/src/hooks/useAnimationFrame.ts`           |

## Playback snapshots

`readPlaybackSnapshot(player)` produces the complete state needed by an
animation:

```ts
interface PlaybackSnapshot {
  currentTime: number; // seconds
  duration: number; // seconds; may be NaN before metadata
  playbackRate: number;
  state: "playing" | "paused";
}
```

`state` describes whether an animation should advance, not merely the value of
`player.paused`. A media element is treated as paused when it:

- is explicitly paused,
- has ended, or
- has `readyState` lower than `HTMLMediaElement.HAVE_FUTURE_DATA`.

The `waiting` and `stalled` events trigger a new snapshot. When `readyState`
shows that playback cannot advance, the snapshot freezes the lyrics animation
until enough future data is available again.

Always read a fresh snapshot when synchronizing an animation:

```ts
const player = playerRef.current;
if (player) {
  animationRef.current?.synchronize(readPlaybackSnapshot(player));
}
```

Do not calculate a substitute position from `PlayerState.startingAt`.

## The media clock

`useMediaClock(playerRef, onSnapshot)` subscribes to the events that can change
transport state or invalidate timing:

- metadata and duration changes,
- play, playing, pause, and rate changes,
- seeking and seek completion,
- time updates,
- buffering transitions, and
- document visibility restoration.

The hook emits immediately after it attaches. While media is advancing, it also
maintains one `requestAnimationFrame` loop so short lyrics boundaries are not
limited by the browser's relatively infrequent `timeupdate` events. The loop
stops during pause, buffering, end-of-track, and cleanup.

The callback is stored in a ref. Updating the callback therefore does not tear
down the media listeners or create another frame loop.

Use `{ animationFrames: false }` when a consumer only needs transport changes,
as `usePlayerState` does:

```ts
useMediaClock(playerRef, synchronizeTransport, {
  animationFrames: false,
});
```

## Selecting the current lyrics frame

`usePlayerLyricsState` no longer creates an HTML track or relies on `VTTCue`
`enter` events. It:

1. filters and orders finite keyframe start times,
2. uses `findActiveKeyframeIndex` to find the latest start at or before
   `currentTime`,
3. updates React state only when the selected frame changes, and
4. explicitly resynchronizes when the keyframe schedule changes while playback
   is paused.

The binary search returns `-1` before the first frame. Duplicate start times
select the last keyframe at that time.

Clock callbacks may run every rendered frame, but React components do not
rerender every frame: `currentFrameId` is published only at a lyrics boundary.

## Web Animations API

Use `useWebAnimationController` for animations created with
`element.animate()`.

```tsx
const TimedSpan = forwardRef<PlaybackAnimationController, Props>(
  function TimedSpan({ duration, children }, ref) {
    const createAnimation = useCallback(
      (element: HTMLSpanElement) =>
        element.animate([{ opacity: 0.5 }, { opacity: 1 }], {
          duration: duration * 1000,
          fill: "both",
        }),
      [duration],
    );

    const elementRef = useWebAnimationController(ref, createAnimation);

    return (
      <span ref={elementRef} style={{ opacity: 1 }}>
        {children}
      </span>
    );
  },
);
```

The controller:

- creates the animation when the callback ref attaches,
- pauses it before initial synchronization,
- remembers the latest snapshot even if no element is mounted,
- reapplies that snapshot after `animation.ready` resolves,
- sets both `currentTime` and `playbackRate`,
- keeps completed, fill-mode animations paused at their end state, and
- cancels the animation when the ref detaches or its factory changes.

The factory should be wrapped in `useCallback`. Changing one of its
dependencies deliberately detaches the old callback ref, cancels the old
animation, and creates a new animation on the same DOM node.

Base presentation belongs in React's `style` or class props. Do not mutate a DOM
style and later use that style as an "animation initialized" flag.

## GSAP timelines

Create every media-controlled GSAP timeline paused and after its target nodes
have committed:

```tsx
const [timeline, setTimeline] = useState<gsap.core.Timeline | null>(null);

useLayoutEffect(() => {
  const target = targetRef.current;
  if (!target) return;

  const nextTimeline = gsap
    .timeline({ paused: true })
    .fromTo(target, { x: 0 }, { x: 100, duration: 10, ease: "none" });

  setTimeline(nextTimeline);
  return () => nextTimeline.kill();
}, [timingInputs]);

useTrackwiseTimelineControl(playerRef, playerState, timeline);
```

`useTrackwiseTimelineControl` reads a fresh media snapshot whenever the
transport or timeline changes. `synchronizeGsapTimeline`:

- seeks the timeline to `snapshot.currentTime`,
- applies `timeline.timeScale(snapshot.playbackRate)`, and
- plays or pauses according to the snapshot.

For a timeline whose zero point is a lyrics line rather than the track, pass
the line start as the offset:

```ts
synchronizeGsapTimeline(timeline, snapshot, lineStart);
```

Do not create timelines, schedule animation frames, or read DOM refs inside
`useMemo`. `useMemo` runs during render and may be replayed or discarded.

## Nested and virtualized animation refs

Lyrics renderers expose `PlaybackAnimationController`:

```ts
interface PlaybackAnimationController {
  synchronize(snapshot: PlaybackSnapshot): void;
}
```

A line renderer may aggregate several timed spans. It should translate the
track snapshot into line-relative time once, then forward it to every child.
Rows outside their active range receive a paused snapshot so completed/future
effects retain the correct visual state.

When a controller ref attaches, synchronize it immediately from the media
element. Do not wait for the next play, pause, or `timeupdate` event. This is
required for focused lyrics and virtualized rows that mount in the middle of a
line.

## Other animation-frame consumers

Use `useAnimationFrame(callback, active)` for editor progress loops that do not
delegate continuous advancement to WAAPI or GSAP.

The hook schedules one reconciliation frame even while inactive, continues
only while `active` is true, and cancels its outstanding frame on dependency
change or unmount. The callback is kept in a ref, so a render does not start a
second loop.

Do not recursively call `requestAnimationFrame` from a component callback and
also start that callback from an effect; that pattern can create overlapping
loops.

## Adding a media-timed animation

1. Decide whether WAAPI, GSAP, or a callback-driven frame loop owns continuous
   advancement.
2. Create the animation only after its DOM target exists.
3. Start WAAPI/GSAP objects paused.
4. Expose or consume `PlaybackAnimationController` rather than separate
   optional `resume`/`pause` methods.
5. Synchronize immediately when either the player or animation becomes ready.
6. Set playback rate as part of every synchronization.
7. Cancel or kill the animation and any scheduled frame during cleanup.
8. Recreate the animation when its timing, keyframes, content, or measured
   layout changes.
9. Keep React state updates at meaningful boundaries rather than publishing
   every clock tick.

## Testing

Unit tests use Vitest/jsdom:

```bash
npm test -w @lyricova/jukebox
```

Browser behavior is covered with Playwright in real Chromium and Firefox:

```bash
npx playwright install chromium firefox
npm run test:browser -w @lyricova/jukebox
```

The browser fixture is isolated from the API server:

- configuration: `packages/jukebox/playwright.config.ts`
- fixture: `packages/jukebox/tests/browser/fixture/`
- specification:
  `packages/jukebox/tests/browser/specs/animation-lifecycle.spec.ts`

The suite covers mid-track mounting, seeks, playback-rate changes, play/pause,
same-node animation replacement, Strict Mode ref replay, GSAP progress, WAAPI
progress, and uncaught browser errors. Add a regression there when behavior
depends on the real animation implementation or differs between browser
engines.
