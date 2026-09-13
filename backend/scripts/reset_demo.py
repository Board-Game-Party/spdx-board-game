import uuid
from backend.app.core.database import SessionLocal
from backend.app.shared.models import (
    Assignment, PairAssignment, Comparison, ComparisonRevision, ComputedScore, ScoreOverride, AuditEvent
)

def reset_demo_assignment():
    db = SessionLocal()
    try:
        assignment = db.query(Assignment).filter(Assignment.slug == "sprint-1-eval").first()
        if not assignment:
            print("Assignment 'sprint-1-eval' not found.")
            return

        print(f"Resetting assignment '{assignment.name}' to DRAFT...")

        # 1. Delete all existing comparisons and revisions
        pair_ids = [p.id for p in db.query(PairAssignment).filter(PairAssignment.assignment_id == assignment.id).all()]
        if pair_ids:
            cmp_ids = [c.id for c in db.query(Comparison).filter(Comparison.pair_assignment_id.in_(pair_ids)).all()]
            if cmp_ids:
                db.query(ComparisonRevision).filter(ComparisonRevision.comparison_id.in_(cmp_ids)).delete(synchronize_session=False)
            db.query(Comparison).filter(Comparison.pair_assignment_id.in_(pair_ids)).delete(synchronize_session=False)

        # 2. Delete pair assignments
        db.query(PairAssignment).filter(PairAssignment.assignment_id == assignment.id).delete(synchronize_session=False)

        # 3. Delete computed scores & overrides
        db.query(ComputedScore).filter(ComputedScore.assignment_id == assignment.id).delete(synchronize_session=False)
        db.query(ScoreOverride).filter(ScoreOverride.assignment_id == assignment.id).delete(synchronize_session=False)

        # 4. Reset assignment status to DRAFT
        assignment.status = "DRAFT"
        assignment.published_at = None
        assignment.finalized_at = None

        db.commit()
        print("✅ Assignment reset to DRAFT successfully! Ready for fresh demo/publishing.")

    except Exception as e:
        db.rollback()
        print(f"Error resetting demo assignment: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    reset_demo_assignment()
