// Centralização e re-export de tipos do sistema Descubra!

export * from './empresa.types';
export * from './jovem.types';
export * from './tecnico.types';
export * from './vaga.types';
export * from './encaminhamento.types';

export type DialogType = 'success' | 'warning' | 'danger';
export type AdminTab = 'overview' | 'technician' | 'youth' | 'company';
