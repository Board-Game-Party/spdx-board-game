import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AssignmentDetailView } from '../features/assignment/AssignmentDetailView';
import { fetchApi } from '../lib/api';
import { AuthContext } from '../app/AuthContext';

vi.mock('../lib/api', () => ({
  fetchApi: vi.fn(),
}));

const mockOnBack = vi.fn();
const mockOnNavigateTab = vi.fn();

const mockClassroomOwner = {
  id: 'cls-1',
  role: 'OWNER'
};

const mockAssignmentBase = {
  id: 'asn-1',
  classroom_id: 'cls-1',
  name: 'Test Assignment',
  slug: 'test-assign',
  description: '',
  artifact_url: '',
  group_max_score: 15,
  individual_max_score: 5,
  instructor_weight: 1.0,
  target_coverage: 5,
  max_workload: 8,
  min_comparisons: 3,
  criteria: [],
  group_pair_count: 0,
  individual_pair_count: 0,
};

const renderWithContext = (ui: React.ReactElement, authContextValue: any) => {
  return render(
    <AuthContext.Provider value={authContextValue}>
      {ui}
    </AuthContext.Provider>
  );
};

describe('AssignmentDetailView Component (Delete Draft)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.alert = vi.fn(); // mock alert
  });

  it('renders Delete Assignment button only when status is DRAFT and user is instructor', async () => {
    vi.mocked(fetchApi).mockResolvedValueOnce({
      ...mockAssignmentBase,
      status: 'DRAFT'
    }).mockResolvedValueOnce({
      is_feasible: true,
      auto_reduced: false,
      explanation: 'OK',
      total_students: 10,
      total_groups: 3,
      actual_coverage: 5,
      workload_per_student_per_criterion: 5
    }); // feasibility mock

    renderWithContext(
      <AssignmentDetailView assignmentId="asn-1" onBack={mockOnBack} onNavigateTab={mockOnNavigateTab} />,
      { activeClassroom: mockClassroomOwner }
    );

    // Wait for load
    await waitFor(() => {
      expect(screen.getByText('Test Assignment')).toBeInTheDocument();
    });

    // Delete button should be present
    expect(screen.getByRole('button', { name: /Delete Assignment/i })).toBeInTheDocument();
  });

  it('hides Delete Assignment button when status is not DRAFT', async () => {
    vi.mocked(fetchApi).mockResolvedValueOnce({
      ...mockAssignmentBase,
      status: 'PUBLISHED'
    });

    renderWithContext(
      <AssignmentDetailView assignmentId="asn-1" onBack={mockOnBack} onNavigateTab={mockOnNavigateTab} />,
      { activeClassroom: mockClassroomOwner }
    );

    await waitFor(() => {
      expect(screen.getByText('Test Assignment')).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: /Delete Assignment/i })).not.toBeInTheDocument();
  });

  it('handles delete modal confirmation and API dispatch', async () => {
    vi.mocked(fetchApi).mockResolvedValueOnce({
      ...mockAssignmentBase,
      status: 'DRAFT'
    }).mockResolvedValueOnce({}); // feasibility

    renderWithContext(
      <AssignmentDetailView assignmentId="asn-1" onBack={mockOnBack} onNavigateTab={mockOnNavigateTab} />,
      { activeClassroom: mockClassroomOwner }
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Delete Assignment/i })).toBeInTheDocument();
    });

    // Click delete button to open modal
    fireEvent.click(screen.getByRole('button', { name: /Delete Assignment/i }));

    // Verify modal appears
    expect(screen.getByText('ลบงานมอบหมาย (Delete Assignment)')).toBeInTheDocument();
    const confirmDeleteBtn = screen.getByRole('button', { name: 'ยืนยันการลบ' });
    
    // Mock the delete call success
    vi.mocked(fetchApi).mockResolvedValueOnce({});

    // Click confirm
    fireEvent.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(fetchApi).toHaveBeenCalledWith('/assignments/asn-1', { method: 'DELETE' });
    });

    expect(window.alert).toHaveBeenCalledWith('ลบงานมอบหมายสำเร็จ');
    expect(mockOnBack).toHaveBeenCalled();
  });
});
