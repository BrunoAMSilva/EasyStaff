# EasyStaff

EasyStaff is a web app designed to help you practice piano by making partiture easy and accessible to read.

## Based on MusicXML

EasyStaff uses the widely adopted `MusicXML` (uncompressed) format.

### Current MusicXML features

- Work title to get the name of the partiture.
- Parsing of parts.
- Parsing of measures. Since measures inherit attributes and directions those are spread across all measures.
- Parsing of tempo and beats.
- Multiple staffs (only G and F clefs are supported for now)
- Notes:
    - `Pitch step`
    - `Duration`
    - `Voice` and `staff` used to pick correct track
    - Notations
        - `Fingering` to display the finger a note should be played with.
    - `Rest` periods (not rendered)
    - `Chord` to evaluate note position

### Short term features list
- Add support for `ties`
- Add support for `slurs`
- Add support for `octave`

## How it works

Each song is displayed showing the partiture in a single line and it auto scrolls when you tap play.

### Notes

For ease of use every note is displayed as a rectangle in a different color. This is to improve perception for for users with low vision and at the same time benefits biginers. Inside the rectangle the note is displayed and if there is a specified finger for the note it is displayed on the opposite side of the note.

As the timeline is scrolled, the notes gray out once they passed the playhead to help visualize the current progress.

### Beats

Every beat is displayed in the background as a dashed line that is highlighted once it is passing in the playhead. A number is displayed on top of the beat to show the current position within the measure.

## Getting started

Start by cloning the repo:

```shell
git clone https://github.com/BrunoAMSilva/EasyStaff.git
```

Install dependencies:

```shell
npm i
```

Start dev server:

```shell
npm run dev
```

To build the project run:

```shell
npm run build
```

This creates the build artifacts in the `.dist` folder. Almost all of the output is prerendered. The usage of javascript is kept to a minimum on the client to move the timeline and track progress.

## Content

In `src/content/partitures` you can add `.musicxml` (uncompressed) or `.xml` files and they are automatically added to Astro's content collection via a custom Loader that parses the files.

## Notes

### structure

The project is built with Astro for it's simplicity and extensibility. With the support of server islands it doesn't limit long-term direction.

#### Partiture content collection

In `content.config.ts` the `zod` schema is defined to match our current implementation of `MusicXML`. Using the custom loader it parses all the content inside the `src/content/partitures` directory. It outputs a ScorePairwise object for each partiture.

#### Components

1. `PartiturePicker`: used to select the partiture from a dropdown on the nav menu.
2. `Partiture`: Main content host for partitures inside the score.
3. `PartiturePart`: responsible for managing all other subparts of a partiture. It combines the staff, beats and notes in a grid. The layout is calculated based on the number of `staves` and elements are placed on the calculated position for their measure/beat and note.
4. `PartitureBeats`: creates the dashed rectangles to represent each beat and to be highlighted.
5. `PartitureMeasure`: represents the divisions in the staff.
6. `PartitureNote`: displays the note rectangle and calculates it's position along the Y axis of the grid.

### Old POC artifacts

A custom notation was initially created to simplify human input of new partitures. However after a few simple examples it became obvious it wasn't expressive enough to be used as a long-term solution. A schema, parser, and UI were created and remain in the repo until there is more clarity if it will be useful or not.

## Future development

- [ ] Option to switch between Soflège and letter notation
- [ ] Improve `MusicXML` support
- [ ] Properly render slurs
- [ ] Display common chords (C chord, G7 chord, etc.) as a single rectangle to make it easier to read
- [x] Option to play audio during animation playback
- [ ] Option to hide beats
- [ ] Scaling support for improved accessibility
- [ ] Consider using SVG to render Partiture
- [ ] Adio recognition to help with practice by actually showing what notes are played
- [ ] Add support for missing clefs
- [ ] Ability to switch between simplified view and symbol visualization
- [ ] Your ideas here

## Contributing

You're welcome to contribute to this repo. Either with code, partitures or ideas and feedback. Remember to be polite and have a great time!