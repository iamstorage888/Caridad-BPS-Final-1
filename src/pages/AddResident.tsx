import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import LogoutButton from '../components/LogoutButton';
import { db } from '../Database/firebase';  
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { migrateResidentsToNumericalIds } from '../Database/migration'; // Import the migration function

interface FormData {
    lastName: string;
    firstName: string;
    middleName: string;
    sex: string;
    birthday: string;
    occupation: string;
    status: string;
    address: string;
    education: string;
    religion: string;
    householdNumber: string;
    isFamilyHead: boolean;
    isWife: boolean;
    movedInDate: string;
    nationalId: File | null;
    votersId: File | null;
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
        education: '',
        religion: '',
        householdNumber: '',
        isFamilyHead: false,
        isWife: false,
        movedInDate: '',
        nationalId: null,
        votersId: null,
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

    const isValidDate = (dateString: string, isMovedInDate: boolean = false): boolean => {
        if (!dateString) return !isMovedInDate; // movedInDate is optional, birthday is required

        const date = new Date(dateString);
        const today = new Date();

        // Reset time to compare dates only
        today.setHours(23, 59, 59, 999);

        if (isNaN(date.getTime())) return false;

        if (isMovedInDate) {
            // For moved in date: cannot be in the future, cannot be before 1900
            const minDate = new Date('1900-01-01');
            return date >= minDate && date <= today;
        } else {
            // For birthday: cannot be in the future, must be realistic (not before 1900)
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
        if (!householdNum) return true; // Optional field
        return /^[A-Z0-9\-]+$/i.test(householdNum.trim());
    };

    const isValidImageFile = (file: File): boolean => {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
        const maxSize = 5 * 1024 * 1024; // 5MB

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
                // Get official households
                const householdSnapshot = await getDocs(collection(db, 'households'));
                const officialHouseholds = householdSnapshot.docs.map(doc => doc.data().householdNumber);
                
                // Get residents with household numbers
                const residentsSnapshot = await getDocs(collection(db, 'residents'));
                const residentHouseholds = residentsSnapshot.docs
                    .map(doc => doc.data().householdNumber)
                    .filter(Boolean);

                // Combine all household numbers
                const allNumbers = [...officialHouseholds, ...residentHouseholds];
                const uniqueNumbers = Array.from(new Set(allNumbers)).sort((a, b) => 
                    a.localeCompare(b, undefined, { numeric: true })
                );

                setAllHouseholdNumbers(uniqueNumbers);
                setHouseholds(uniqueNumbers);

                // Generate next household number
                const nextNumber = generateNextHouseholdNumber(uniqueNumbers);
                setNewHouseholdNumber(nextNumber);
                
            } catch (error) {
                console.error('Error fetching households:', error);
            }
        };
        fetchHouseholds();
    }, []);

    // Update registered voter status when ID files are uploaded
    useEffect(() => {
        const hasValidId = formData.nationalId || formData.votersId;
        setFormData(prev => ({
            ...prev,
            isRegisteredVoter: !!hasValidId
        }));
    }, [formData.nationalId, formData.votersId]);

    const validateForm = (): boolean => {
        const newErrors: Partial<Record<keyof FormData, string>> = {};

        // Name validations
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

        // Sex validation
        if (!formData.sex) {
            newErrors.sex = 'Sex is required';
        }

        // Wife validation - only females can be wives
        if (formData.isWife && formData.sex !== 'Female') {
            newErrors.isWife = 'Only females can be marked as wife';
        }

        // Birthday validation
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

        // Address validation
        if (!formData.address.trim()) {
            newErrors.address = 'Address is required';
        } else if (!isValidAddress(formData.address)) {
            newErrors.address = 'Address must be at least 10 characters and contain valid characters only';
        }

        // Moved in date validation (if provided)
        if (formData.movedInDate && !isValidDate(formData.movedInDate, true)) {
            newErrors.movedInDate = 'Moved in date cannot be in the future';
        }

        // If birthday and moved in date are both provided, moved in date should be after birthday
        if (formData.birthday && formData.movedInDate) {
            const birthDate = new Date(formData.birthday);
            const movedDate = new Date(formData.movedInDate);
            if (movedDate < birthDate) {
                newErrors.movedInDate = 'Moved in date cannot be before birth date';
            }
        }

        // Household number validation
        if (!formData.householdNumber) {
            newErrors.householdNumber = 'Household number is required';
        } else if (!isValidHouseholdNumber(formData.householdNumber)) {
            newErrors.householdNumber = 'Household number contains invalid characters';
        }

        // Religion validation (if provided)
        if (formData.religion && !isValidName(formData.religion)) {
            newErrors.religion = 'Religion contains invalid characters';
        }

        // Occupation validation (if provided)
        if (formData.occupation && formData.occupation.trim().length < 2) {
            newErrors.occupation = 'Occupation must be at least 2 characters long';
        }

        // ID file validation
        if (formData.nationalId && !isValidImageFile(formData.nationalId)) {
            newErrors.nationalId = 'National ID must be an image file (JPEG, PNG, GIF) and less than 5MB';
        }

        if (formData.votersId && !isValidImageFile(formData.votersId)) {
            newErrors.votersId = 'Voter\'s ID must be an image file (JPEG, PNG, GIF) and less than 5MB';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const checked = type === 'checkbox' && (e.target as HTMLInputElement).checked;

        // Sanitize input for text fields
        let sanitizedValue = value;
        if (type === 'text' && ['lastName', 'firstName', 'middleName', 'religion'].includes(name)) {
            // Remove potentially harmful characters but keep valid name characters
            sanitizedValue = value.replace(/[^a-zA-ZñÑ\s\-\.\']/g, '');
        } else if (name === 'address') {
            // Allow more characters for address but remove potentially harmful ones
            sanitizedValue = value.replace(/[^a-zA-Z0-9ñÑ\s\-\.\,\#]/g, '');
        } else if (name === 'householdNumber') {
            // Only allow alphanumeric and hyphens for household number
            sanitizedValue = value.replace(/[^a-zA-Z0-9\-]/g, '');
        }

        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : sanitizedValue,
        }));

        // Clear error when user starts typing
        if (errors[name as keyof FormData]) {
            setErrors(prev => ({ ...prev, [name]: undefined }));
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: 'nationalId' | 'votersId') => {
        const file = e.target.files?.[0] || null;

        setFormData(prev => ({
            ...prev,
            [fieldName]: file
        }));

        // Clear error when user selects a file
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

        try {
            const finalData = {
                ...formData,
                movedInDate: formData.movedInDate || new Date().toISOString().split('T')[0],
                createdAt: new Date().toISOString(),
                // Clean up data
                lastName: formData.lastName.trim(),
                firstName: formData.firstName.trim(),
                middleName: formData.middleName.trim(),
                address: formData.address.trim(),
                religion: formData.religion.trim(),
                occupation: formData.occupation.trim(),
                householdNumber: formData.householdNumber.trim(),
                // Remove file objects for Firestore (you'll need to handle file upload separately)
                nationalId: formData.nationalId ? formData.nationalId.name : null,
                votersId: formData.votersId ? formData.votersId.name : null,
                // Voter registration status
                isRegisteredVoter: !!(formData.nationalId || formData.votersId),
                voterRegistrationDate: (formData.nationalId || formData.votersId) ? new Date().toISOString() : null
            };

            await addDoc(collection(db, 'residents'), finalData);

            // ✨ AUTOMATICALLY ASSIGN NUMERICAL IDs AFTER ADDING RESIDENT
            console.log('🔄 Assigning numerical IDs to all residents...');
            await migrateResidentsToNumericalIds();
            console.log('✅ Numerical IDs assigned successfully!');

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
                education: '',
                religion: '',
                householdNumber: '',
                isFamilyHead: false,
                isWife: false,
                movedInDate: '',
                nationalId: null,
                votersId: null,
                isRegisteredVoter: false
            });
            setCustomOccupation('');
            setIsCustomOccupation(false);
            setErrors({});

            alert('✅ Resident added successfully!' + (finalData.isRegisteredVoter ? ' Classified as registered voter.' : '') + ' Numerical IDs have been assigned.');

            // Navigate back to residents list after successful submission
            navigate('/residents');

        } catch (error: any) {
            console.error('Error adding resident:', error);
            alert('❌ Failed to add resident: ' + (error.message || 'Unknown error'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderField = (label: string, name: keyof FormData, type: string = 'text', required: boolean = false) => (
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
                placeholder={`Enter ${label.toLowerCase()}`}
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

    const renderFileInput = (label: string, name: 'nationalId' | 'votersId') => (
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
                    <span style={styles.fileName}>📎 {formData[name]?.name}</span>
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
                                Upload National ID or Voter's ID to automatically classify as registered voter
                            </p>

                            <div style={styles.row}>
                                {renderFileInput('National ID', 'nationalId')}
                                {renderFileInput('Voter\'s ID', 'votersId')}
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
                                        Adding Resident...
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