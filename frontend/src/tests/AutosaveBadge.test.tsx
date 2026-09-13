import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AutosaveBadge } from '../features/evaluation/components/AutosaveBadge';

describe('AutosaveBadge Component (FR-EVAL-04)', () => {
  it('renders aria-live polite container with saving and saved states', () => {
    const { rerender } = render(<AutosaveBadge status="saving" />);
    const politeRegion = screen.getByText('กำลังบันทึกฉบับร่าง...');
    expect(politeRegion).toBeInTheDocument();

    rerender(<AutosaveBadge status="saved" lastSavedTime="21:30" />);
    expect(screen.getByText(/บันทึกแล้ว เมื่อ 21:30/)).toBeInTheDocument();
  });
});
