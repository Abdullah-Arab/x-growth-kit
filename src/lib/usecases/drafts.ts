import type { DraftRepository } from '../storage';
import type { TemplateId } from '../templates';
import type { Draft, DraftStatus } from '../types';

export function createDraftUseCases(deps: { drafts: DraftRepository }) {
  const { drafts } = deps;

  async function createDraft(templateType: TemplateId, text = ''): Promise<Draft> {
    const now = Date.now();
    const draft: Draft = {
      id: crypto.randomUUID(),
      templateType,
      text,
      status: 'idea',
      createdAt: now,
      updatedAt: now,
      postedAt: null,
    };
    await drafts.add(draft);
    return draft;
  }

  /** Most recently updated first. */
  async function listDrafts(filter?: {
    status?: DraftStatus;
    templateType?: TemplateId;
  }): Promise<Draft[]> {
    const all = await drafts.list();
    return all
      .filter((d) => !filter?.status || d.status === filter.status)
      .filter((d) => !filter?.templateType || d.templateType === filter.templateType)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  return {
    createDraft,
    listDrafts,
    updateDraftText: (id: string, text: string) =>
      drafts.update(id, { text, updatedAt: Date.now() }),
    setDraftStatus: (id: string, status: DraftStatus) => {
      const now = Date.now();
      return drafts.update(id, { status, updatedAt: now, postedAt: status === 'posted' ? now : null });
    },
    moveDraftToTemplate: (id: string, templateType: TemplateId) =>
      drafts.update(id, { templateType, updatedAt: Date.now() }),
    deleteDraft: (id: string) => drafts.remove(id),
  };
}
