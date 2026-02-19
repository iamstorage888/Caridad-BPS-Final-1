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
  // Updated props for dry docking certificate
  dryDockingDetails?: {
    isNonResident: boolean;
    boatNumber: string;
    address?: string; // Only for non-residents
  };
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
  dryDockingDetails,
}) => {

  const today = new Date().toLocaleDateString();

  const commonHeader = (
    <div style={{ textAlign: 'center', marginBottom: '20px' }}>
      <h2>Republic of the Philippines</h2>
      <h3>Barangay Caridad</h3>
      <p>Date Issued: {today}</p>
      <hr />
    </div>
  );

  const calculateAge = (birthday?: string): string => {
    if (!birthday) return 'unknown age';
    try {
      const [year, month, day] = birthday.split('-').map(Number);
      const birthDate = new Date(Date.UTC(year, month - 1, day));
      const now = new Date();
      let age = now.getFullYear() - birthDate.getUTCFullYear();
      const monthDiff = now.getMonth() - birthDate.getUTCMonth();
      if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birthDate.getUTCDate())) {
        age--;
      }
      return `${age} years old`;
    } catch (err) {
      console.error('⛔ Failed to parse birthday:', birthday);
      return 'unknown age';
    }
  };

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
            This is to certify that <strong>{fullName}</strong>, a {sex}, <strong>{calculateAge(birthday)}</strong>,
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
        // Check if this is for a barangay resident or non-resident
        if (dryDockingDetails) {
          if (dryDockingDetails.isNonResident) {
            // For non-residents - explicitly mention boat number and address
            return (
              <div>
                <p style={{ marginBottom: '20px' }}>
                  This is to certify that <strong>{fullName}</strong>, 
                  a non-resident residing at <strong>{dryDockingDetails.address || 'address not specified'}</strong>, 
                  is hereby granted permission to conduct dry docking activities for boat number <strong>{dryDockingDetails.boatNumber}</strong> 
                  within the jurisdiction of this Barangay.
                </p>
                
                <p style={{ marginBottom: '15px' }}>
                  The vessel owner, <strong>{fullName}</strong>, with registered address at <strong>{dryDockingDetails.address || 'Not specified'}</strong>, 
                  has been granted temporary authorization for dry docking activities and maintenance operations 
                  for the vessel bearing registration number <strong>{dryDockingDetails.boatNumber}</strong> 
                  within our barangay jurisdiction.
                </p>
                
                <p style={{ marginBottom: '15px' }}>
                  This certificate confirms that boat number <strong>{dryDockingDetails.boatNumber}</strong> 
                  owned by <strong>{fullName}</strong> is authorized for dry docking operations. 
                  The holder of this certificate must comply with all applicable local maritime regulations, 
                  environmental guidelines, and safety protocols during the specified dry docking period.
                </p>
                
                <p style={{ marginBottom: '15px' }}>
                  <strong>Purpose of Request:</strong> <em>{purpose}</em>
                </p>
                
                <p style={{ fontStyle: 'italic', color: '#666' }}>
                  This certificate is issued in accordance with local maritime regulations and is subject to 
                  time limitations and conditions as specified by the Barangay Council.
                </p>
              </div>
            );
          } else {
            // For barangay residents - explicitly mention boat number and address
            return (
              <div>
                <p style={{ marginBottom: '20px' }}>
                  This is to certify that <strong>{fullName}</strong>, a bonafide resident of this Barangay 
                  residing at <strong>{address || 'this barangay'}</strong>, 
                  is hereby granted permission to conduct dry docking activities for boat number <strong>{dryDockingDetails.boatNumber}</strong> 
                  within the jurisdiction of this Barangay.
                </p>
                
                <p style={{ marginBottom: '15px' }}>
                  The vessel owner, <strong>{fullName}</strong>, with residential address at <strong>{address || 'this barangay'}</strong>, 
                  has been granted authorization for dry docking activities and vessel maintenance operations 
                  for the boat bearing registration number <strong>{dryDockingDetails.boatNumber}</strong> 
                  within our barangay jurisdiction.
                </p>
                
                <p style={{ marginBottom: '15px' }}>
                  This certificate confirms that boat number <strong>{dryDockingDetails.boatNumber}</strong> 
                  owned by resident <strong>{fullName}</strong> is authorized for dry docking operations. 
                  As a resident of this barangay with address at <strong>{address || 'this barangay'}</strong>, 
                  the holder is authorized to perform necessary vessel maintenance, repairs, and dry docking operations 
                  in compliance with local maritime guidelines and environmental regulations.
                </p>
                
                <p style={{ marginBottom: '15px' }}>
                  <strong>Purpose of Request:</strong> <em>{purpose}</em>
                </p>
                
                <p style={{ fontStyle: 'italic', color: '#666' }}>
                  This certificate is issued in accordance with local maritime regulations and confirms 
                  the holder's compliance with barangay guidelines for dry docking activities.
                </p>
              </div>
            );
          }
        } else {
          // Fallback if no specific details are provided
          return (
            <p>
              This certifies that <strong>{fullName}</strong> is requesting a dry docking certificate, confirming their eligibility
              and compliance with local maritime guidelines. Issued for the purpose of <em>{purpose}</em>.
            </p>
          );
        }
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