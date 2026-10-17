export const POST_TEMPLATES = [
  {
    id: 'build-in-public',
    name: 'Build-in-public update',
    description: 'A quick honest update on what you shipped, learned, or struggled with this week.',
  },
  {
    id: 'lesson-from-failure',
    name: 'Lesson from a failure',
    description: "Something that didn't work and the specific lesson you took from it.",
  },
  {
    id: 'common-mistake',
    name: 'The mistake most people make',
    description: 'A common mistake in your space and what to do instead.',
  },
  {
    id: 'n-things-learned',
    name: 'N things I learned',
    description: 'A tight list of concrete things you learned doing something.',
  },
  {
    id: 'before-after',
    name: 'Before → after',
    description: 'A change you made and the result it produced.',
  },
  {
    id: 'strong-opinion',
    name: 'Strong opinion + why',
    description: 'A clear stance you actually hold, with the reasoning.',
  },
  {
    id: 'myth-vs-reality',
    name: 'Myth vs reality',
    description: "A common belief and the messier truth you've seen.",
  },
  {
    id: 'milestone-reflection',
    name: 'Milestone + reflection',
    description: 'A milestone you hit and one honest reflection on getting there.',
  },
  {
    id: 'behind-the-scenes',
    name: 'Behind the scenes',
    description: "The unglamorous reality of what you're actually doing day to day.",
  },
  {
    id: 'helpful-tip',
    name: 'A tip that helped you',
    description: 'One practical thing that made a real difference for you.',
  },
  {
    id: 'audience-question',
    name: 'Question to your audience',
    description: 'A genuine question that invites people to share their experience.',
  },
  {
    id: 'past-self-advice',
    name: "What I'd tell my past self",
    description: "Advice you wish you'd had when you started.",
  },
] as const;

export type PostTemplate = (typeof POST_TEMPLATES)[number];
export type TemplateId = PostTemplate['id'];

export const TEMPLATE_IDS = POST_TEMPLATES.map((t) => t.id) as [TemplateId, ...TemplateId[]];

export function getTemplate(id: TemplateId): PostTemplate {
  return POST_TEMPLATES.find((t) => t.id === id)!;
}
