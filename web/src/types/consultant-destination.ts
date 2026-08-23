export interface ConsultantDestinationAssignment {
  consultantId: string;
  destinationId: string;
  assignedAt: string;
  consultant?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    isActive: boolean;
  };
  destination?: {
    id: string;
    country: string;
    photo: string;
    description: string;
    isDeleted: boolean;
  };
}
