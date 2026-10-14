import sys
from backend.app.core.database import SessionLocal
from backend.app.shared.models import (
    User,
    Classroom,
    ClassroomMember,
    GroupEntity,
    Assignment,
    Criterion,
    PairAssignment,
    Comparison,
    ComparisonRevision,
    ComputedScore,
    ScoreOverride,
    AuditEvent,
    Notification,
    Appeal,
)

DEMO_DOMAINS = ["uni.ac.th", "e2e.test"]
DEMO_CLASSROOM_SLUGS = ["se-101"]


def clean_demo_data(wipe_all: bool = False):
    db = SessionLocal()
    try:
        if wipe_all:
            print("⚠️  Wiping ALL application data from database...")
            # Delete in child-to-parent order to respect foreign key constraints
            db.query(ComparisonRevision).delete(synchronize_session=False)
            db.query(Comparison).delete(synchronize_session=False)
            db.query(PairAssignment).delete(synchronize_session=False)
            db.query(ComputedScore).delete(synchronize_session=False)
            db.query(ScoreOverride).delete(synchronize_session=False)
            db.query(Appeal).delete(synchronize_session=False)
            db.query(Notification).delete(synchronize_session=False)
            db.query(AuditEvent).delete(synchronize_session=False)
            db.query(Criterion).delete(synchronize_session=False)
            db.query(Assignment).delete(synchronize_session=False)
            db.query(ClassroomMember).delete(synchronize_session=False)
            db.query(GroupEntity).delete(synchronize_session=False)
            db.query(Classroom).delete(synchronize_session=False)
            db.query(User).delete(synchronize_session=False)
            db.commit()
            print("✅ Successfully wiped ALL tables. Database is now completely fresh.")
            return

        print("🧹 Cleaning up demo users and demo classrooms...")

        # 1. Find demo users
        demo_users = []
        for domain in DEMO_DOMAINS:
            demo_users.extend(
                db.query(User).filter(User.email_normalized.like(f"%@{domain}")).all()
            )
        demo_user_ids = [u.id for u in demo_users]

        # 2. Find demo classrooms
        demo_classrooms = (
            db.query(Classroom)
            .filter(Classroom.slug.in_(DEMO_CLASSROOM_SLUGS))
            .all()
        )
        demo_class_ids = [c.id for c in demo_classrooms]

        # 3. Find demo assignments
        demo_assignments = (
            db.query(Assignment)
            .filter(Assignment.classroom_id.in_(demo_class_ids))
            .all()
        )
        demo_assign_ids = [a.id for a in demo_assignments]

        # Delete dependent comparison data
        if demo_assign_ids:
            pair_ids = [
                p.id
                for p in db.query(PairAssignment)
                .filter(PairAssignment.assignment_id.in_(demo_assign_ids))
                .all()
            ]
            if pair_ids:
                cmp_ids = [
                    c.id
                    for c in db.query(Comparison)
                    .filter(Comparison.pair_assignment_id.in_(pair_ids))
                    .all()
                ]
                if cmp_ids:
                    db.query(ComparisonRevision).filter(
                        ComparisonRevision.comparison_id.in_(cmp_ids)
                    ).delete(synchronize_session=False)
                db.query(Comparison).filter(
                    Comparison.pair_assignment_id.in_(pair_ids)
                ).delete(synchronize_session=False)

            db.query(PairAssignment).filter(
                PairAssignment.assignment_id.in_(demo_assign_ids)
            ).delete(synchronize_session=False)
            db.query(ComputedScore).filter(
                ComputedScore.assignment_id.in_(demo_assign_ids)
            ).delete(synchronize_session=False)
            db.query(ScoreOverride).filter(
                ScoreOverride.assignment_id.in_(demo_assign_ids)
            ).delete(synchronize_session=False)
            db.query(Appeal).filter(
                Appeal.assignment_id.in_(demo_assign_ids)
            ).delete(synchronize_session=False)
            db.query(Criterion).filter(
                Criterion.assignment_id.in_(demo_assign_ids)
            ).delete(synchronize_session=False)
            db.query(Assignment).filter(
                Assignment.id.in_(demo_assign_ids)
            ).delete(synchronize_session=False)

        # Delete audit events & notifications for demo users/classrooms
        if demo_class_ids:
            db.query(AuditEvent).filter(
                AuditEvent.classroom_id.in_(demo_class_ids)
            ).delete(synchronize_session=False)
        if demo_user_ids:
            db.query(AuditEvent).filter(
                AuditEvent.actor_user_id.in_(demo_user_ids)
            ).delete(synchronize_session=False)
            db.query(Notification).filter(
                Notification.user_id.in_(demo_user_ids)
            ).delete(synchronize_session=False)

        # Delete demo classrooms (cascades members and groups)
        for classroom in demo_classrooms:
            db.delete(classroom)
        db.flush()

        # Delete demo users
        deleted_count = 0
        for user in demo_users:
            db.delete(user)
            deleted_count += 1

        db.commit()
        print(f"✅ Successfully cleaned up {deleted_count} demo users and {len(demo_classrooms)} demo classrooms.")

    except Exception as e:
        db.rollback()
        print(f"❌ Error cleaning demo data: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    wipe_flag = "--all" in sys.argv
    clean_demo_data(wipe_all=wipe_flag)
