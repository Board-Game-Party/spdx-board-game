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
