import { login, post, get } from './api.js';
import { sleep } from 'k6';

export function provisionFixture(studentCount = 100, groupCount = 20) {
  if (__ENV.PE_ASSIGNMENT_ID && __ENV.PE_CLASSROOM_ID) {
    return {
      assignmentId: __ENV.PE_ASSIGNMENT_ID,
      classroomId: __ENV.PE_CLASSROOM_ID,
      students: Array.from({length: studentCount}).map((_, i) => `student${i+1}@uni.ac.th`),
      ownerEmail: 'instructor@uni.ac.th',
      ownerToken: 'mock-token'
    };
  }

  const ownerEmail = `instructor_${Date.now()}@uni.ac.th`;
  const ownerToken = login(ownerEmail);
  
  const crRes = post('classrooms', { name: 'Performance Test Class', slug: `perf-test-${Date.now()}`, timezone: 'Asia/Bangkok' }, ownerToken);
  let classroomId = 'mock-cr-id';
  if (crRes.status === 200 || crRes.status === 201) {
    classroomId = crRes.json().id;
  }

  const students = [];
  for (let i = 1; i <= studentCount; i++) {
    const email = `test_student_${Date.now()}_${i}@uni.ac.th`;
    students.push(email);
    // Add student to classroom
    post(`classrooms/${classroomId}/members`, { email, role: 'STUDENT', group_name: `Group ${(i % groupCount) + 1}` }, ownerToken);
  }

  const asgnRes = post(`classrooms/${classroomId}/assignments`, {
    name: 'Load Test Assignment',
    slug: `load-test-${Date.now()}`,
    group_max_score: 15.0,
    individual_max_score: 5.0,
    criteria: [
      { name: "C1", description: "C1", weight_pct: 100, side: "GROUP" }
    ]
  }, ownerToken);
  
  let assignmentId = 'mock-asgn-id';
  if (asgnRes.status === 200 || asgnRes.status === 201) {
    assignmentId = asgnRes.json().id;
  }

  // Publish and generate pairs
  post(`assignments/${assignmentId}:publish`, { reason: 'k6 test' }, ownerToken);

  return {
    assignmentId,
    classroomId,
    students,
    ownerEmail,
    ownerToken
  };
}

export function describeFixture(fx) {
  console.log(`[fixture] Instructor: ${fx.ownerEmail}, Students: ${fx.students.length}, Assignment: ${fx.assignmentId}`);
}
