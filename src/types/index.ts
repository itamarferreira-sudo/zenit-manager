
export type TaskStatusGroup = 'not_started' | 'active' | 'done' | 'closed';

export interface Project {
  id: string; // UUID
  name: string;
  description?: string;
  color: string;
  icon: string;
}

export interface TaskStatus {
  id: string; // UUID
  project_id: string;
  name: string;
  color: string;
  type: TaskStatusGroup; // Mapped from 'type' in DB
  order_index: number;
}

export interface TaskPriority {
  id: string;
  name: string;
  color: string;
  value: number; // 1 = Urgent
}

export interface Task {
  id: string;
  custom_id?: string; // TAR-123
  
  project_id?: string;
  project?: Project; // Joined
  
  title: string;
  description?: string;
  
  status_id?: string;
  status?: TaskStatus; // Joined
  
  // Mantendo string union para compatibilidade com o resto do app
  priority?: 'low' | 'medium' | 'high' | 'urgent'; 
  
  start_date?: string;
  due_date?: string;
  completed_at?: string;
  
  time_estimated?: number; // Minutes
  time_spent?: number; // Minutes
  
  context_type?: 'geral' | 'aluno_zenit' | 'lead' | 'conteudo';
  context_id?: string;
  contact_id?: string; // Mantido para retrocompatibilidade com CRM/Zenit
  context_name?: string; 
  
  assignees?: Profile[]; // Joined via task_assignees
  tags?: string[]; // Array of strings
  attachments?: string[]; // Array of URLs (Storage)
  
  parent_id?: string;
  subtasks?: Task[]; // Recursive
  
  checklists?: Checklist[];
  
  created_at: string;
  updated_at?: string;
}

export interface Checklist {
  id: string;
  task_id: string;
  name: string;
  items: ChecklistItem[];
}

export interface ChecklistItem {
  id: string;
  checklist_id: string;
  content: string;
  is_completed: boolean;
}

// Existing Types...
export interface SystemTag {
  id: string;
  label: string;
  color: string;
  type: 'product' | 'cost_center' | 'niche' | 'task'; 
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'editor' | 'member';
  avatar_url?: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  user_name?: string;
  user_avatar?: string;
  content: string;
  created_at: string;
}

export interface ContentComment {
  id: string;
  content_item_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export type ContactType = 'lead' | 'client' | 'partner' | 'student';
export type ContactStatus = 'active' | 'inactive' | 'blocked' | 'prospect';

export interface Contact {
  id: string;
  full_name: string;
  email?: string;
  phone?: string;
  document?: string;
  city?: string;
  age?: string;
  instagram?: string;
  type: ContactType;
  status: ContactStatus;
  product_name?: string;
  purchase_date?: string;
  ltv?: number;
  niche?: string;
  acquisition_channel?: string;
  notes?: string;
  address?: string;
  financial_recurrence?: boolean;
  financial_value?: number;
  attachments?: string[]; // Array of URLs (Storage)
  created_at: string;
  updated_at?: string;
}

export interface StudentMetric {
  id: string;
  contact_id: string;
  month_year: string;
  sales_count: number;
  meetings_booked: number;
  meetings_executed: number;
  revenue_generated: number;
  notes?: string;
}

export type ContentStatus = 'idea' | 'scripting' | 'production' | 'scheduled' | 'published';
export type ContentPlatform = 'instagram' | 'youtube' | 'tiktok' | 'linkedin' | 'blog';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface ContentItem {
  id: string;
  title: string;
  description?: string;
  platform: ContentPlatform;
  status: ContentStatus;
  publish_date?: string;
  ai_generated?: boolean;
  script?: string;
  drive_link?: string;
  format?: string;
  reference_link?: string;
  approval_status?: ApprovalStatus;
  admin_comments?: string;
  created_at: string;
}

export type TransactionType = 'income' | 'expense';
export type TransactionStatus = 'paid' | 'pending';

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
  category: string;
  contact_id?: string;
  due_date: string;
  created_at: string;
}