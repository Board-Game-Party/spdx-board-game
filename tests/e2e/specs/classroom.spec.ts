import { test, expect } from '../fixtures';
import { LoginPage } from '../pages/LoginPage';
import { ClassroomListPage } from '../pages/ClassroomListPage';
import { testData } from '../seed/test-data';

test.describe('classroom feature', () => {
  // AC (US-AUTH-01): Given a registered instructor, When they sign in via Google,
  // Then they see their classroom list
  test('instructor signs in and sees their classroom', async ({ page }) => {
    const login = new LoginPage(page);
    const classrooms = new ClassroomListPage(page);
    await login.goto();
    await login.loginAs(testData.teacher.email);

    await expect(classrooms.heading).toBeVisible();
    await expect(classrooms.classroomCard(testData.existingClassroom.name)).toBeVisible();
  });

  // AC (classroom creation): Given a signed-in instructor, When they submit a unique
  // name and slug, Then the new classroom is created
  test('happy path: create classroom succeeds', async ({ page, request }) => {
    const login = new LoginPage(page);
    const classrooms = new ClassroomListPage(page);
    await login.goto();
    await login.loginAs(testData.teacher.email);
    await classrooms.createClassroom(testData.newClassroom.name, testData.newClassroom.slug);

    await expect(classrooms.dialog).toBeHidden();
    // Verify via the API that the classroom was really persisted
    const token = await page.evaluate(() => localStorage.getItem('paireval_token'));
    const res = await request.get('/api/classrooms', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(JSON.stringify(await res.json())).toContain(testData.newClassroom.slug);
  });

  // AC (classroom creation): Given a slug already in use, When an instructor creates a
  // classroom with that slug, Then it is rejected
  test('edge case: duplicate slug is rejected', async ({ page }) => {
    const login = new LoginPage(page);
    const classrooms = new ClassroomListPage(page);
    await login.goto();
    await login.loginAs(testData.teacher.email);
    await classrooms.createClassroom('Another Name', testData.existingClassroom.slug);

    await expect(classrooms.errorAlert).toBeVisible();
  });
});
