# Mentor and learner portraits

Drop photos here and the site picks them up. Until one exists for a person, their
card shows a monogram of their initials instead — deliberately, rather than a
stock photo of a stranger standing in for a real named person.

## Adding a photo

1. **Crop it square.** The mentor cards are square; a portrait-shaped image will
   be cropped to the centre, which often clips foreheads and chins.
2. **Save it here** as `firstname-lastname.jpg`, lower case, hyphenated —
   e.g. `kuppola-rajesh.jpg`.
3. **Point the data at it.** In `src/data/site.js`, add the import at the top and
   set the person's `photo`:

   ```js
   import photoKuppolaRajesh from '../assets/people/kuppola-rajesh.jpg';

   // ...then in MENTORS:
   { name: 'Kuppola Rajesh', photo: photoKuppolaRajesh, ... }
   ```

That is the whole change. No component edits.

## Sizes

| Where | Rendered at | Save at | Why |
|---|---|---|---|
| Mentor cards | 284px | **560px** | Covers a 2x retina display |
| Learner story avatars | 40px | **160px** | Same, with room to spare |

Bigger than that is wasted bytes on every page load. JPEG at quality ~82 is
plenty; expect 30–50 KB for a mentor and under 10 KB for a learner avatar.

## Before publishing anyone's face

- The mentor has agreed to appear, named, with their former employer.
- The learner has given **written** consent for their photo and their quote.

A photo of a real person on a public marketing site is not the same as a name in
a spreadsheet. Get the yes first.

## A note on stock photography

Stock portraits were tried here and removed. Two problems, both worth knowing if
the idea comes back:

- The freely available pools are overwhelmingly Western, which looks obviously
  wrong on an Indian institute's site.
- Searching for Indian portraits returns mostly documentary and street
  photography — striking images, but plainly not staff headshots.

A phone camera against a plain wall, in daylight, beats all of it. It is also
the only version that is actually true.
