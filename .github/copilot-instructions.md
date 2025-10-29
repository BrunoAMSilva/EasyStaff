# EasyStaff Piano Learning App - AI Agent Instructions

## Project Overview
EasyStaff is an Astro-based web app for piano practice that renders musical notation as colored rectangles instead of traditional music symbols. It primarily uses MusicXML files for sheet music, with auto-scrolling playback synchronized to tempo.

## Architecture & Key Components

### Content System
- **MusicXML Partitures**: In `src/content/partitures/` - Primary format for professional sheet music
- **JSON Songs** *(deprecated)*: Custom solfège notation in `src/content/songs/` - Legacy system kept for potential future use
- Uses Astro's content collections with custom schemas and loaders

### Core Components Hierarchy
```
Partiture.astro → PartiturePart.astro → PartitureStaff/Beats/Measure/Note components
```

Key files:
- `src/content.config.ts` - Zod schemas for both content types and MusicXML structure
- `src/utils/musicxml-loader.ts` - Custom Astro loader for MusicXML parsing
- `src/utils/music-xml-parser.ts` - Comprehensive MusicXML to TypeScript parser
- `src/components/partiture/PartiturePart.astro` - Main playback engine with complex scroll/tempo logic

### Grid-Based Layout System
The partiture uses CSS Grid with calculated columns:
- Template: `18em repeat(${totalMeasures}, 120px 120px 120px 120px)` (4 beats per measure)
- Dynamic row calculation based on staff count: `grid-rows-13/26/39` for 1/2/3 staves
- Notes positioned via Y-axis calculation in `PartitureNote.astro`

## Development Patterns

### Content Management
- MusicXML files auto-detected and parsed via custom loader in `src/utils/musicxml-loader.ts`
- Primary workflow uses `/partitures/[partiture]` routes for MusicXML content
- Legacy JSON songs exist with schema validation but are deprecated (kept for potential future use)

### Client-Side Playback Engine
The `PartiturePart.astro` script contains a sophisticated playback system:
- **Timeline synchronization**: Scroll position ↔ beat progress ↔ visual highlighting  
- **Pointer interaction**: Click/drag scrubbing with smooth transitions
- **Tempo management**: BPM-based beat timing with play/pause state
- **Accessibility**: Respects `prefers-reduced-motion` and falls back to interval-based timing

### Event-Driven Communication
```javascript
// Custom events for decoupled component communication
document.dispatchEvent(new CustomEvent("piano:play-toggle", { detail: boolean }));
document.dispatchEvent(new CustomEvent("piano:tempo-change", { detail: number }));
document.dispatchEvent(new CustomEvent("piano:seek", { detail: { beat: number } }));
```

### Note Visualization Philosophy
- Notes rendered as colored rectangles (not traditional notation)
- Colors determined by `src/utils/note-colors.ts`
- Accessibility-first design for low vision users
- Fingering numbers displayed opposite to note name when available

## Development Workflow

### Scripts
```bash
npm run dev          # Astro dev server with hot reload
npm run build        # Static site generation
npm run convert-musicxml  # Utility for MusicXML conversion (tsx)
```

### Adding Content
- **MusicXML**: Drop `.xml/.musicxml` files in `src/content/partitures/` - auto-detected by custom loader
- **Content validation**: Parsed against comprehensive Zod schemas in `src/content.config.ts`
- Hot reload supported in development for new MusicXML files

### TypeScript Integration
- Strict Astro TypeScript config
- Comprehensive type definitions in `src/content.config.ts` mirror MusicXML structure
- `InferEntrySchema<"partitures">` for component props

## Technical Constraints & Patterns

### MusicXML Feature Support
Currently supports: parts, measures, notes (pitch/duration/voice/staff), time signatures, key signatures, tempo, fingering, basic slurs. Missing: ties, octave shifts, advanced notations.

### Performance Considerations  
- Grid calculations happen server-side during build
- Client-side animation uses `requestAnimationFrame` for smooth scrolling
- Intersection Observer for efficient note highlighting within viewport bands
- Measure attributes inherit and cascade through the part (see `mappedMeasures` logic)

### Styling & Responsiveness
- TailwindCSS with custom classes for staff grids
- Clamp-based font sizing: `clamp(8px, 2vmin, 16px)`
- Horizontal scrolling with sticky playhead positioning

When modifying this codebase:
1. **Content changes**: Validate MusicXML parsing against the comprehensive type system in `content.config.ts`
2. **Playback modifications**: Test with both reduced motion and full animation modes  
3. **MusicXML parsing**: Note that JSON song system exists but is deprecated - focus on MusicXML workflow
4. **Layout changes**: Consider the grid calculation logic that depends on measure count and staff configuration