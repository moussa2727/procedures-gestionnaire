export interface UserStatistics {
  total: number;
  byRole: {
    ETUDIANT: number;
    CONSULTANT: number;
    ADMIN: number;
  };
  active: number;
  inactive: number;
  online: number;
  newThisMonth: number;
  newThisWeek: number;
  generatedAt: string;
}
