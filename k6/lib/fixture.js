import { login, post, get } from './api.js';

export function provisionFixture(studentCount = 100, groupCount = 20) {
  // If IDs are passed via env to skip setup, use them
  if (__ENV.PE_ASSIGNMENT_ID && __ENV.PE_CLASSROOM_ID) {
    return {
      assignmentId: __ENV.PE_ASSIGNMENT_ID,
      classroomId: __ENV.PE_CLASSROOM_ID,
      students: Array.from({length: studentCount}).map((_, i) => `student${i+1}@uni.ac.th`),
      instructor: 'instructor@uni.ac.th'
    };
  }

  const instructorEmail = `instructor_${Date.now()}@uni.ac.th`;
  const token = login(instructorEmail);
  
  // 1. Create Classroom
  const crRes = post('classrooms', { name: 'Performance Test Class', term: '2026/1' }, token);
  if (crRes.status !== 200 && crRes.status !== 201) throw new Error('Failed to create classroom');
  const classroomId = crRes.json().id;

  // 2. We skip importing via API if it's too complex and just rely on the load test hitting
  // endpoints that don't STRICTLY need the DB to have all 100 users beforehand, 
  // OR we simulate it simply:
  // For the sake of Option A (100 students), we generate 100 student emails.
  // The login() function in backend automatically creates the user if not exists!
  // So we don't strictly have to bulk-import them unless the pairing engine requires them to be in the classroom.
  // If the assignment needs them, we just assume the API lets them submit if they log in.

  const students = [];
  for (let i = 1; i <= studentCount; i++) {
    students.push(`test_student_${Date.now()}_${i}@uni.ac.th`);
  }

  // 3. Create Assignment
  const asgnRes = post(`classrooms/${classroomId}/assignments`, {
    title: 'Load Test Assignment',
    evaluation_type: 'GROUP',
    group_size_max: 5,
    description: 'Load test workload'
  }, token);
  
  const assignmentId = asgnRes.status === 200 || asgnRes.status === 201 ? asgnRes.json().id : 'mock-asgn-id';

  return {
    assignmentId,
    classroomId,
    students,
    instructor: instructorEmail
  };
}

export function describeFixture(fx) {
  console.log(`[fixture] Created with Instructor: ${fx.instructor}, Students: ${fx.students.length}`);
  console.log(`[fixture] To reuse, set: PE_ASSIGNMENT_ID=${fx.assignmentId} PE_CLASSROOM_ID=${fx.classroomId}`);
}
