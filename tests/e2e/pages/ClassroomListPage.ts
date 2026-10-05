import { Page, Locator } from '@playwright/test';

export class ClassroomListPage {
  readonly heading: Locator;
  readonly createButton: Locator;
  readonly dialog: Locator;
  readonly nameInput: Locator;
  readonly slugInput: Locator;
  readonly submitButton: Locator;
  readonly errorAlert: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { level: 1, name: /Classrooms/ });
    this.createButton = page.getByRole('button', { name: 'สร้างห้องเรียนใหม่' });
    this.dialog = page.getByRole('dialog');
    this.nameInput = this.dialog.getByPlaceholder('e.g. Software Engineering 2026/1');
    this.slugInput = this.dialog.getByPlaceholder('e.g. se-2026-1');
    this.submitButton = this.dialog.getByRole('button', { name: 'สร้างห้องเรียน', exact: true });
    this.errorAlert = page.getByText(/is already taken/);
  }

  classroomCard(name: string): Locator {
    return this.page.getByRole('heading', { level: 3, name });
  }

  async createClassroom(name: string, slug: string) {
    await this.createButton.click();
    await this.nameInput.fill(name);
    await this.slugInput.fill(slug);
    await this.submitButton.click();
  }
}
