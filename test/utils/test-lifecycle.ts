import { mock } from 'bun:test';

export class TestLifecycle {
  static clearMock(): void {
    mock.clearAllMocks();
    mock.restore();
  }
}
