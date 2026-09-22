export const CHANGE_PASSWORD_PATH = '/account/change-password';

export function mustChangePassword(user: { passwordChangeRequired?: boolean } | null): boolean {
  return Boolean(user?.passwordChangeRequired);
}
