import { Task, Project, TaskStatus, Checklist } from '../types';

export const mockProjects: Project[] = [
  { id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', name: 'Geral', color: '#3B82F6', icon: 'briefcase' },
  { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', name: 'Alunos Zenit', color: '#FFD000', icon: 'graduation-cap' },
  { id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', name: 'Conteúdo', color: '#8B5CF6', icon: 'video' },
];

export const mockStatuses: TaskStatus[] = [
  { id: 's1', project_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', name: 'Backlog', color: '#9CA3AF', type: 'not_started', order_index: 0 },
  { id: 's2', project_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', name: 'A Fazer', color: '#6B7280', type: 'not_started', order_index: 1 },
  { id: 's3', project_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', name: 'Em Andamento', color: '#3B82F6', type: 'active', order_index: 2 },
  { id: 's4', project_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', name: 'Concluída', color: '#22C55E', type: 'done', order_index: 3 },
];

export const mockTasks: Task[] = [
  {
    id: '1',
    custom_id: 'TAR-001',
    project_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    title: 'Fazer onboarding do novo aluno',
    description: 'Agendar call de boas-vindas e enviar materiais iniciais de acesso à plataforma.',
    status_id: 's3',
    status: mockStatuses[2],
    priority: 'high',
    due_date: new Date(Date.now() + 86400000).toISOString(),
    created_at: new Date().toISOString(),
    context_type: 'aluno_zenit',
    context_name: 'João Silva',
    assignees: [{ id: 'u1', full_name: 'Eu', email: 'eu@zenit.com', role: 'admin' }],
    tags: ['Onboarding', 'Urgente']
  },
  {
    id: '2',
    custom_id: 'CON-042',
    project_id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    title: 'Gravar Reels sobre Prospecção',
    description: 'Roteiro pronto no drive.',
    status_id: 's2',
    status: mockStatuses[1],
    priority: 'medium',
    due_date: new Date(Date.now() + 172800000).toISOString(),
    created_at: new Date().toISOString(),
    tags: ['Instagram']
  }
];

export const mockChecklists: Checklist[] = [
  {
    id: 'chk-1',
    task_id: '1',
    name: 'Processo de Onboarding',
    items: [
      { id: 'itm-1', checklist_id: 'chk-1', content: 'Enviar email de boas-vindas', is_completed: true },
      { id: 'itm-2', checklist_id: 'chk-1', content: 'Cadastrar na plataforma', is_completed: false },
      { id: 'itm-3', checklist_id: 'chk-1', content: 'Agendar call', is_completed: false }
    ]
  }
];