# Assets

What to shoot or make for the homepage and /work redesign. One row per needed
asset. Anything not listed here already exists and needs nothing.

## Already covered, no action needed

- `public/me/` - portrait-figure.png, hackathon.jpg, riding.jpg, ui-grad.jpg,
  uq-grad.jpg. Used by the intro band (`/about`).
- `public/mandareen/` - 19 product screenshots (billing, conversations,
  curriculum browse/unit/lesson viewer, dashboard, dictionary, flashcards,
  flashcards study, lesson quiz, lessons, lessons viewer dialogue/story,
  placement test, popup info + add to flashcard, profile, progress, usage).
  Wired up in unit 3's `ProjectGallery`.

## Needed

| Path | Dimensions | Ratio | Used by | Subject |
|---|---|---|---|---|
| `/public/home/hero.jpg` | 1600x2000 | 4/5 | `HomeHero` right column | A candid, working portrait of Matthew - at a desk or laptop, mid-thought rather than posed for a headshot. Should read as "builder", matching the hero's tech-forward copy. |
| `/public/projects/acb-isbe/cover.jpg` | 1600x900 | 16/9 | `/work/acb-isbe` cover, `/work` index tile | The ACB-ISBE conference app in use: a phone or tablet showing the Flutter schedule/attendee screen, ideally with a hint of a conference setting (badge, lanyard, crowd) in the background to sell the 1,600-person scale. |
| `/public/projects/mealu/cover.jpg` | 1600x900 | 16/9 | `/work/mealu` cover, `/work` index tile | The MealU app's QR-based locker pickup flow: a phone showing the order/QR screen next to a meal kit locker, or the app's meal customization screen on its own if a locker shot isn't available. |
| `/public/projects/siasisten/cover.jpg` | 1600x900 | 16/9 | `/work/siasisten` cover, `/work` index tile | The Siasisten teaching-assistant dashboard, screenshot of the redesigned web app - a schedule or assignment management view that shows the SCRUM-era UI cleanup. |
| `/public/projects/uquizzle/cover.jpg` | 1600x900 | 16/9 | `/work/uquizzle` cover, `/work` index tile | The UQuizzle browser extension overlaying an Echo360 lecture recording, showing a generated quiz question live next to the video player - the real-time-quiz-while-watching hook is the whole pitch. |

## Notes

- Cover ratio is fixed at 16/9 for all four `/work` covers so index tiles line
  up; the hero image is portrait (4/5) to fill the hero's right column.
- Until a photo/screenshot lands, the corresponding page renders an
  `AssetSlot` at the same ratio - swapping in the real file later is a
  one-line change, not a layout change.
- File format is a suggestion (jpg for photos, png is fine for screenshots
  with text) - pick whichever compresses better for the actual image.
