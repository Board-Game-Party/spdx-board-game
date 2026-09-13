import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ForcedChoiceScale } from '../features/evaluation/components/ForcedChoiceScale';

describe('ForcedChoiceScale Component (D1 / FR-EVAL-03)', () => {
  it('renders all 6 forced-choice scale options with accessible radio group', () => {
    const handleChange = vi.fn();
    render(
      <ForcedChoiceScale
        pairAssignmentId="pair-123"
        leftItemName="Team Alpha"
        rightItemName="Team Beta"
        value={null}
        onChange={handleChange}
      />
    );

    const radiogroup = screen.getByRole('radiogroup');
    expect(radiogroup).toBeInTheDocument();

    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(6);

    // Click choice 2
    fireEvent.click(radios[1]);
    expect(handleChange).toHaveBeenCalledWith(2);
  });
});
