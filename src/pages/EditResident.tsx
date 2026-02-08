import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import LogoutButton from '../components/LogoutButton';
import { db } from '../Database/firebase';
import { doc, getDoc, updateDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { uploadImage, deleteImage } from '../Database/supabaseClient';

interface FormData {
  lastName: string;
  firstName: string;
  middleName: string;
  sex: string;
  birthday: string;
  occupation: string;
  status: string;
  address: string;
  contactNumber: string;
  education: string;
  religion: string;
  householdNumber: string;
  isFamilyHead: boolean;
  isWife: boolean;
  movedInDate: string;
  nationalIdFrontUrl?: string;
  nationalIdBackUrl?: string;
  votersIdFrontUrl?: string;
  votersIdBackUrl?: string;
  isRegisteredVoter: boolean;
}

// Interface for household data with name
interface HouseholdData {
  number: string;
  name: string;
  purok: string;
}

const EditResident: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingIds, setUploadingIds] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  
  const [formData, setFormData] = useState<FormData>({
    lastName: '',
    firstName: '',
    middleName: '',
    sex: '',
    birthday: '',
    occupation: '',
    status: '',
    address: '',
    contactNumber: '',
    education: '',
    religion: '',
    householdNumber: '',
    isFamilyHead: false,
    isWife: false,
    movedInDate: '',
    isRegisteredVoter: false
  });

  // New ID file states
  const [nationalIdFront, setNationalIdFront] = useState<File | null>(null);
  const [nationalIdBack, setNationalIdBack] = useState<File | null>(null);
  const [votersIdFront, setVotersIdFront] = useState<File | null>(null);
  const [votersIdBack, setVotersIdBack] = useState<File | null>(null);

  // UPDATED: Changed from string[] to HouseholdData[]
  const [households, setHouseholds] = useState<HouseholdData[]>([]);
  const [allHouseholdNumbers, setAllHouseholdNumbers] = useState<string[]>([]);
  const [hasFamilyHead, setHasFamilyHead] = useState(false);
  const [hasWife, setHasWife] = useState(false);
  const [occupations, setOccupations] = useState<string[]>([]);
  const [customOccupation, setCustomOccupation] = useState('');
  const [isCustomOccupation, setIsCustomOccupation] = useState(false);
  
  // Household option state
  const [householdOption, setHouseholdOption] = useState<'new' | 'existing'>('existing');
  const [newHouseholdNumber, setNewHouseholdNumber] = useState('');

  // Predefined options
  const educationLevels = [
    'Elementary Graduate',
    'High School Graduate',
    'Senior High School Graduate',
    'College Graduate',
    'Vocational/Technical Graduate',
    'Post Graduate',
    'No Formal Education'
  ];

  const civilStatuses = [
    'Single',
    'Married',
    'Widowed',
    'Divorced',
    'Separated'
  ];

  // Validation helpers
  const isValidName = (name: string): boolean => {
    const nameRegex = /^[a-zA-ZñÑ\s\-\.\']+$/;
    return nameRegex.test(name.trim()) && name.trim().length >= 2;
  };

  const isValidAddress = (address: string): boolean => {
    return address.trim().length >= 10 && /^[a-zA-Z0-9ñÑ\s\-\.\,\#]+$/.test(address.trim());
  };

  const isValidContactNumber = (contactNumber: string): boolean => {
    if (!contactNumber) return true;
    const phoneRegex = /^(\+?63|0)?9\d{9}$/;
    const cleanedNumber = contactNumber.replace(/[\s\-]/g, '');
    return phoneRegex.test(cleanedNumber);
  };

  const isValidDate = (dateString: string, isMovedInDate: boolean = false): boolean => {
    if (!dateString) return !isMovedInDate;
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (isNaN(date.getTime())) return false;
    const minDate = new Date('1900-01-01');
    return date >= minDate && date <= today;
  };

  const calculateAge = (birthday: string): number => {
    const birthDate = new Date(birthday);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const isValidImageFile = (file: File): boolean => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    const maxSize = 5 * 1024 * 1024;
    return allowedTypes.includes(file.type) && file.size <= maxSize;
  };

  // Generate next household number
  const generateNextHouseholdNumber = (existingNumbers: string[]) => {
    if (existingNumbers.length === 0) return 'HH-001';
    
    const numericNumbers = existingNumbers
      .map(num => {
        const match = num.match(/(\d+)$/);
        return match ? parseInt(match[1]) : 0;
      })
      .filter(num => num > 0);

    const highest = Math.max(...numericNumbers, 0);
    const nextNum = highest + 1;
    return `HH-${nextNum.toString().padStart(3, '0')}`;
  };

  // Fetch resident data
  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      try {
        const residentDoc = await getDoc(doc(db, 'residents', id));
        if (residentDoc.exists()) {
          const data = residentDoc.data();
          setFormData({
            lastName: data.lastName || '',
            firstName: data.firstName || '',
            middleName: data.middleName || '',
            sex: data.sex || '',
            birthday: data.birthday || '',
            occupation: data.occupation || '',
            status: data.status || '',
            address: data.address || '',
            contactNumber: data.contactNumber || '',
            education: data.education || '',
            religion: data.religion || '',
            householdNumber: data.householdNumber || '',
            isFamilyHead: data.isFamilyHead || false,
            isWife: data.isWife || false,
            movedInDate: data.movedInDate || '',
            nationalIdFrontUrl: data.nationalIdFrontUrl,
            nationalIdBackUrl: data.nationalIdBackUrl,
            votersIdFrontUrl: data.votersIdFrontUrl,
            votersIdBackUrl: data.votersIdBackUrl,
            isRegisteredVoter: data.isRegisteredVoter || false
          });

          // Check if occupation is custom
          const existingOccs = await getDocs(collection(db, 'residents'));
          const occList = Array.from(
            new Set(existingOccs.docs.map(doc => doc.data().occupation).filter(Boolean))
          );
          if (data.occupation && !occList.includes(data.occupation)) {
            setIsCustomOccupation(true);
            setCustomOccupation(data.occupation);
          }
        }
      } catch (error) {
        console.error('Error fetching resident:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // UPDATED: Fetch households with names and puroks
  useEffect(() => {
    const fetchHouseholds = async () => {
      try {
        // Fetch complete household objects with names
        const householdSnapshot = await getDocs(collection(db, 'households'));
        const officialHouseholds: HouseholdData[] = householdSnapshot.docs
          .map(doc => {
            const data = doc.data();
            return {
              number: data.householdNumber || '',
              name: data.householdName || 'Unnamed Household',
              purok: data.purok || 'Unspecified'
            };
          })
          .filter(h => h.number) // Filter out any without numbers
          .sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));
        
        console.log('📋 Official households with names:', officialHouseholds);
        
        // Get all household numbers for next number generation
        const officialNumbers = officialHouseholds.map(h => h.number);
        
        const residentsSnapshot = await getDocs(collection(db, 'residents'));
        const residentHouseholds = residentsSnapshot.docs
          .map(doc => doc.data().householdNumber)
          .filter(Boolean);

        const allNumbers = [...officialNumbers, ...residentHouseholds];
        const uniqueNumbers = Array.from(new Set(allNumbers)).sort((a, b) => 
          a.localeCompare(b, undefined, { numeric: true })
        );

        console.log('📊 All household numbers (for next number generation):', uniqueNumbers);

        setAllHouseholdNumbers(uniqueNumbers);
        
        // Set household objects for dropdown (with names)
        setHouseholds(officialHouseholds);
        
        // Generate next household number based on all existing numbers
        const nextNumber = generateNextHouseholdNumber(uniqueNumbers);
        setNewHouseholdNumber(nextNumber);
        
        console.log('✨ Next household number:', nextNumber);
        console.log('🏠 Households available in dropdown:', officialHouseholds.length);
        
      } catch (error) {
        console.error('Error fetching households:', error);
      }
    };

    fetchHouseholds();
  }, []);

  // Fetch occupations
  useEffect(() => {
    const fetchOccupations = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'residents'));
        const occs = Array.from(
          new Set(snapshot.docs.map(doc => doc.data().occupation).filter(Boolean))
        );
        setOccupations(occs);
      } catch (error) {
        console.error('Error fetching occupations:', error);
      }
    };
    fetchOccupations();
  }, []);

  // Update household option effect
  useEffect(() => {
    if (householdOption === 'new') {
      setFormData(prev => ({ ...prev, householdNumber: newHouseholdNumber }));
    }
    // Note: We don't reset to empty when switching to 'existing' to preserve the selected household
  }, [householdOption, newHouseholdNumber]);

  // Check family head and wife
  useEffect(() => {
    const checkFamilyHeadAndWife = async () => {
      if (!formData.householdNumber) {
        setHasFamilyHead(false);
        setHasWife(false);
        return;
      }

      try {
        const snapshot = await getDocs(collection(db, 'residents'));
        const householdMembers = snapshot.docs.filter(
          doc => doc.data().householdNumber === formData.householdNumber && doc.id !== id
        );

        const hasFamilyHeadInHousehold = householdMembers.some(
          doc => doc.data().isFamilyHead === true
        );

        const hasWifeInHousehold = householdMembers.some(
          doc => doc.data().isWife === true
        );

        setHasFamilyHead(hasFamilyHeadInHousehold);
        setHasWife(hasWifeInHousehold);
      } catch (error) {
        console.error('Error checking family head and wife:', error);
      }
    };

    checkFamilyHeadAndWife();
  }, [formData.householdNumber, id]);

  // Update registered voter status when IDs change
  useEffect(() => {
    const hasValidId = formData.nationalIdFrontUrl || formData.nationalIdBackUrl || 
                      formData.votersIdFrontUrl || formData.votersIdBackUrl ||
                      nationalIdFront || nationalIdBack || votersIdFront || votersIdBack;
    setFormData(prev => ({
      ...prev,
      isRegisteredVoter: !!hasValidId
    }));
  }, [
    formData.nationalIdFrontUrl, 
    formData.nationalIdBackUrl, 
    formData.votersIdFrontUrl, 
    formData.votersIdBackUrl,
    nationalIdFront,
    nationalIdBack,
    votersIdFront,
    votersIdBack
  ]);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    } else if (!isValidName(formData.lastName)) {
      newErrors.lastName = 'Last name contains invalid characters or is too short';
    }

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    } else if (!isValidName(formData.firstName)) {
      newErrors.firstName = 'First name contains invalid characters or is too short';
    }

    if (formData.middleName && !isValidName(formData.middleName)) {
      newErrors.middleName = 'Middle name contains invalid characters';
    }

    if (!formData.sex) {
      newErrors.sex = 'Sex is required';
    }

    if (formData.isWife && formData.sex !== 'Female') {
      newErrors.isWife = 'Only females can be marked as wife';
    }

    if (!formData.birthday) {
      newErrors.birthday = 'Birthday is required';
    } else if (!isValidDate(formData.birthday)) {
      newErrors.birthday = 'Birthday cannot be in the future and must be a valid date';
    } else {
      const age = calculateAge(formData.birthday);
      if (age < 0) {
        newErrors.birthday = 'Birthday cannot be in the future';
      } else if (age > 150) {
        newErrors.birthday = 'Please enter a realistic birth date';
      }
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
    } else if (!isValidAddress(formData.address)) {
      newErrors.address = 'Address must be at least 10 characters and contain valid characters only';
    }

    if (formData.contactNumber && !isValidContactNumber(formData.contactNumber)) {
      newErrors.contactNumber = 'Please enter a valid Philippine mobile number (e.g., 09XX-XXX-XXXX)';
    }

    if (formData.movedInDate && !isValidDate(formData.movedInDate, true)) {
      newErrors.movedInDate = 'Moved in date cannot be in the future';
    }

    if (formData.birthday && formData.movedInDate) {
      const birthDate = new Date(formData.birthday);
      const movedDate = new Date(formData.movedInDate);
      if (movedDate < birthDate) {
        newErrors.movedInDate = 'Moved in date cannot be before birth date';
      }
    }

    if (!formData.householdNumber) {
      newErrors.householdNumber = 'Household number is required';
    }

    if (formData.religion && !isValidName(formData.religion)) {
      newErrors.religion = 'Religion contains invalid characters';
    }

    if (formData.occupation && formData.occupation.trim().length < 2) {
      newErrors.occupation = 'Occupation must be at least 2 characters long';
    }

    // Validate new ID files if provided
    if (nationalIdFront && !isValidImageFile(nationalIdFront)) {
      newErrors.nationalIdFrontUrl = 'National ID (Front) must be an image file (JPEG, PNG, GIF) and less than 5MB';
    }
    if (nationalIdBack && !isValidImageFile(nationalIdBack)) {
      newErrors.nationalIdBackUrl = 'National ID (Back) must be an image file (JPEG, PNG, GIF) and less than 5MB';
    }
    if (votersIdFront && !isValidImageFile(votersIdFront)) {
      newErrors.votersIdFrontUrl = 'Voter\'s ID (Front) must be an image file (JPEG, PNG, GIF) and less than 5MB';
    }
    if (votersIdBack && !isValidImageFile(votersIdBack)) {
      newErrors.votersIdBackUrl = 'Voter\'s ID (Back) must be an image file (JPEG, PNG, GIF) and less than 5MB';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = type === 'checkbox' && (e.target as HTMLInputElement).checked;

    let sanitizedValue = value;
    if (type === 'text' && ['lastName', 'firstName', 'middleName', 'religion'].includes(name)) {
      sanitizedValue = value.replace(/[^a-zA-ZñÑ\s\-\.\']/g, '');
    } else if (name === 'address') {
      sanitizedValue = value.replace(/[^a-zA-Z0-9ñÑ\s\-\.\,\#]/g, '');
    } else if (name === 'householdNumber') {
      sanitizedValue = value.replace(/[^a-zA-Z0-9\-]/g, '');
    } else if (name === 'contactNumber') {
      sanitizedValue = value.replace(/[^0-9\s\-\+]/g, '');
    }

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : sanitizedValue,
    }));

    if (errors[name as keyof FormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    const file = e.target.files?.[0] || null;

    switch (fieldName) {
      case 'nationalIdFront':
        setNationalIdFront(file);
        break;
      case 'nationalIdBack':
        setNationalIdBack(file);
        break;
      case 'votersIdFront':
        setVotersIdFront(file);
        break;
      case 'votersIdBack':
        setVotersIdBack(file);
        break;
    }

    if (errors[fieldName as keyof FormData]) {
      setErrors(prev => ({ ...prev, [fieldName]: undefined }));
    }
  };

  const handleRemoveExistingId = async (fieldName: string) => {
    console.log('🗑️ Removing existing ID:', fieldName);
    
    // Get the URL field name
    const urlFieldName = `${fieldName}Url` as keyof FormData;
    const imageUrl = formData[urlFieldName] as string | undefined;
    
    if (imageUrl) {
      try {
        console.log('🗑️ Deleting image from Supabase storage:', imageUrl);
        
        // Delete from Supabase storage using the full URL
        await deleteImage(imageUrl, 'resident-ids');
        
        console.log('✅ Image deleted from storage');
      } catch (error) {
        console.error('❌ Error deleting image from storage:', error);
        // Continue anyway - we'll still remove the URL from the database
      }
    }
    
    // Clear the URL field in formData
    setFormData(prev => ({
      ...prev,
      [urlFieldName]: undefined
    }));
    
    console.log('Removed:', urlFieldName);
  };

  const handleRemoveNewFile = (fieldName: string) => {
    console.log('🗑️ Removing new file:', fieldName);
    
    switch (fieldName) {
      case 'nationalIdFront':
        setNationalIdFront(null);
        break;
      case 'nationalIdBack':
        setNationalIdBack(null);
        break;
      case 'votersIdFront':
        setVotersIdFront(null);
        break;
      case 'votersIdBack':
        setVotersIdBack(null);
        break;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSaving(true);
    setUploadingIds(true);

    try {
      // Upload new ID images if provided
      let updatedIdUrls: any = {};

      if (nationalIdFront) {
        console.log('📤 Uploading National ID (Front)...');
        updatedIdUrls.nationalIdFrontUrl = await uploadImage(nationalIdFront, 'resident-ids', 'national-ids/front');
        console.log('✅ National ID (Front) uploaded');
      }

      if (nationalIdBack) {
        console.log('📤 Uploading National ID (Back)...');
        updatedIdUrls.nationalIdBackUrl = await uploadImage(nationalIdBack, 'resident-ids', 'national-ids/back');
        console.log('✅ National ID (Back) uploaded');
      }

      if (votersIdFront) {
        console.log('📤 Uploading Voter\'s ID (Front)...');
        updatedIdUrls.votersIdFrontUrl = await uploadImage(votersIdFront, 'resident-ids', 'voters-ids/front');
        console.log('✅ Voter\'s ID (Front) uploaded');
      }

      if (votersIdBack) {
        console.log('📤 Uploading Voter\'s ID (Back)...');
        updatedIdUrls.votersIdBackUrl = await uploadImage(votersIdBack, 'resident-ids', 'voters-ids/back');
        console.log('✅ Voter\'s ID (Back) uploaded');
      }

      setUploadingIds(false);

      // Build update data
      const updateData: any = {
        lastName: formData.lastName.trim(),
        firstName: formData.firstName.trim(),
        middleName: formData.middleName.trim(),
        sex: formData.sex,
        birthday: formData.birthday,
        occupation: formData.occupation.trim(),
        status: formData.status,
        address: formData.address.trim(),
        contactNumber: formData.contactNumber.trim(),
        education: formData.education,
        religion: formData.religion.trim(),
        householdNumber: formData.householdNumber.trim(),
        isFamilyHead: formData.isFamilyHead,
        isWife: formData.isWife,
        movedInDate: formData.movedInDate || new Date().toISOString().split('T')[0],
      };

      // Add existing or new ID URLs
      if (updatedIdUrls.nationalIdFrontUrl) {
        updateData.nationalIdFrontUrl = updatedIdUrls.nationalIdFrontUrl;
      } else if (formData.nationalIdFrontUrl !== undefined) {
        updateData.nationalIdFrontUrl = formData.nationalIdFrontUrl || null;
      }

      if (updatedIdUrls.nationalIdBackUrl) {
        updateData.nationalIdBackUrl = updatedIdUrls.nationalIdBackUrl;
      } else if (formData.nationalIdBackUrl !== undefined) {
        updateData.nationalIdBackUrl = formData.nationalIdBackUrl || null;
      }

      if (updatedIdUrls.votersIdFrontUrl) {
        updateData.votersIdFrontUrl = updatedIdUrls.votersIdFrontUrl;
      } else if (formData.votersIdFrontUrl !== undefined) {
        updateData.votersIdFrontUrl = formData.votersIdFrontUrl || null;
      }

      if (updatedIdUrls.votersIdBackUrl) {
        updateData.votersIdBackUrl = updatedIdUrls.votersIdBackUrl;
      } else if (formData.votersIdBackUrl !== undefined) {
        updateData.votersIdBackUrl = formData.votersIdBackUrl || null;
      }

      // Determine if registered voter
      const hasNationalId = updateData.nationalIdFrontUrl || updateData.nationalIdBackUrl;
      const hasVotersId = updateData.votersIdFrontUrl || updateData.votersIdBackUrl;
      updateData.isRegisteredVoter = !!(hasNationalId || hasVotersId);

      console.log('💾 Updating resident in Firestore:', updateData);
      await updateDoc(doc(db, 'residents', id!), updateData);

      console.log('✅ Done!');
      
      const voterMessage = updateData.isRegisteredVoter ? ' Classified as registered voter.' : '';
      alert('✅ Resident updated successfully!' + voterMessage);

      navigate('/residents');

    } catch (error: any) {
      console.error('❌ Error:', error);
      
      let errorMessage = 'Failed to update resident: ';
      if (error.message?.includes('storage') || error.message?.includes('upload')) {
        errorMessage += 'Image upload failed. Check console for details.';
      } else {
        errorMessage += (error.message || 'Unknown error');
      }
      
      alert('❌ ' + errorMessage);
    } finally {
      setSaving(false);
      setUploadingIds(false);
    }
  };

  const handleCancel = () => {
    navigate('/residents');
  };

  const renderField = (label: string, name: keyof FormData, type: string = 'text', required: boolean = false, placeholder?: string) => (
    <div style={styles.fieldGroup}>
      <label style={styles.label}>
        {label} {required && <span style={styles.required}>*</span>}
      </label>
      <input
        type={type}
        name={name}
        value={formData[name] as string}
        onChange={handleChange}
        style={{
          ...styles.input,
          ...(errors[name] ? styles.inputError : {})
        }}
        required={required}
        placeholder={placeholder || `Enter ${label.toLowerCase()}`}
        max={type === 'date' ? new Date().toISOString().split('T')[0] : undefined}
      />
      {errors[name] && <span style={styles.errorText}>{errors[name]}</span>}
    </div>
  );

  const renderSelect = (label: string, name: keyof FormData, options: string[], required: boolean = false, placeholder: string = 'Select...') => (
    <div style={styles.fieldGroup}>
      <label style={styles.label}>
        {label} {required && <span style={styles.required}>*</span>}
      </label>
      <select
        name={name}
        value={formData[name] as string}
        onChange={handleChange}
        style={{
          ...styles.input,
          ...(errors[name] ? styles.inputError : {})
        }}
        required={required}
      >
        <option value="">{placeholder}</option>
        {options.map((option, idx) => (
          <option key={idx} value={option}>{option}</option>
        ))}
      </select>
      {errors[name] && <span style={styles.errorText}>{errors[name]}</span>}
    </div>
  );

  const renderFileInput = (label: string, fieldName: string, existingUrl?: string) => (
    <div style={styles.fieldGroup}>
      <label style={styles.label}>{label}</label>
      
      {/* Show existing ID if available */}
      {existingUrl && (
        <div style={styles.existingIdContainer}>
          <div style={styles.existingIdPreview}>
            <img src={existingUrl} alt={label} style={styles.existingIdImage} />
          </div>
          <div style={styles.existingIdActions}>
            <span style={styles.existingIdLabel}>✅ Current ID uploaded</span>
            <button
              type="button"
              onClick={async () => await handleRemoveExistingId(fieldName)}
              style={styles.removeExistingButton}
            >
              🗑️ Remove
            </button>
          </div>
        </div>
      )}

      {/* Upload new file */}
      <input
        type="file"
        accept="image/*"
        onChange={(e) => handleFileChange(e, fieldName)}
        style={{
          ...styles.fileInput,
          ...(errors[fieldName as keyof FormData] ? styles.inputError : {})
        }}
      />
      
      {/* Show new file preview */}
      {(() => {
        let file: File | null = null;
        if (fieldName === 'nationalIdFront') file = nationalIdFront;
        if (fieldName === 'nationalIdBack') file = nationalIdBack;
        if (fieldName === 'votersIdFront') file = votersIdFront;
        if (fieldName === 'votersIdBack') file = votersIdBack;

        return file && (
          <div style={styles.filePreview}>
            <span style={styles.fileName}>📎 New: {file.name}</span>
            <button
              type="button"
              onClick={() => handleRemoveNewFile(fieldName)}
              style={styles.removeFileButton}
            >
              ❌
            </button>
          </div>
        );
      })()}
      
      {errors[fieldName as keyof FormData] && (
        <span style={styles.errorText}>{errors[fieldName as keyof FormData]}</span>
      )}
      <small style={styles.fileHint}>
        {existingUrl ? 'Upload new image to replace existing' : 'Upload image file (JPEG, PNG, GIF) - Max 5MB'}
      </small>
    </div>
  );

  if (loading) {
    return (
      <div style={styles.container}>
        <Sidebar />
        <div style={styles.mainContent}>
          <div style={styles.loadingContainer}>
            <div style={styles.spinner}></div>
            <p style={styles.loadingText}>Loading resident data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <Sidebar />
      <div style={styles.mainContent}>
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={styles.breadcrumb}>
              <span style={styles.breadcrumbItem} onClick={() => navigate('/residents')}>
                Residents
              </span>
              <span style={styles.breadcrumbSeparator}>›</span>
              <span style={styles.breadcrumbActive}>Edit Resident</span>
            </div>
            <h1 style={styles.pageTitle}>✏️ Edit Resident</h1>
            <p style={styles.pageSubtitle}>Update resident information and household details</p>
          </div>
          <LogoutButton />
        </div>

        <div style={styles.formContainer}>
          <form onSubmit={handleSubmit} style={styles.form}>
            {/* Personal Information Section */}
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>
                <span style={styles.sectionIcon}>👤</span>
                Personal Information
              </h3>

              <div style={styles.row}>
                {renderField('Last Name', 'lastName', 'text', true)}
                {renderField('First Name', 'firstName', 'text', true)}
                {renderField('Middle Name', 'middleName')}
              </div>

              <div style={styles.row}>
                {renderSelect('Sex', 'sex', ['Male', 'Female', 'Other'], true)}
                {renderField('Birthday', 'birthday', 'date', true)}
                {renderSelect('Civil Status', 'status', civilStatuses)}
              </div>
            </div>

            {/* Contact & Address Section */}
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>
                <span style={styles.sectionIcon}>📍</span>
                Address & Contact
              </h3>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>
                  Address <span style={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  style={{
                    ...styles.input,
                    ...(errors.address ? styles.inputError : {})
                  }}
                  required
                  placeholder="Enter complete address (minimum 10 characters)"
                />
                {errors.address && <span style={styles.errorText}>{errors.address}</span>}
              </div>

              <div style={styles.row}>
                {renderField('Contact Number', 'contactNumber', 'tel', false, '09XX-XXX-XXXX')}
              </div>
            </div>

            {/* Education & Occupation Section */}
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>
                <span style={styles.sectionIcon}>🎓</span>
                Education & Occupation
              </h3>

              <div style={styles.row}>
                {renderSelect('Highest Educational Attainment', 'education', educationLevels)}
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Religion</label>
                  <input
                    type="text"
                    name="religion"
                    value={formData.religion}
                    onChange={handleChange}
                    style={{
                      ...styles.input,
                      ...(errors.religion ? styles.inputError : {})
                    }}
                    placeholder="Enter religion"
                  />
                  {errors.religion && <span style={styles.errorText}>{errors.religion}</span>}
                </div>
              </div>

              {/* Occupation Field */}
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Occupation</label>
                <select
                  name="occupation"
                  value={isCustomOccupation ? 'Other' : formData.occupation}
                  onChange={(e) => {
                    const selected = e.target.value;
                    if (selected === 'Other') {
                      setIsCustomOccupation(true);
                      setFormData(prev => ({ ...prev, occupation: customOccupation }));
                    } else {
                      setIsCustomOccupation(false);
                      setFormData(prev => ({ ...prev, occupation: selected }));
                      setCustomOccupation('');
                    }
                  }}
                  style={styles.input}
                >
                  <option value="">Select occupation (optional)</option>
                  {occupations.map((occ, idx) => (
                    <option key={idx} value={occ}>{occ}</option>
                  ))}
                  <option value="Other">Other (specify)</option>
                </select>

                {isCustomOccupation && (
                  <input
                    type="text"
                    placeholder="Please specify your occupation (minimum 2 characters)"
                    value={customOccupation}
                    onChange={(e) => {
                      const value = e.target.value;
                      setCustomOccupation(value);
                      setFormData(prev => ({ ...prev, occupation: value }));
                    }}
                    style={{ ...styles.input, marginTop: '8px' }}
                  />
                )}
                {errors.occupation && <span style={styles.errorText}>{errors.occupation}</span>}
              </div>
            </div>

            {/* Household Information Section */}
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>
                <span style={styles.sectionIcon}>🏠</span>
                Household Information
              </h3>

              <div style={styles.row}>
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>
                    Household Assignment <span style={styles.required}>*</span>
                  </label>
                  
                  <div style={styles.radioGroup}>
                    <label style={styles.radioLabel}>
                      <input
                        type="radio"
                        name="householdOption"
                        value="new"
                        checked={householdOption === 'new'}
                        onChange={(e) => setHouseholdOption(e.target.value as 'new' | 'existing')}
                        style={styles.radioInput}
                      />
                      <span style={styles.radioText}>
                        🆕 Create New Household
                        {householdOption === 'new' && (
                          <span style={styles.autoNumber}>({newHouseholdNumber})</span>
                        )}
                      </span>
                    </label>
                    
                    <label style={styles.radioLabel}>
                      <input
                        type="radio"
                        name="householdOption"
                        value="existing"
                        checked={householdOption === 'existing'}
                        onChange={(e) => setHouseholdOption(e.target.value as 'new' | 'existing')}
                        style={styles.radioInput}
                      />
                      <span style={styles.radioText}>
                        🏠 Join Official Household
                        {households.length === 0 && (
                          <span style={styles.warningText}> (No official households yet)</span>
                        )}
                      </span>
                    </label>
                  </div>

                  {householdOption === 'new' ? (
                    <div style={styles.householdDisplay}>
                      <input
                        type="text"
                        value={formData.householdNumber}
                        readOnly
                        style={{
                          ...styles.input,
                          ...styles.readOnlyInput
                        }}
                        placeholder="Auto-generated household number"
                      />
                      <small style={styles.householdHint}>
                        ✨ Household number will be automatically assigned: <strong>{newHouseholdNumber}</strong>
                      </small>
                    </div>
                  ) : (
                    <>
                      <select
                        value={formData.householdNumber}
                        onChange={(e) => setFormData(prev => ({ ...prev, householdNumber: e.target.value }))}
                        style={{
                          ...styles.input,
                          ...(errors.householdNumber ? styles.inputError : {})
                        }}
                      >
                        <option value="">Select official household</option>
                        {households.map((household, idx) => (
                          <option key={idx} value={household.number}>
                            {household.name} ({household.number}) - {household.purok}
                          </option>
                        ))}
                      </select>
                      {households.length === 0 && (
                        <small style={styles.infoText}>
                          ℹ️ No official households available. Please create a household first from the <strong>Add Household</strong> page, or choose "Create New Household" above.
                        </small>
                      )}
                    </>
                  )}
                  {errors.householdNumber && <span style={styles.errorText}>{errors.householdNumber}</span>}
                </div>

                {renderField('Date Moved In', 'movedInDate', 'date')}
              </div>

              <div style={styles.checkboxRow}>
                <div style={styles.checkboxContainer}>
                  <input
                    type="checkbox"
                    name="isFamilyHead"
                    id="isFamilyHead"
                    checked={formData.isFamilyHead}
                    onChange={handleChange}
                    disabled={hasFamilyHead}
                    style={styles.checkbox}
                  />
                  <label htmlFor="isFamilyHead" style={styles.checkboxLabel}>
                    Family Head
                    {hasFamilyHead && <span style={styles.note}> (Already assigned to this household)</span>}
                  </label>
                </div>

                <div style={styles.checkboxContainer}>
                  <input
                    type="checkbox"
                    name="isWife"
                    id="isWife"
                    checked={formData.isWife}
                    onChange={handleChange}
                    disabled={hasWife || formData.sex !== 'Female'}
                    style={styles.checkbox}
                  />
                  <label htmlFor="isWife" style={styles.checkboxLabel}>
                    Wife
                    {hasWife && <span style={styles.note}> (Already assigned to this household)</span>}
                    {formData.sex !== 'Female' && formData.sex && <span style={styles.note}> (Only for females)</span>}
                  </label>
                  {errors.isWife && <span style={styles.errorText}>{errors.isWife}</span>}
                </div>
              </div>
            </div>

            {/* ID Documents Section */}
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>
                <span style={styles.sectionIcon}>🆔</span>
                ID Documents
                {formData.isRegisteredVoter && (
                  <span style={styles.voterBadge}>✅ Registered Voter</span>
                )}
              </h3>
              <p style={styles.sectionDescription}>
                Upload or update front and back photos of National ID or Voter's ID
              </p>

              {/* National ID Section */}
              <div style={styles.idSection}>
                <h4 style={styles.idSectionTitle}>🪪 National ID</h4>
                <div style={styles.row}>
                  {renderFileInput('Front Photo', 'nationalIdFront', formData.nationalIdFrontUrl)}
                  {renderFileInput('Back Photo', 'nationalIdBack', formData.nationalIdBackUrl)}
                </div>
              </div>

              {/* Voter's ID Section */}
              <div style={styles.idSection}>
                <h4 style={styles.idSectionTitle}>🗳️ Voter's ID</h4>
                <div style={styles.row}>
                  {renderFileInput('Front Photo', 'votersIdFront', formData.votersIdFrontUrl)}
                  {renderFileInput('Back Photo', 'votersIdBack', formData.votersIdBackUrl)}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div style={styles.submitSection}>
              <button
                type="button"
                onClick={handleCancel}
                style={styles.cancelButton}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  ...styles.submitButton,
                  ...(saving ? styles.submitButtonDisabled : {})
                }}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <span style={styles.spinner}>⏳</span>
                    {uploadingIds ? 'Uploading Images...' : 'Updating Resident...'}
                  </>
                ) : (
                  <>
                    <span style={styles.buttonIcon}>💾</span>
                    Update Resident
                    {formData.isRegisteredVoter && <span style={styles.voterText}> (as Registered Voter)</span>}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
  },
  mainContent: {
    marginLeft: '260px',
    flex: 1,
    padding: '0',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    padding: '30px 40px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  },
  headerLeft: {
    flex: 1,
  },
  breadcrumb: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '8px',
    fontSize: '14px',
    opacity: 0.8,
  },
  breadcrumbItem: {
    color: 'rgba(255, 255, 255, 0.9)',
    cursor: 'pointer',
    transition: 'opacity 0.2s ease',
  },
  breadcrumbSeparator: {
    margin: '0 8px',
    color: 'rgba(255, 255, 255, 0.5)',
  },
  breadcrumbActive: {
    color: 'white',
    fontWeight: '500',
  },
  pageTitle: {
    margin: '0 0 8px 0',
    fontSize: '28px',
    fontWeight: '600',
  },
  pageSubtitle: {
    margin: '0',
    fontSize: '16px',
    opacity: 0.8,
    fontWeight: '300',
  },
  formContainer: {
    flex: 1,
    padding: '40px',
    maxWidth: '1000px',
    margin: '0 auto',
    width: '100%',
  },
  form: {
    background: 'white',
    borderRadius: '16px',
    padding: '40px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.1)',
    border: '1px solid #e2e8f0',
  },
  section: {
    marginBottom: '40px',
    paddingBottom: '30px',
    borderBottom: '1px solid #e2e8f0',
  },
  sectionTitle: {
    display: 'flex',
    alignItems: 'center',
    margin: '0 0 24px 0',
    fontSize: '18px',
    fontWeight: '600',
    color: '#2d3748',
  },
  sectionIcon: {
    marginRight: '12px',
    fontSize: '20px',
  },
  sectionDescription: {
    fontSize: '14px',
    color: '#64748b',
    margin: '0 0 20px 0',
  },
  idSection: {
    marginTop: '24px',
    padding: '20px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
  },
  idSectionTitle: {
    margin: '0 0 16px 0',
    fontSize: '16px',
    fontWeight: '600',
    color: '#374151',
  },
  row: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '20px',
    marginBottom: '20px',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    fontWeight: '600',
    marginBottom: '6px',
    color: '#374151',
    fontSize: '14px',
  },
  required: {
    color: '#ef4444',
    marginLeft: '2px',
  },
  input: {
    padding: '12px 16px',
    fontSize: '14px',
    borderRadius: '8px',
    border: '2px solid #e2e8f0',
    backgroundColor: '#ffffff',
    transition: 'all 0.2s ease',
    outline: 'none',
  },
  inputError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  errorText: {
    color: '#ef4444',
    fontSize: '12px',
    marginTop: '4px',
    fontWeight: '500',
  },
  infoText: {
    fontSize: '12px',
    color: '#3b82f6',
    marginTop: '8px',
    display: 'block',
    lineHeight: '1.5',
  },
  radioGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '16px',
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    border: '2px solid #e2e8f0',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  radioInput: {
    marginRight: '10px',
    width: '18px',
    height: '18px',
    accentColor: '#667eea',
    cursor: 'pointer',
  },
  radioText: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
  },
  autoNumber: {
    marginLeft: '8px',
    color: '#667eea',
    fontWeight: '600',
  },
  warningText: {
    marginLeft: '8px',
    color: '#f59e0b',
    fontWeight: '500',
    fontSize: '12px',
  },
  householdDisplay: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  householdHint: {
    fontSize: '12px',
    color: '#64748b',
    fontStyle: 'italic',
  },
  readOnlyInput: {
    backgroundColor: '#f1f5f9',
    cursor: 'not-allowed',
  },
  checkboxRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '16px',
  },
  checkboxContainer: {
    display: 'flex',
    alignItems: 'center',
    marginTop: '16px',
    padding: '16px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    marginRight: '12px',
    accentColor: '#667eea',
  },
  checkboxLabel: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    cursor: 'pointer',
  },
  note: {
    color: '#6b7280',
    fontStyle: 'italic',
    fontWeight: '400',
  },
  fileInput: {
    padding: '10px',
    fontSize: '14px',
    borderRadius: '8px',
    border: '2px solid #e2e8f0',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
  },
  existingIdContainer: {
    marginBottom: '12px',
    padding: '12px',
    backgroundColor: '#f0fdf4',
    borderRadius: '8px',
    border: '1px solid #bbf7d0',
  },
  existingIdPreview: {
    marginBottom: '8px',
  },
  existingIdImage: {
    maxWidth: '200px',
    maxHeight: '150px',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
    objectFit: 'cover',
  },
  existingIdActions: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  existingIdLabel: {
    fontSize: '13px',
    color: '#166534',
    fontWeight: '500',
  },
  removeExistingButton: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '13px',
    color: '#dc2626',
    padding: '4px 8px',
    fontWeight: '500',
  },
  filePreview: {
    marginTop: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    backgroundColor: '#eff6ff',
    borderRadius: '6px',
    border: '1px solid #bfdbfe',
  },
  fileName: {
    fontSize: '13px',
    color: '#1e40af',
  },
  removeFileButton: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    padding: '4px',
  },
  fileHint: {
    marginTop: '4px',
    fontSize: '12px',
    color: '#64748b',
  },
  voterBadge: {
    marginLeft: '12px',
    padding: '4px 12px',
    backgroundColor: '#dcfce7',
    color: '#166534',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '500',
  },
  submitSection: {
    paddingTop: '30px',
    borderTop: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
  },
  cancelButton: {
    padding: '16px 32px',
    fontSize: '16px',
    fontWeight: '600',
    border: '2px solid #e2e8f0',
    borderRadius: '10px',
    backgroundColor: '#ffffff',
    color: '#6b7280',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  submitButton: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    padding: '16px 32px',
    fontSize: '16px',
    fontWeight: '600',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
    minWidth: '200px',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.7,
    cursor: 'not-allowed',
    transform: 'none',
  },
  buttonIcon: {
    marginRight: '8px',
    fontSize: '16px',
  },
  voterText: {
    fontSize: '13px',
    opacity: 0.9,
  },
  spinner: {
    marginRight: '8px',
    animation: 'spin 1s linear infinite',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '60vh',
  },
  loadingText: {
    marginTop: '16px',
    color: '#64748b',
    fontSize: '16px',
    fontWeight: '500',
  },
};

// Add CSS animation
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);

export default EditResident;