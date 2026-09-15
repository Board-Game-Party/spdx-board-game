import React, { useState, useEffect } from 'react';
import { useAuth } from './app/AuthContext';
import { LoginView } from './features/auth/LoginView';
import { Navbar } from './components/Navbar';
import { ClassroomListView } from './features/classroom/ClassroomListView';
import { ClassroomDetailView } from './features/classroom/ClassroomDetailView';
import { AssignmentSetupView } from './features/assignment/AssignmentSetupView';
import { AssignmentDetailView } from './features/assignment/AssignmentDetailView';
import { EvaluationWorksheetView } from './features/evaluation/EvaluationWorksheetView';
import { GroupReportView } from './features/reporting/GroupReportView';
import { IndividualReportView } from './features/reporting/IndividualReportView';
import { PairCoverageView } from './features/reporting/PairCoverageView';
import { QualityReportView } from './features/reporting/QualityReportView';
import { StudentScoreView } from './features/reporting/StudentScoreView';
import { AuditTrailView } from './features/audit/AuditTrailView';
import { AppealsManagementView } from './features/audit/AppealsManagementView';

export const App: React.FC = () => {
  const { user, activeClassroom, isLoading } = useAuth();

  // Navigation state
  const [currentView, setCurrentView] = useState<string>('classrooms');
  const [selectedClassroomId, setSelectedClassroomId] = useState<string | null>(null);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setCurrentView('classrooms');
      setSelectedClassroomId(null);
      setSelectedAssignmentId(null);
    }
  }, [user]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin h-8 w-8 border-3 border-brand-500 border-t-transparent rounded-full" />
          <p className="text-sm font-medium text-slate-300">กำลังเชื่อมต่อ PairEval...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar
        currentView={currentView}
        onNavigate={(view) => {
          if (view === 'classrooms') {
            setSelectedClassroomId(null);
            setSelectedAssignmentId(null);
          }
          setCurrentView(view);
        }}
      />

      <main className="flex-1">
        {/* 1. Classroom List */}
        {currentView === 'classrooms' && (
          <ClassroomListView
            onSelectClassroom={(cId) => {
              setSelectedClassroomId(cId);
              setCurrentView('classroom-detail');
            }}
          />
        )}

        {/* 2. Classroom Detail */}
        {currentView === 'classroom-detail' && selectedClassroomId && (
          <ClassroomDetailView
            classroomId={selectedClassroomId}
            onSelectAssignment={(aId) => {
              setSelectedAssignmentId(aId);
              setCurrentView('assignment-detail');
            }}
            onCreateAssignment={() => setCurrentView('assignment-create')}
            onBack={() => {
              setSelectedClassroomId(null);
              setCurrentView('classrooms');
            }}
          />
        )}

        {/* 3. Create Assignment */}
        {currentView === 'assignment-create' && selectedClassroomId && (
          <AssignmentSetupView
            classroomId={selectedClassroomId}
            onSuccess={(aId) => {
              setSelectedAssignmentId(aId);
              setCurrentView('assignment-detail');
            }}
            onCancel={() => setCurrentView('classroom-detail')}
          />
        )}

        {/* 4. Assignment Detail */}
        {currentView === 'assignment-detail' && selectedAssignmentId && (
          <AssignmentDetailView
            assignmentId={selectedAssignmentId}
            onBack={() => setCurrentView('classroom-detail')}
            onNavigateTab={(tab) => setCurrentView(tab)}
          />
        )}

        {/* 5. Student Evaluation Worksheet */}
        {currentView === 'evaluation' && selectedAssignmentId && (
          <EvaluationWorksheetView
            key={`${user?.id}-${selectedAssignmentId}`}
            assignmentId={selectedAssignmentId}
            onBack={() => setCurrentView('assignment-detail')}
          />
        )}

        {/* 6. Group Summary Report */}
        {currentView === 'group-report' && selectedAssignmentId && (
          <GroupReportView
            assignmentId={selectedAssignmentId}
            onBack={() => setCurrentView('assignment-detail')}
          />
        )}

        {/* 7. Individual Summary Report */}
        {currentView === 'individual-report' && selectedAssignmentId && (
          <IndividualReportView
            assignmentId={selectedAssignmentId}
            onBack={() => setCurrentView('assignment-detail')}
          />
        )}

        {/* 8. Pair Coverage Report */}
        {currentView === 'coverage-report' && selectedAssignmentId && (
          <PairCoverageView
            assignmentId={selectedAssignmentId}
            onBack={() => setCurrentView('assignment-detail')}
          />
        )}

        {/* 9. Quality Signals Report */}
        {currentView === 'quality-report' && selectedAssignmentId && (
          <QualityReportView
            assignmentId={selectedAssignmentId}
            onBack={() => setCurrentView('assignment-detail')}
          />
        )}

        {/* 10. Student Score Report */}
        {currentView === 'student-score' && selectedAssignmentId && (
          <StudentScoreView
            assignmentId={selectedAssignmentId}
            onBack={() => setCurrentView('assignment-detail')}
          />
        )}

        {/* 11. Audit Trail View */}
        {currentView === 'audit-trail' && (selectedClassroomId || activeClassroom?.classroom_id) && (
          <AuditTrailView
            classroomId={selectedClassroomId || activeClassroom!.classroom_id}
            onBack={() => setCurrentView('classroom-detail')}
          />
        )}

        {/* 12. Appeals Management View */}
        {currentView === 'appeals' && selectedAssignmentId && (
          <AppealsManagementView
            assignmentId={selectedAssignmentId}
            onBack={() => setCurrentView('assignment-detail')}
          />
        )}
      </main>
    </div>
  );
};
