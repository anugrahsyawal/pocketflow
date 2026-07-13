export interface TemplateCategory {
  id: string;
  pocketId: string;
  name: string;
  emoji: string;
  isArchived: boolean;
}

export interface Category extends TemplateCategory {
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
