export type PocketGroupId = 'daily' | 'bills' | 'savings';

export interface PocketGroup {
  id: PocketGroupId;
  label: string;
  labelEn: string;
}

export interface TemplatePocket {
  id: string;
  name: string;
  emoji: string;
  groupId: PocketGroupId;
  monthlyAllocation: number | null;
  initialBalance: number;
  isSpendable: boolean;
  isArchived: boolean;
  budgetOwnerPocketId?: string;
}

export interface Pocket extends TemplatePocket {
  currentBalance: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
