import json
import uuid
from datetime import datetime, timezone
from backend.app.core.database import SessionLocal, engine, Base
from backend.app.shared.models import (
    User, Classroom, ClassroomMember, GroupEntity, Assignment, Criterion
)

def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        print("Seeding demo database for PairEval...")

        # 1. Create or Get Teacher User (Owner)
        teacher_email = "prof.somchai@uni.ac.th"
        teacher = db.query(User).filter(User.email_normalized == teacher_email).first()
        if not teacher:
            teacher = User(
                id=str(uuid.uuid4()),
                email_normalized=teacher_email,
                email_raw=teacher_email,
                display_name="อ.สมชาย ใจดี (Instructor)",
                status="ACTIVE",
                last_login_at=datetime.now(timezone.utc)
            )
            db.add(teacher)
            db.flush()

        # 2. Create or Get TA User
        ta_email = "ta.preeya@uni.ac.th"
        ta = db.query(User).filter(User.email_normalized == ta_email).first()
        if not ta:
            ta = User(
                id=str(uuid.uuid4()),
                email_normalized=ta_email,
                email_raw=ta_email,
                display_name="ปรียา สุขสันต์ (TA)",
                status="ACTIVE",
                last_login_at=datetime.now(timezone.utc)
            )
            db.add(ta)
            db.flush()

        # 3. Create Sample Classroom
        classroom_slug = "se-101"
        classroom = db.query(Classroom).filter(Classroom.slug == classroom_slug).first()
        if not classroom:
            classroom = Classroom(
                id=str(uuid.uuid4()),
                name="Software Engineering 101 (Section 1)",
                slug=classroom_slug,
                timezone="Asia/Bangkok",
                status="ACTIVE",
                created_by=teacher.id
            )
            classroom.allowed_email_domains = ["uni.ac.th"]
            db.add(classroom)
            db.flush()

        # 4. Add Teacher & TA as Members
        m_teacher = db.query(ClassroomMember).filter(
            ClassroomMember.classroom_id == classroom.id,
            ClassroomMember.user_id == teacher.id
        ).first()
        if not m_teacher:
            db.add(ClassroomMember(
                id=str(uuid.uuid4()),
                classroom_id=classroom.id,
                user_id=teacher.id,
                role="OWNER"
            ))

        m_ta = db.query(ClassroomMember).filter(
            ClassroomMember.classroom_id == classroom.id,
            ClassroomMember.user_id == ta.id
        ).first()
        if not m_ta:
            db.add(ClassroomMember(
                id=str(uuid.uuid4()),
                classroom_id=classroom.id,
                user_id=ta.id,
                role="TA"
            ))

        # 5. Create Student Groups
        group_names = ["Group Alpha (Aurora)", "Group Beta (Blaze)", "Group Gamma (Cosmos)", "Group Delta (Dynamo)"]
        groups = {}
        for gname in group_names:
            grp = db.query(GroupEntity).filter(
                GroupEntity.classroom_id == classroom.id,
                GroupEntity.name == gname
            ).first()
            if not grp:
                grp = GroupEntity(
                    id=str(uuid.uuid4()),
                    classroom_id=classroom.id,
                    name=gname
                )
                db.add(grp)
                db.flush()
            groups[gname] = grp

        # 6. Create Student Users & Assign to Groups
        demo_students = [
            ("nok@uni.ac.th", "น้องนก สดใส", "65010001", "Group Alpha (Aurora)"),
            ("sompong@uni.ac.th", "สมพงษ์ มุ่งมั่น", "65010002", "Group Alpha (Aurora)"),
            ("wichai@uni.ac.th", "วิชัย การันตี", "65010003", "Group Beta (Blaze)"),
            ("anan@uni.ac.th", "อนันต์ เจริญผล", "65010004", "Group Beta (Blaze)"),
            ("manee@uni.ac.th", "มานี มีสุข", "65010005", "Group Gamma (Cosmos)"),
            ("chujai@uni.ac.th", "ชูใจ ใจกล้า", "65010006", "Group Gamma (Cosmos)"),
            ("piti@uni.ac.th", "ปิติ รักเรียน", "65010007", "Group Delta (Dynamo)"),
            ("veera@uni.ac.th", "วีระ แข็งขัน", "65010008", "Group Delta (Dynamo)")
        ]

        for s_email, s_name, s_id, s_group in demo_students:
            u = db.query(User).filter(User.email_normalized == s_email).first()
            if not u:
                u = User(
                    id=str(uuid.uuid4()),
                    email_normalized=s_email,
                    email_raw=s_email,
                    display_name=s_name,
                    status="ACTIVE",
                    last_login_at=datetime.now(timezone.utc)
                )
                db.add(u)
                db.flush()

            # Membership
            mem = db.query(ClassroomMember).filter(
                ClassroomMember.classroom_id == classroom.id,
                ClassroomMember.user_id == u.id
            ).first()
            if not mem:
                db.add(ClassroomMember(
                    id=str(uuid.uuid4()),
                    classroom_id=classroom.id,
                    user_id=u.id,
                    role="STUDENT",
                    student_id=s_id,
                    group_id=groups[s_group].id
                ))

        # 7. Create Demo Assignment
        asg = db.query(Assignment).filter(
            Assignment.classroom_id == classroom.id,
            Assignment.slug == "sprint-1-eval"
        ).first()
        if not asg:
            asg = Assignment(
                id=str(uuid.uuid4()),
                classroom_id=classroom.id,
                name="Project Sprint 1: Architecture & UI Evaluation",
                slug="sprint-1-eval",
                description="ประเมินผลงานโปรเจกต์กลุ่ม Sprint 1 และการมีส่วนร่วมรายบุคคล",
                target_coverage=3,
                max_workload=6,
                status="DRAFT",
                created_by=teacher.id
            )
            db.add(asg)
            db.flush()

            # Add criteria
            c1 = Criterion(
                id=str(uuid.uuid4()),
                assignment_id=asg.id,
                side="GROUP",
                name="System Architecture & Clean Code",
                description="ความสะอาดของโครงสร้างโค้ดและการแบ่ง Layer",
                weight_pct=60.0
            )
            c2 = Criterion(
                id=str(uuid.uuid4()),
                assignment_id=asg.id,
                side="GROUP",
                name="UI/UX Usability & Accessibility",
                description="ความสวยงามและใช้งานง่ายของหน้าเว็บ",
                weight_pct=40.0
            )
            c3 = Criterion(
                id=str(uuid.uuid4()),
                assignment_id=asg.id,
                side="INDIVIDUAL",
                name="Individual Contribution & Teamwork",
                description="ความรับผิดชอบและการมีส่วนร่วมในงานกลุ่ม",
                weight_pct=100.0
            )
            db.add_all([c1, c2, c3])

        db.commit()
        print("Database seeded successfully with classrooms, groups, assignments, and users!")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
