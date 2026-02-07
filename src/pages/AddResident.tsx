import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import LogoutButton from '../components/LogoutButton';
import { db } from '../Database/firebase';  
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { migrateResidentsToNumericalIds } from '../Database/migration';
import { uploadImage } from '../Database/supabaseClient';

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
    nationalIdFront: File | null;
    nationalIdBack: File | null;
    votersIdFront: File | null;
    votersIdBack: File | null;
    isRegisteredVoter: boolean;
}

const AddResident: React.FC = () => {
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
        nationalIdFront: null,
        nationalIdBack: null,
        votersIdFront: null,
        votersIdBack: null,
        isRegisteredVoter: false
    });

    const navigate = useNavigate();
    const [households, setHouseholds] = useState<string[]>([]);
    const [hasFamilyHead, setHasFamilyHead] = useState(false);
    const [hasWife, setHasWife] = useState(false);
    const [occupations, setOccupations] = useState<string[]>([]);
    const [customOccupation, setCustomOccupation] = useState('');
    const [isCustomOccupation, setIsCustomOccupation] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
    const [householdOption, setHouseholdOption] = useState<'new' | 'existing'>('existing');

    //upload state for supabase 
    const [uploadingIds, setUploadingIds] = useState(false);

    // Household selection state
    const [isNewHousehold, setIsNewHousehold] = useState(false);
    const [newHouseholdNumber, setNewHouseholdNumber] = useState('');
    const [allHouseholdNumbers, setAllHouseholdNumbers] = useState<string[]>([]);

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

    const handleHouseholdSelection = (value: string) => {
        if (value === 'new') {
            setIsNewHousehold(true);
            setFormData(prev => ({ ...prev, householdNumber: newHouseholdNumber }));
        } else {
            setIsNewHousehold(false);
            setFormData(prev => ({ ...prev, householdNumber: value }));
        }
    };

    // Update household option effect
    useEffect(() => {
        if (householdOption === 'new') {
            setFormData(prev => ({ ...prev, householdNumber: newHouseholdNumber }));
        } else {
            setFormData(prev => ({ ...prev, householdNumber: '' }));
        }
    }, [householdOption, newHouseholdNumber]);

    // Predefined options for better UX
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

    // Helper functions for validation
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

        if (isMovedInDate) {
            const minDate = new Date('1900-01-01');
            return date >= minDate && date <= today;
        } else {
            const minDate = new Date('1900-01-01');
            return date >= minDate && date <= today;
        }
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

    const isValidHouseholdNumber = (householdNum: string): boolean => {
        if (!householdNum) return true;
        return /^[A-Z0-9\-]+$/i.test(householdNum.trim());
    };

    const isValidImageFile = (file: File): boolean => {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
        const maxSize = 5 * 1024 * 1024;

        return allowedTypes.includes(file.type) && file.size <= maxSize;
    };

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
                    doc => doc.data().householdNumber === formData.householdNumber
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
    }, [formData.householdNumber]);

    useEffect(() => {
        const fetchHouseholds = async () => {
            try {
                const householdSnapshot = await getDocs(collection(db, 'households'));
                const officialHouseholds = householdSnapshot.docs.map(doc => doc.data().householdNumber);
                
                const residentsSnapshot = await getDocs(collection(db, 'residents'));
                const residentHouseholds = residentsSnapshot.docs
                    .map(doc => doc.data().householdNumber)
                    .filter(Boolean);

                const allNumbers = [...officialHouseholds, ...residentHouseholds];
                const uniqueNumbers = Array.from(new Set(allNumbers)).sort((a, b) => 
                    a.localeCompare(b, undefined, { numeric: true })
                );

                setAllHouseholdNumbers(uniqueNumbers);
                setHouseholds(uniqueNumbers);

                const nextNumber = generateNextHouseholdNumber(uniqueNumbers);
                setNewHouseholdNumber(nextNumber);
                
            } catch (error) {
                console.error('Error fetching households:', error);
            }
        };
        fetchHouseholds();
    }, []);

    useEffect(() => {
        const hasValidId = formData.nationalIdFront || formData.nationalIdBack || 
                          formData.votersIdFront || formData.votersIdBack;
        setFormData(prev => ({
            ...prev,
            isRegisteredVoter: !!hasValidId
        }));
    }, [formData.nationalIdFront, formData.nationalIdBack, formData.votersIdFront, formData.votersIdBack]);

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
        } else if (!isValidHouseholdNumber(formData.householdNumber)) {
            newErrors.householdNumber = 'Household number contains invalid characters';
        }

        if (formData.religion && !isValidName(formData.religion)) {
            newErrors.religion = 'Religion contains invalid characters';
        }

        if (formData.occupation && formData.occupation.trim().length < 2) {
            newErrors.occupation = 'Occupation must be at least 2 characters long';
        }

        // Validate ID files
        if (formData.nationalIdFront && !isValidImageFile(formData.nationalIdFront)) {
            newErrors.nationalIdFront = 'National ID (Front) must be an image file (JPEG, PNG, GIF) and less than 5MB';
        }
        if (formData.nationalIdBack && !isValidImageFile(formData.nationalIdBack)) {
            newErrors.nationalIdBack = 'National ID (Back) must be an image file (JPEG, PNG, GIF) and less than 5MB';
        }
        if (formData.votersIdFront && !isValidImageFile(formData.votersIdFront)) {
            newErrors.votersIdFront = 'Voter\'s ID (Front) must be an image file (JPEG, PNG, GIF) and less than 5MB';
        }
        if (formData.votersIdBack && !isValidImageFile(formData.votersIdBack)) {
            newErrors.votersIdBack = 'Voter\'s ID (Back) must be an image file (JPEG, PNG, GIF) and less than 5MB';
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

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: keyof FormData) => {
        const file = e.target.files?.[0] || null;

        setFormData(prev => ({
            ...prev,
            [fieldName]: file
        }));

        if (errors[fieldName]) {
            setErrors(prev => ({ ...prev, [fieldName]: undefined }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);
        setUploadingIds(true);

        try {
            // Upload all ID images to Supabase
            let nationalIdFrontUrl: string | null = null;
            let nationalIdBackUrl: string | null = null;
            let votersIdFrontUrl: string | null = null;
            let votersIdBackUrl: string | null = null;

            if (formData.nationalIdFront) {
                console.log('📤 Uploading National ID (Front)...');
                nationalIdFrontUrl = await uploadImage(formData.nationalIdFront, 'resident-ids', 'national-ids/front');
                console.log('✅ National ID (Front) uploaded:', nationalIdFrontUrl);
            }

            if (formData.nationalIdBack) {
                console.log('📤 Uploading National ID (Back)...');
                nationalIdBackUrl = await uploadImage(formData.nationalIdBack, 'resident-ids', 'national-ids/back');
                console.log('✅ National ID (Back) uploaded:', nationalIdBackUrl);
            }

            if (formData.votersIdFront) {
                console.log('📤 Uploading Voter\'s ID (Front)...');
                votersIdFrontUrl = await uploadImage(formData.votersIdFront, 'resident-ids', 'voters-ids/front');
                console.log('✅ Voter\'s ID (Front) uploaded:', votersIdFrontUrl);
            }

            if (formData.votersIdBack) {
                console.log('📤 Uploading Voter\'s ID (Back)...');
                votersIdBackUrl = await uploadImage(formData.votersIdBack, 'resident-ids', 'voters-ids/back');
                console.log('✅ Voter\'s ID (Back) uploaded:', votersIdBackUrl);
            }

            setUploadingIds(false);

            // Build finalData object manually (NO spreading formData to avoid File objects)
            const finalData: any = {
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
                createdAt: new Date().toISOString(),
            };

            // Add ID URLs only if they exist
            if (nationalIdFrontUrl) {
                finalData.nationalIdFrontUrl = nationalIdFrontUrl;
            }
            if (nationalIdBackUrl) {
                finalData.nationalIdBackUrl = nationalIdBackUrl;
            }
            if (votersIdFrontUrl) {
                finalData.votersIdFrontUrl = votersIdFrontUrl;
            }
            if (votersIdBackUrl) {
                finalData.votersIdBackUrl = votersIdBackUrl;
            }

            // Determine if registered voter
            const hasNationalId = nationalIdFrontUrl || nationalIdBackUrl;
            const hasVotersId = votersIdFrontUrl || votersIdBackUrl;
            finalData.isRegisteredVoter = !!(hasNationalId || hasVotersId);
            
            if (finalData.isRegisteredVoter) {
                finalData.voterRegistrationDate = new Date().toISOString();
            }

            console.log('💾 Saving to Firestore:', finalData);
            await addDoc(collection(db, 'residents'), finalData);

            console.log('🔄 Assigning numerical IDs...');
            await migrateResidentsToNumericalIds();
            console.log('✅ Done!');

            // Reset form
            setFormData({
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
                nationalIdFront: null,
                nationalIdBack: null,
                votersIdFront: null,
                votersIdBack: null,
                isRegisteredVoter: false
            });
            setCustomOccupation('');
            setIsCustomOccupation(false);
            setErrors({});

            const voterMessage = finalData.isRegisteredVoter ? ' Classified as registered voter.' : '';
            alert('✅ Resident added successfully!' + voterMessage + ' Numerical IDs have been assigned.');

            navigate('/residents');

        } catch (error: any) {
            console.error('❌ Error:', error);
            console.error('Stack:', error.stack);
            
            let errorMessage = 'Failed to add resident: ';
            if (error.message?.includes('storage') || error.message?.includes('upload')) {
                errorMessage += 'Image upload failed. Check console for details.';
            } else if (error.message?.includes('invalid data') || error.message?.includes('Unsupported field')) {
                errorMessage += 'Invalid data: ' + error.message;
            } else {
                errorMessage += (error.message || 'Unknown error');
            }
            
            alert('❌ ' + errorMessage);
        } finally {
            setIsSubmitting(false);
            setUploadingIds(false);
        }
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

    const renderFileInput = (label: string, name: keyof FormData) => (
        <div style={styles.fieldGroup}>
            <label style={styles.label}>{label}</label>
            <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange(e, name)}
                style={{
                    ...styles.fileInput,
                    ...(errors[name] ? styles.inputError : {})
                }}
            />
            {formData[name] && (
                <div style={styles.filePreview}>
                    <span style={styles.fileName}>📎 {(formData[name] as File)?.name}</span>
                    <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, [name]: null }))}
                        style={styles.removeFileButton}
                    >
                        ❌
                    </button>
                </div>
            )}
            {errors[name] && <span style={styles.errorText}>{errors[name]}</span>}
            <small style={styles.fileHint}>Upload image file (JPEG, PNG, GIF) - Max 5MB</small>
        </div>
    );

    return (
        <div style={styles.container}>
            <Sidebar />
            <div style={styles.mainContent}>
                <div style={styles.header}>
                    <div style={styles.headerLeft}>
                        <div style={styles.breadcrumb}>
                            <span style={styles.breadcrumbItem}>Residents</span>
                            <span style={styles.breadcrumbSeparator}>›</span>
                            <span style={styles.breadcrumbActive}>Add New Resident</span>
                        </div>
                        <h1 style={styles.pageTitle}>👤 Add New Resident</h1>
                        <p style={styles.pageSubtitle}>Register a new resident in the barangay system</p>
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
                                                🏠 Join Existing Household
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
                                        <select
                                            value={formData.householdNumber}
                                            onChange={(e) => setFormData(prev => ({ ...prev, householdNumber: e.target.value }))}
                                            style={{
                                                ...styles.input,
                                                ...(errors.householdNumber ? styles.inputError : {})
                                            }}
                                        >
                                            <option value="">Select existing household</option>
                                            {households.map((num, idx) => (
                                                <option key={idx} value={num}>{num}</option>
                                            ))}
                                        </select>
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
                                Upload front and back photos of National ID or Voter's ID to automatically classify as registered voter
                            </p>

                            {/* National ID Section */}
                            <div style={styles.idSection}>
                                <h4 style={styles.idSectionTitle}>🪪 National ID</h4>
                                <div style={styles.row}>
                                    {renderFileInput('Front Photo', 'nationalIdFront')}
                                    {renderFileInput('Back Photo', 'nationalIdBack')}
                                </div>
                            </div>

                            {/* Voter's ID Section */}
                            <div style={styles.idSection}>
                                <h4 style={styles.idSectionTitle}>🗳️ Voter's ID</h4>
                                <div style={styles.row}>
                                    {renderFileInput('Front Photo', 'votersIdFront')}
                                    {renderFileInput('Back Photo', 'votersIdBack')}
                                </div>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div style={styles.submitSection}>
                            <button
                                type="submit"
                                style={{
                                    ...styles.submitButton,
                                    ...(isSubmitting ? styles.submitButtonDisabled : {})
                                }}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <>
                                        <span style={styles.spinner}>⏳</span>
                                        {uploadingIds ? 'Uploading Images...' : 'Adding Resident...'}
                                    </>
                                ) : (
                                    <>
                                        <span style={styles.buttonIcon}>✅</span>
                                        Add Resident
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
        color: 'rgba(255, 255, 255, 0.7)',
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
    filePreview: {
        marginTop: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 12px',
        backgroundColor: '#f0fdf4',
        borderRadius: '6px',
        border: '1px solid #bbf7d0',
    },
    fileName: {
        fontSize: '13px',
        color: '#166534',
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
        justifyContent: 'center',
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
};

export default AddResident;