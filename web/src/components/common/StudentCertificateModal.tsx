'use client';

import { Modal } from './Modal';

interface CertificateData {
  studentName: string;
  procedureTitle: string;
  issueDate: string;
}

export function StudentCertificateModal({ data, isOpen, onClose }: { data: CertificateData; isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Certificat">
      <div className="p-4">
        <p className="text-sm text-slate-600">Certificat de {data.studentName}</p>
        <p className="text-sm text-slate-600">{data.procedureTitle}</p>
        <p className="text-sm text-slate-600">Émis le {data.issueDate}</p>
      </div>
    </Modal>
  );
}
