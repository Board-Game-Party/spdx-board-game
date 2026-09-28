import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Navbar } from '../components/Navbar';
import { AuthContext, AuthContextType } from '../app/AuthContext';

const mockLogout = vi.fn();
const mockOnNavigate = vi.fn();

const mockAuthValue: AuthContextType = {
  user: {
    id: 'u1',
    email_normalized: 'nok@uni.ac.th',
    email_raw: 'nok@uni.ac.th',
    display_name: 'น้องนก สดใส',
    status: 'ACTIVE',
    memberships: [
      {
        id: 'm1',
        classroom_id: 'c1',
        classroom_name: 'SE 101',
        classroom_slug: 'se-101',
        role: 'STUDENT',
      },
    ],
  },
  activeClassroom: {
    id: 'm1',
    classroom_id: 'c1',
    classroom_name: 'SE 101',
    classroom_slug: 'se-101',
    role: 'STUDENT',
  },
  isLoading: false,
  notifications: [],
  unreadNotificationCount: 0,
  setActiveClassroom: vi.fn(),
  login: vi.fn(),
  logout: mockLogout,
  refreshProfile: vi.fn(),
  fetchNotifications: vi.fn(),
  markNotificationRead: vi.fn(),
};

describe('Navbar Logout Confirmation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows confirmation modal when clicking logout button and does not logout immediately', () => {
    render(
      <AuthContext.Provider value={mockAuthValue}>
        <Navbar currentView="evaluation" onNavigate={mockOnNavigate} />
      </AuthContext.Provider>
    );

    const logoutBtn = screen.getByTestId('logout-btn');
    fireEvent.click(logoutBtn);

    // Confirmation modal should now be visible
    expect(screen.getByText('ยืนยันการออกจากระบบ')).toBeInTheDocument();
    expect(
      screen.getByText(/คุณแน่ใจหรือไม่ว่าต้องการออกจากระบบ/)
    ).toBeInTheDocument();

    // logout() function should NOT have been called yet
    expect(mockLogout).not.toHaveBeenCalled();
  });

  it('cancels logout when clicking cancel in the modal', () => {
    render(
      <AuthContext.Provider value={mockAuthValue}>
        <Navbar currentView="evaluation" onNavigate={mockOnNavigate} />
      </AuthContext.Provider>
    );

    fireEvent.click(screen.getByTestId('logout-btn'));
    expect(screen.getByText('ยืนยันการออกจากระบบ')).toBeInTheDocument();

    const cancelBtn = screen.getByTestId('cancel-logout-btn');
    fireEvent.click(cancelBtn);

    // Modal should close and logout not called
    expect(screen.queryByText('ยืนยันการออกจากระบบ')).not.toBeInTheDocument();
    expect(mockLogout).not.toHaveBeenCalled();
  });

  it('calls logout when confirming in the modal', () => {
    render(
      <AuthContext.Provider value={mockAuthValue}>
        <Navbar currentView="evaluation" onNavigate={mockOnNavigate} />
      </AuthContext.Provider>
    );

    fireEvent.click(screen.getByTestId('logout-btn'));
    const confirmBtn = screen.getByTestId('confirm-logout-btn');
    fireEvent.click(confirmBtn);

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});

describe('Navbar Classroom Switcher', () => {
  it('switches classroom and navigates to classroom-detail even from classrooms view', () => {
    const mockSetActiveClassroom = vi.fn();
    const mockNavigate = vi.fn();

    const authValueMulti: AuthContextType = {
      ...mockAuthValue,
      setActiveClassroom: mockSetActiveClassroom,
      user: {
        ...mockAuthValue.user!,
        memberships: [
          {
            id: 'm1',
            classroom_id: 'c1',
            classroom_name: 'SE 101',
            classroom_slug: 'se-101',
            role: 'STUDENT',
          },
          {
            id: 'm2',
            classroom_id: 'c2',
            classroom_name: 'SE 102',
            classroom_slug: 'se-102',
            role: 'OWNER',
          },
        ],
      },
    };

    render(
      <AuthContext.Provider value={authValueMulti}>
        <Navbar currentView="classrooms" onNavigate={mockNavigate} />
      </AuthContext.Provider>
    );

    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();

    fireEvent.change(select, { target: { value: 'm2' } });

    expect(mockSetActiveClassroom).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'm2', classroom_id: 'c2' })
    );
    expect(mockNavigate).toHaveBeenCalledWith('classroom-detail', 'c2');
  });
});

