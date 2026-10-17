import { beforeEach } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { createRepositories } from '../storage';
import { createUseCases } from '../usecases';

export function setup() {
  beforeEach(() => {
    fakeBrowser.reset();
  });
  const repos = createRepositories();
  return { repos, uc: createUseCases(repos) };
}
