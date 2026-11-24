/**
 * An action a signed-out visitor started that needs an account (e.g. "Book consultation").
 * After sign-in the app resumes it (RootNavigator), so the visitor lands on booking, not on Home.
 */
export type PendingAction = { screen: 'BookAppointment'; params: { slug: string; name?: string } };

let pending: PendingAction | null = null;

export function setPending(action: PendingAction | null): void {
  pending = action;
}

export function takePending(): PendingAction | null {
  const action = pending;
  pending = null;
  return action;
}
