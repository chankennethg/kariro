import { describe, expect, it } from 'vitest';
import { applicationStatuses, workModes } from '@kariro/shared';
import { statusLabels, workModeLabels } from './constants';

describe('constants', () => {
  it('statusLabels has an entry for every application status', () => {
    for (const status of applicationStatuses) {
      expect(statusLabels[status]).toBeDefined();
      expect(typeof statusLabels[status]).toBe('string');
    }
  });

  it('workModeLabels has an entry for every work mode', () => {
    for (const mode of workModes) {
      expect(workModeLabels[mode]).toBeDefined();
      expect(typeof workModeLabels[mode]).toBe('string');
    }
  });

  it('statusLabels values are capitalized versions of the keys', () => {
    expect(statusLabels.saved).toBe('Saved');
    expect(statusLabels.applied).toBe('Applied');
    expect(statusLabels.interview).toBe('Interview');
    expect(statusLabels.rejected).toBe('Rejected');
  });
});
