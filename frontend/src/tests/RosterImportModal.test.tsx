import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RosterImportModal } from '../features/classroom/RosterImportModal';
import { fetchApi } from '../lib/api';

vi.mock('../lib/api', () => ({
  fetchApi: vi.fn(),
}));

describe('RosterImportModal Component (US-CLASS-02 / US-CLASS-03)', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();
  const classroomId = 'cls-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal when isOpen is true and hides when isOpen is false', () => {
    const { rerender } = render(
      <RosterImportModal
        isOpen={false}
        onClose={mockOnClose}
        classroomId={classroomId}
        onSuccess={mockOnSuccess}
      />
    );

    expect(
      screen.queryByText('นำเข้ารายชื่อนักศึกษาผ่าน CSV (Atomic Import)')
    ).not.toBeInTheDocument();

    rerender(
      <RosterImportModal
        isOpen={true}
        onClose={mockOnClose}
        classroomId={classroomId}
        onSuccess={mockOnSuccess}
      />
    );

    expect(
      screen.getByText('นำเข้ารายชื่อนักศึกษาผ่าน CSV (Atomic Import)')
    ).toBeInTheDocument();
  });

  it('allows toggling mode between UPSERT and REPLACE', () => {
    render(
      <RosterImportModal
        isOpen={true}
        onClose={mockOnClose}
        classroomId={classroomId}
        onSuccess={mockOnSuccess}
      />
    );

    const upsertRadio = screen.getByLabelText(/UPSERT/) as HTMLInputElement;
    const replaceRadio = screen.getByLabelText(/REPLACE/) as HTMLInputElement;

    expect(upsertRadio.checked).toBe(true);
    expect(replaceRadio.checked).toBe(false);

    fireEvent.click(replaceRadio);
    expect(upsertRadio.checked).toBe(false);
    expect(replaceRadio.checked).toBe(true);

    fireEvent.click(upsertRadio);
    expect(upsertRadio.checked).toBe(true);
    expect(replaceRadio.checked).toBe(false);
  });

  it('selects file, runs dry-run preview, and renders diff table with action badges', async () => {
    const mockPreviewResult = {
      success: true,
      mode: 'UPSERT',
      dry_run: true,
      total_rows: 2,
      imported_students: 2,
      groups_created: 2,
      warnings: [],
      diffs: [
        { email: 's1@uni.ac.th', action: 'ADDED', new_group: 'Alpha' },
        { email: 's2@uni.ac.th', action: 'REMOVED', old_group: 'Beta' },
      ],
    };

    vi.mocked(fetchApi).mockResolvedValueOnce(mockPreviewResult);

    render(
      <RosterImportModal
        isOpen={true}
        onClose={mockOnClose}
        classroomId={classroomId}
        onSuccess={mockOnSuccess}
      />
    );

    const previewButton = screen.getByRole('button', {
      name: 'ตรวจสอบความถูกต้อง (Dry Run Preview)',
    });
    expect(previewButton).toBeDisabled();

    // Select file
    const fileInput = screen.getByLabelText(/เลือกไฟล์ CSV/i);
    const file = new File(
      ['email,group_name\ns1@uni.ac.th,Alpha\ns2@uni.ac.th,Beta'],
      'students.csv',
      { type: 'text/csv' }
    );
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(previewButton).not.toBeDisabled();

    // Click preview
    fireEvent.click(previewButton);

    await waitFor(() => {
      expect(fetchApi).toHaveBeenCalledWith(
        `/classrooms/${classroomId}/roster:import`,
        expect.objectContaining({
          method: 'POST',
          body: expect.any(FormData),
        })
      );
    });

    const calledBody = vi.mocked(fetchApi).mock.calls[0][1]?.body as FormData;
    expect(calledBody.get('dry_run')).toBe('true');
    expect(calledBody.get('mode')).toBe('UPSERT');

    // Verify diff table renders
    expect(
      await screen.findByText('ตัวอย่างผลการเปลี่ยนแปลง (Diff Preview)')
    ).toBeInTheDocument();
    expect(screen.getByText('รวม 2 แถว')).toBeInTheDocument();

    // Check row 1 (ADDED)
    expect(screen.getByText('s1@uni.ac.th')).toBeInTheDocument();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    const addedBadge = screen.getByText('ADDED');
    expect(addedBadge).toBeInTheDocument();
    expect(addedBadge).toHaveClass('text-emerald-600');

    // Check row 2 (REMOVED)
    expect(screen.getByText('s2@uni.ac.th')).toBeInTheDocument();
    expect(screen.getByText('Beta → (ลบ)')).toBeInTheDocument();
    const removedBadge = screen.getByText('REMOVED');
    expect(removedBadge).toBeInTheDocument();
    expect(removedBadge).toHaveClass('text-rose-600');
  });

  it('confirms import execution with dry_run=false and invokes onSuccess and onClose', async () => {
    const mockPreviewResult = {
      success: true,
      mode: 'REPLACE',
      dry_run: true,
      total_rows: 2,
      imported_students: 2,
      groups_created: 1,
      warnings: [],
      diffs: [
        { email: 's1@uni.ac.th', action: 'ADDED', new_group: 'Alpha' },
        { email: 's2@uni.ac.th', action: 'REMOVED', old_group: 'Beta' },
      ],
    };

    const mockExecutionResult = {
      success: true,
      mode: 'REPLACE',
      dry_run: false,
      total_rows: 2,
      imported_students: 2,
      groups_created: 1,
      warnings: [],
      diffs: [],
    };

    vi.mocked(fetchApi)
      .mockResolvedValueOnce(mockPreviewResult)
      .mockResolvedValueOnce(mockExecutionResult);

    render(
      <RosterImportModal
        isOpen={true}
        onClose={mockOnClose}
        classroomId={classroomId}
        onSuccess={mockOnSuccess}
      />
    );

    // Switch to REPLACE mode
    const replaceRadio = screen.getByLabelText(/REPLACE/) as HTMLInputElement;
    fireEvent.click(replaceRadio);

    // Select file
    const fileInput = screen.getByLabelText(/เลือกไฟล์ CSV/i);
    const file = new File(
      ['email,group_name\ns1@uni.ac.th,Alpha'],
      'students.csv',
      { type: 'text/csv' }
    );
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Click preview
    const previewBtn = screen.getByRole('button', {
      name: 'ตรวจสอบความถูกต้อง (Dry Run Preview)',
    });
    fireEvent.click(previewBtn);

    // Confirm button should appear after preview
    const confirmBtn = await screen.findByRole('button', {
      name: 'ยืนยันนำเข้าข้อมูลจริง',
    });
    expect(confirmBtn).toBeInTheDocument();

    // Click confirm
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(fetchApi).toHaveBeenCalledTimes(2);
    });

    const secondCallBody = vi.mocked(fetchApi).mock.calls[1][1]?.body as FormData;
    expect(secondCallBody.get('dry_run')).toBe('false');
    expect(secondCallBody.get('mode')).toBe('REPLACE');

    expect(mockOnSuccess).toHaveBeenCalledTimes(1);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});
