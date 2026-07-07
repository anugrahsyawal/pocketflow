export interface Settings {
  budgetStartDay: number;
  hideBalances: boolean;
  userName: string;
  userEmail: string;
}

export interface AppState {
  isAuthenticated: boolean;
  isSetupComplete: boolean;
}
