import Image, { type StaticImageData } from "next/image";
import { Reveal } from "@/components/reveal";
import dashboard from "../../public/mandareen/dashboard.png";
import curriculumLesson from "../../public/mandareen/curriculum_unit_lesson_viewer.png";
import lessonDialogue from "../../public/mandareen/lessons_viewer_dialogue.png";
import conversation from "../../public/mandareen/conversations.png";
import dictionary from "../../public/mandareen/dictionary.png";
import usage from "../../public/mandareen/usage.png";

type GalleryPlate = {
  src: StaticImageData;
  alt: string;
  caption: string;
};

// Keyed by project slug so a second project with screenshots only needs a
// new entry here, not a JSX branch in work/[slug]/page.tsx.
const PROJECT_GALLERIES: Record<string, GalleryPlate[]> = {
  mandareen: [
    {
      src: dashboard,
      alt: "Mandareen dashboard with the next lesson, curriculum progress bar and day streak counter",
      caption:
        "The dashboard picks up where the student left off: next lesson, curriculum progress and day streak in one view.",
    },
    {
      src: curriculumLesson,
      alt: "A curriculum lesson page explaining Mandarin syllable structure with worked character examples",
      caption:
        "Curriculum lessons are generated per unit, with explanations and examples built for that step rather than a fixed textbook page.",
    },
    {
      src: lessonDialogue,
      alt: "A generated hotel-booking dialogue lesson with pinyin and English toggles per line",
      caption:
        "AI Lessons generate full practice dialogues on demand, with pinyin and translation toggled per line.",
    },
    {
      src: conversation,
      alt: "A live chat conversation with the AI tutor, replying in Chinese with pinyin, translation and grammar notes",
      caption:
        "Conversations are open-ended chat, not a fixed script: the tutor replies in character and attaches grammar notes to its own message.",
    },
    {
      src: dictionary,
      alt: "Dictionary search results for the word daughter, spanning CC-CEDICT entries across HSK levels",
      caption:
        "Dictionary search spans CC-CEDICT and the student's own lessons, filterable by HSK level.",
    },
    {
      src: usage,
      alt: "Usage page showing audio minutes, curriculum generations and assessments against the plan's monthly limits",
      caption:
        "The usage page tracks audio minutes, curriculum generations and assessments, the same resources the performance work targeted.",
    },
  ],
};

export function getProjectGallery(slug: string): GalleryPlate[] | undefined {
  return PROJECT_GALLERIES[slug];
}

/**
 * A horizontal scroll-snap band of framed plates, styled like inset figures
 * in a printed monograph: --panel ground, a --rule mat, caption below in
 * .label-mono. Never full-bleed and never tinted, per the dark-UI-on-warm-
 * paper constraint - see .claude/run.md.
 *
 * No client JS: scroll-snap is pure CSS, and a focused, overflowing element
 * with tabIndex is natively arrow-key scrollable in every evergreen browser,
 * so the keyboard contract needs no onKeyDown handler.
 *
 * Reads --acc from whatever ancestor sets it (work/[slug]/page.tsx sets it
 * once on the page root from project.accent), never a hardcoded hex.
 */
export function ProjectGallery({ plates }: { plates: GalleryPlate[] }) {
  return (
    <Reveal>
      <div
        tabIndex={0}
        role="group"
        aria-label="Product screenshot gallery. Scroll horizontally to view."
        className="flex gap-4 overflow-x-auto pb-2 [scroll-snap-type:x_mandatory] sm:gap-5"
        style={{ overscrollBehaviorX: "contain" }}
      >
        {plates.map((plate) => (
          <figure
            key={plate.alt}
            className="w-[min(720px,88vw)] flex-none border border-rule bg-panel p-3 [scroll-snap-align:start] sm:p-4"
          >
            <Image
              src={plate.src}
              alt={plate.alt}
              placeholder="blur"
              sizes="(min-width: 768px) 720px, 88vw"
              className="h-auto w-full border border-hair"
            />
            {/* .margin-copy, not .label-mono: these captions are full
                sentences, and .label-mono is 11px uppercase - a 20-word
                uppercase mono line is unreadable. Italic Spectral is also
                the conventional figure-caption voice in print, which is
                the register these plates are borrowing. */}
            <figcaption className="margin-copy mt-3 max-w-[58ch] text-faint">
              {plate.caption}
            </figcaption>
          </figure>
        ))}
      </div>
    </Reveal>
  );
}
