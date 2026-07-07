export type PocketGroupId = 'daily' | 'bills' | 'savings';

export interface PocketGroup {
  id: PocketGroupId;
  label: string;
  labelEn: string;
}

export interface Pocket {
  id: string;
  name: string;
  emoji: string;
  groupId: PocketGroupId;
  monthlyAllocation: number | null;
  initialBalance: number;
  isSpendable: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}
