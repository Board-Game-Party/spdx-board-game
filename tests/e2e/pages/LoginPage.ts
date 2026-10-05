import { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly googleSignInButton: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly nextButton: Locator;

  constructor(private readonly page: Page) {
    this.googleSignInButton = page.getByRole('button', { name: /Sign in with Google/ });
    this.emailInput = page.getByPlaceholder(/prof\.somchai@uni\.ac\.th/);
    this.passwordInput = page.getByPlaceholder('รหัสผ่าน');
    this.nextButton = page.getByRole('button', { name: /Next/ });
  }

  async goto() {
    await this.page.goto('/');
  }

  async loginAs(email: string) {
    await this.googleSignInButton.click();
    await this.emailInput.fill(email);
    await this.nextButton.click();
    // The simulated Google flow accepts any password
    await this.passwordInput.fill('e2e-password');
    await this.nextButton.click();
  }
}
