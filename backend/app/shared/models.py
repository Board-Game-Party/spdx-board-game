import uuid
import json
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Text, Integer, Float, Numeric, Boolean, DateTime, ForeignKey, UniqueConstraint, Index
)
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

def gen_uuid():
    return str(uuid.uuid4())

def utc_now():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    email_normalized = Column(String(255), unique=True, nullable=False, index=True)
    email_raw = Column(String(255), nullable=False)
    display_name = Column(String(255), nullable=True)
    google_sub = Column(String(255), unique=True, nullable=True, index=True)
    status = Column(String(32), default="PENDING", nullable=False)  # PENDING | ACTIVE | DISABLED
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    last_login_at = Column(DateTime(timezone=True), nullable=True)

    memberships = relationship("ClassroomMember", back_populates="user", cascade="all, delete-orphan")


class Classroom(Base):
    __tablename__ = "classrooms"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    name = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, nullable=False, index=True)
    timezone = Column(String(64), default="Asia/Bangkok", nullable=False)
    _allowed_email_domains = Column("allowed_email_domains", Text, default="[]", nullable=False)
    status = Column(String(32), default="ACTIVE", nullable=False)  # ACTIVE | ARCHIVED
    created_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    members = relationship("ClassroomMember", back_populates="classroom", cascade="all, delete-orphan")
    groups = relationship("GroupEntity", back_populates="classroom", cascade="all, delete-orphan")
    assignments = relationship("Assignment", back_populates="classroom", cascade="all, delete-orphan")

    @property
    def allowed_email_domains(self):
        try:
            return json.loads(self._allowed_email_domains)
        except Exception:
            return []

    @allowed_email_domains.setter
    def allowed_email_domains(self, value):
        self._allowed_email_domains = json.dumps(value or [])


class GroupEntity(Base):
    __tablename__ = "group_entities"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    classroom_id = Column(String(36), ForeignKey("classrooms.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    classroom = relationship("Classroom", back_populates="groups")
    members = relationship("ClassroomMember", back_populates="group")

    __table_args__ = (
        UniqueConstraint("classroom_id", "name", name="uq_classroom_group_name"),
    )


class ClassroomMember(Base):
    __tablename__ = "classroom_members"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    classroom_id = Column(String(36), ForeignKey("classrooms.id"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    role = Column(String(32), nullable=False)  # OWNER | CO_TEACHER | TA | STUDENT
    group_id = Column(String(36), ForeignKey("group_entities.id"), nullable=True)
    student_id = Column(String(64), nullable=True)
    joined_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    classroom = relationship("Classroom", back_populates="members")
    user = relationship("User", back_populates="memberships")
    group = relationship("GroupEntity", back_populates="members")

    __table_args__ = (
        UniqueConstraint("classroom_id", "user_id", name="uq_classroom_user_member"),
    )


class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    classroom_id = Column(String(36), ForeignKey("classrooms.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(255), nullable=False)
    description = Column(Text, default="", nullable=False)
    artifact_url = Column(Text, default="", nullable=False)
    group_max_score = Column(Numeric(6, 2), default=15.0, nullable=False)
    individual_max_score = Column(Numeric(6, 2), default=5.0, nullable=False)
    group_deadline_utc = Column(DateTime(timezone=True), nullable=True)
    individual_deadline_utc = Column(DateTime(timezone=True), nullable=True)
    instructor_weight = Column(Numeric(4, 2), default=1.0, nullable=False)
    target_coverage = Column(Integer, default=5, nullable=False)
    max_workload = Column(Integer, default=8, nullable=False)
    min_comparisons = Column(Integer, default=3, nullable=False)
    score_floor = Column(Numeric(4, 3), default=0.600, nullable=False)
    score_ceiling = Column(Numeric(4, 3), default=1.000, nullable=False)
    completion_threshold = Column(Numeric(4, 3), default=0.900, nullable=False)
    scoring_formula_version = Column(String(32), default="v2.0", nullable=False)
    pairing_seed = Column(Integer, nullable=True)
    status = Column(String(32), default="DRAFT", nullable=False)  # DRAFT | PUBLISHED | OPEN | CLOSED | FINALIZED | ARCHIVED
    published_at = Column(DateTime(timezone=True), nullable=True)
    finalized_at = Column(DateTime(timezone=True), nullable=True)
    created_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    classroom = relationship("Classroom", back_populates="assignments")
    criteria = relationship("Criterion", back_populates="assignment", cascade="all, delete-orphan")
    pair_assignments = relationship("PairAssignment", back_populates="assignment", cascade="all, delete-orphan")
    computed_scores = relationship("ComputedScore", back_populates="assignment", cascade="all, delete-orphan")
    overrides = relationship("ScoreOverride", back_populates="assignment", cascade="all, delete-orphan")
    appeals = relationship("Appeal", back_populates="assignment", cascade="all, delete-orphan")


class Criterion(Base):
    __tablename__ = "criteria"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    assignment_id = Column(String(36), ForeignKey("assignments.id"), nullable=False, index=True)
    side = Column(String(32), nullable=False)  # GROUP | INDIVIDUAL
    name = Column(String(255), nullable=False)
    description = Column(Text, default="", nullable=False)
    weight_pct = Column(Numeric(5, 2), nullable=False)
    display_order = Column(Integer, default=0, nullable=False)

    assignment = relationship("Assignment", back_populates="criteria")


class PairAssignment(Base):
    __tablename__ = "pair_assignments"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    assignment_id = Column(String(36), ForeignKey("assignments.id"), nullable=False, index=True)
    criterion_id = Column(String(36), ForeignKey("criteria.id"), nullable=False, index=True)
    side = Column(String(32), nullable=False)  # GROUP | INDIVIDUAL
    item_a_id = Column(String(36), nullable=False)
    item_b_id = Column(String(36), nullable=False)
    evaluator_user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    display_left_item_id = Column(String(36), nullable=False)  # Randomized left item
    generation = Column(Integer, default=1, nullable=False)
    source = Column(String(32), default="AUTO", nullable=False)  # AUTO | INSTRUCTOR_EXTRA | INSTRUCTOR_SELF
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    assignment = relationship("Assignment", back_populates="pair_assignments")
    criterion = relationship("Criterion")
    evaluator = relationship("User")
    comparison = relationship("Comparison", uselist=False, back_populates="pair_assignment", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("assignment_id", "criterion_id", "evaluator_user_id", "item_a_id", "item_b_id", "generation", name="uq_pair_assignment_gen"),
    )


class Comparison(Base):
    __tablename__ = "comparisons"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    pair_assignment_id = Column(String(36), ForeignKey("pair_assignments.id"), unique=True, nullable=False)
    evaluator_user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    choice = Column(Integer, nullable=True)  # 1..6
    status = Column(String(32), default="DRAFT", nullable=False)  # DRAFT | SUBMITTED | EXCLUDED
    time_on_task_ms = Column(Integer, default=0, nullable=False)
    first_seen_at = Column(DateTime(timezone=True), nullable=True)
    saved_at = Column(DateTime(timezone=True), nullable=True)
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    excluded_reason = Column(Text, nullable=True)
    excluded_by = Column(String(36), ForeignKey("users.id"), nullable=True)

    pair_assignment = relationship("PairAssignment", back_populates="comparison")
    revisions = relationship("ComparisonRevision", back_populates="comparison", cascade="all, delete-orphan")


class ComparisonRevision(Base):
    __tablename__ = "comparison_revisions"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    comparison_id = Column(String(36), ForeignKey("comparisons.id"), nullable=False, index=True)
    choice = Column(Integer, nullable=False)
    status = Column(String(32), default="SUBMITTED", nullable=False)
    submitted_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    revision_no = Column(Integer, nullable=False)

    comparison = relationship("Comparison", back_populates="revisions")


class ComputedScore(Base):
    __tablename__ = "computed_scores"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    assignment_id = Column(String(36), ForeignKey("assignments.id"), nullable=False, index=True)
    criterion_id = Column(String(36), ForeignKey("criteria.id"), nullable=True)
    side = Column(String(32), nullable=False)  # GROUP | INDIVIDUAL | TOTAL
    item_id = Column(String(36), nullable=False, index=True)
    comparison_count = Column(Integer, default=0, nullable=False)
    effective_weight_sum = Column(Numeric(8, 3), default=0.0, nullable=False)
    quality_index = Column(Numeric(6, 5), default=0.5, nullable=False)
    score_ratio = Column(Numeric(6, 5), default=0.8, nullable=False)
    weighted_score = Column(Numeric(8, 3), default=0.0, nullable=False)
    _flags = Column("flags", Text, default="[]", nullable=False)
    is_final = Column(Boolean, default=False, nullable=False)
    formula_version = Column(String(32), default="v2.0", nullable=False)
    computed_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    assignment = relationship("Assignment", back_populates="computed_scores")

    @property
    def flags(self):
        try:
            return json.loads(self._flags)
        except Exception:
            return []

    @flags.setter
    def flags(self, value):
        self._flags = json.dumps(value or [])


class ScoreOverride(Base):
    __tablename__ = "score_overrides"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    assignment_id = Column(String(36), ForeignKey("assignments.id"), nullable=False, index=True)
    side = Column(String(32), nullable=False)  # GROUP | INDIVIDUAL | TOTAL
    item_id = Column(String(36), nullable=False)
    criterion_id = Column(String(36), ForeignKey("criteria.id"), nullable=True)
    original_value = Column(Numeric(8, 3), nullable=False)
    override_value = Column(Numeric(8, 3), nullable=False)
    reason = Column(Text, nullable=False)
    created_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    assignment = relationship("Assignment", back_populates="overrides")


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    classroom_id = Column(String(36), ForeignKey("classrooms.id"), nullable=True, index=True)
    assignment_id = Column(String(36), ForeignKey("assignments.id"), nullable=True, index=True)
    actor_user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    action = Column(String(64), nullable=False)  # PUBLISH | OVERRIDE | FINALIZE | REOPEN | UNPUBLISH | EXPORT_IDENTITIES | etc.
    resource_type = Column(String(64), nullable=False)
    resource_id = Column(String(36), nullable=True)
    _before_json = Column("before_json", Text, nullable=True)
    _after_json = Column("after_json", Text, nullable=True)
    reason = Column(Text, nullable=True)
    ip_address = Column(String(64), nullable=True)
    occurred_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    @property
    def before_json(self):
        if not self._before_json:
            return None
        try:
            return json.loads(self._before_json)
        except Exception:
            return None

    @before_json.setter
    def before_json(self, value):
        self._before_json = json.dumps(value) if value is not None else None

    @property
    def after_json(self):
        if not self._after_json:
            return None
        try:
            return json.loads(self._after_json)
        except Exception:
            return None

    @after_json.setter
    def after_json(self, value):
        self._after_json = json.dumps(value) if value is not None else None


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    type = Column(String(64), nullable=False)  # ASSIGNMENT_OPEN | DEADLINE_48H | FINALIZED | EXTRA_PAIR | REGEN_PAIR
    _payload_json = Column("payload_json", Text, default="{}", nullable=False)
    sent_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    read_at = Column(DateTime(timezone=True), nullable=True)

    @property
    def payload_json(self):
        try:
            return json.loads(self._payload_json)
        except Exception:
            return {}

    @payload_json.setter
    def payload_json(self, value):
        self._payload_json = json.dumps(value or {})


class Appeal(Base):
    __tablename__ = "appeals"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    assignment_id = Column(String(36), ForeignKey("assignments.id"), nullable=False, index=True)
    student_user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    message = Column(Text, nullable=False)
    status = Column(String(32), default="OPEN", nullable=False)  # OPEN | RESOLVED | REJECTED
    resolution = Column(Text, nullable=True)
    resolved_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    assignment = relationship("Assignment", back_populates="appeals")
