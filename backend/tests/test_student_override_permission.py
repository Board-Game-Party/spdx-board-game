from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.security import get_current_user
from backend.app.shared.models import User, Assignment, Classroom, ClassroomMember
from sqlalchemy.orm import Session
from backend.app.core.database import get_db

def test_student_cannot_override_score(db_session: Session):
    # Create test data
    teacher = User(id="teacher_1", email_raw="teacher@test.com", email_normalized="teacher@test.com", display_name="Teacher")
    student = User(id="student_1", email_raw="student@test.com", email_normalized="student@test.com", display_name="Student")
    db_session.add_all([teacher, student])
    db_session.flush()

    classroom = Classroom(id="class_1", name="Test Class", slug="test-class", created_by="teacher_1")
    db_session.add(classroom)
    db_session.flush()

    # Add roles
    owner_member = ClassroomMember(id="mem_1", classroom_id="class_1", user_id="teacher_1", role="OWNER")
    student_member = ClassroomMember(id="mem_2", classroom_id="class_1", user_id="student_1", role="STUDENT")
    db_session.add_all([owner_member, student_member])
    
    assignment = Assignment(id="assign_1", classroom_id="class_1", name="Test Assignment", slug="test-assign", created_by="teacher_1")
    db_session.add(assignment)
    db_session.commit()

    # Override get_db to return our session
    def override_get_db():
        yield db_session
    app.dependency_overrides[get_db] = override_get_db

    # Override current user to simulate logged-in student
    def override_get_current_user():
        return student
    app.dependency_overrides[get_current_user] = override_get_current_user

    client = TestClient(app)

    # Attempt to override score
    payload = {
        "side": "INDIVIDUAL",
        "item_id": "student_1",
        "override_value": 5.0,
        "reason": "I want a better score"
    }
    
    response = client.post("/api/assignments/assign_1/scores:override", json=payload)
    
    # Assert
    assert response.status_code == 403
    assert "Access denied" in response.json()["detail"]

