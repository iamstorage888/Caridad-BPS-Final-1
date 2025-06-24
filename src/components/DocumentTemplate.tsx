import React from 'react';

interface DocumentTemplateProps {
  fullName: string;
  purpose: string;
  documentType:
  | 'Brgy Clearance'
  | 'Brgy Residency'
  | 'Brgy Permit'
  | 'Certificate of Indigency'
  | 'Certificate Dry Docking'
  | 'Certificate of Attestation';
  sex?: string;
  birthday?: string;
  address?: string;
  occupation?: string;
  status?: string;
  movedInDate?: string;
}


const DocumentTemplate: React.FC<DocumentTemplateProps> = ({
  fullName,
  purpose,
  documentType,
  sex,
  birthday,
  address,
  occupation,
  status,
  movedInDate,
}) => {


  const today = new Date().toLocaleDateString();

  const commonHeader = (
    <div style={{ textAlign: 'center', marginBottom: '20px' }}>
      <h2>Republic of the Philippines</h2>
      <h3>Barangay Example</h3>
      <p>Date Issued: {today}</p>
      <hr />
    </div>
  );

  const calculateYearsInBarangay = (movedInDate?: string): string => {
  if (!movedInDate) return 'an unspecified number of years';

  try {
    // Force UTC to avoid timezone offset issues
    const [year, month, day] = movedInDate.split('-').map(Number);
    const movedIn = new Date(Date.UTC(year, month - 1, day));
    const now = new Date();

    const diffInMs = now.getTime() - movedIn.getTime();
    const diffInYears = Math.floor(diffInMs / (1000 * 60 * 60 * 24 * 365.25));

    return `${diffInYears} year${diffInYears !== 1 ? 's' : ''}`;
  } catch (err) {
    console.error('⛔ Failed to parse movedInDate:', movedInDate);
    return 'an unspecified number of years';
  }
};



  const content = () => {
    switch (documentType) {
      case 'Brgy Clearance':
        return (
          <p>
            This is to certify that <strong>{fullName}</strong>, a {sex} born on <strong>{birthday}</strong>,
            residing at <strong>{address}</strong>, currently working as <strong>{occupation}</strong>, has no derogatory
            record as of this date. This Barangay Clearance is issued for the purpose of <em>{purpose}</em>.
          </p>
        );
      case 'Brgy Residency':
        return (
          <p>
            This is to certify that <strong>{fullName}</strong> has been a bonafide resident of this Barangay and has lived here for
            <strong> {calculateYearsInBarangay(movedInDate)}</strong>. The resident is known to reside at <strong>{address}</strong>. This certificate
            is issued upon request for the purpose of <em>{purpose}</em>.
          </p>
        );
      case 'Brgy Permit':
        return (
          <p>
            This certifies that <strong>{fullName}</strong> is granted permission by the Barangay to conduct business or
            activity within the community premises for the purpose of <em>{purpose}</em>.
          </p>
        );
      case 'Certificate of Indigency':
        return (
          <p>
            This is to certify that <strong>{fullName}</strong> is an indigent resident of this Barangay and is qualified to
            avail of services and programs for indigent citizens. This certificate is issued for the purpose of <em>{purpose}</em>.
          </p>
        );
      case 'Certificate Dry Docking':
        return (
          <p>
            This certifies that <strong>{fullName}</strong> is requesting a dry docking certificate, confirming their eligibility
            and compliance with local maritime guidelines. Issued for the purpose of <em>{purpose}</em>.
          </p>
        );
      case 'Certificate of Attestation':
        return (
          <p>
            This certificate attests that <strong>{fullName}</strong> has fulfilled the necessary requirements as deemed by the
            Barangay. This is issued for the purpose of <em>{purpose}</em>.
          </p>
        );
      default:
        return <p>Invalid document type.</p>;
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px', fontFamily: 'serif' }}>
      {commonHeader}
      <h2 style={{ textAlign: 'center', textDecoration: 'underline' }}>{documentType}</h2>
      <div style={{ marginTop: '30px', fontSize: '18px', lineHeight: '1.6' }}>{content()}</div>

      <div style={{ marginTop: '50px', textAlign: 'right' }}>
        <p>Barangay Captain</p>
        <p><strong>Hon. Exelino J. Javier</strong></p>
      </div>
    </div>
  );
};

export default DocumentTemplate;
