import { fixtureSnapshot } from '../domain/scenario';
import type { JiraReader } from './sync';

export function createFixtureReader(): JiraReader {
  return {
    mode: 'fixture',
    async read() {
      return fixtureSnapshot();
    },
  };
}
