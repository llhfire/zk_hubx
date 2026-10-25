export type ElectronicSigningStatus = 'pending' | 'signing' | 'completed' | 'refused' | 'expired' | 'revoked';

export interface ElectronicSigner {
  id: string;
  name: string;
  phone: string;
  order: number;
  status: 'waiting' | 'signed' | 'refused';
  actedAt?: string;
}

export interface ElectronicSigningEvidence {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  url?: string;
  uploadedAt: string;
}

export interface ElectronicSigningPackage {
  id: string;
  status: ElectronicSigningStatus;
  signers: ElectronicSigner[];
  deadline: string;
  createdAt: string;
  updatedAt: string;
  evidence: ElectronicSigningEvidence[];
}

export type ComplianceItemStatus = 'complete' | 'missing' | 'anomaly';

export interface SalesComplianceItem {
  key: string;
  label: string;
  status: ComplianceItemStatus;
  source: string;
  detail: string;
  route?: string;
}
