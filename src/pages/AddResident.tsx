import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import LogoutButton from '../components/LogoutButton';
import { db } from '../Database/firebase';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';


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
    movedInDate: string;
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
        movedInDate: ''
    });

    const navigate = useNavigate();
    const [households, setHouseholds] = useState<string[]>([]);
    const [hasFamilyHead, setHasFamilyHead] = useState(false);
    const [occupations, setOccupations] = useState<string[]>([]);
    const [customOccupation, setCustomOccupation] = useState('');
    const [isCustomOccupation, setIsCustomOccupation] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<Partial<FormData>>({});

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
        const checkFamilyHead = async () => {
            if (!formData.householdNumber) {
                setHasFamilyHead(false);
                return;
            }

            try {
                const snapshot = await getDocs(collection(db, 'residents'));
                const exists = snapshot.docs.some(
                    doc => doc.data().householdNumber === formData.householdNumber && doc.data().isFamilyHead === true
                );
                setHasFamilyHead(exists);
            } catch (error) {
                console.error('Error checking family head:', error);
            }
        };

        checkFamilyHead();
    }, [formData.householdNumber]);

    useEffect(() => {
        const fetchHouseholds = async () => {
            try {
                const snapshot = await getDocs(collection(db, 'households'));
                const list = snapshot.docs.map(doc => doc.data().householdNumber);
                setHouseholds(list);
            } catch (error) {
                console.error('Error fetching households:', error);
            }
        };
        fetchHouseholds();
    }, []);

    const validateForm = (): boolean => {
        const newErrors: Partial<FormData> = {};

        if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
        if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
        if (!formData.sex) newErrors.sex = 'Sex is required';
        if (!formData.birthday) newErrors.birthday = 'Birthday is required';
        if (!formData.address.trim()) newErrors.address = 'Address is required';

        // Validate age (must be realistic)
        if (formData.birthday) {
            const birthDate = new Date(formData.birthday);
            const today = new Date();
            const age = today.getFullYear() - birthDate.getFullYear();
            if (age < 0 || age > 150) {
                newErrors.birthday = 'Please enter a valid birth date';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const checked = type === 'checkbox' && (e.target as HTMLInputElement).checked;

        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));

        // Clear error when user starts typing
        if (errors[name as keyof FormData]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
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
        };
        
        await addDoc(collection(db, 'residents'), finalData);
        
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
            movedInDate: ''
        });
        setCustomOccupation('');
        setIsCustomOccupation(false);
        
        alert('✅ Resident added successfully!');
        
        // Navigate back to residents list after successful submission
        navigate('/residents');
        
    } catch (error: any) {
        console.error('Error adding resident:', error);
        alert('❌ Failed to add resident: ' + error.message);
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
                                    placeholder="Enter complete address"
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
                                        style={styles.input}
                                        placeholder="Enter religion"
                                    />
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
                                        placeholder="Please specify your occupation"
                                        value={customOccupation}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            setCustomOccupation(value);
                                            setFormData(prev => ({ ...prev, occupation: value }));
                                        }}
                                        style={{ ...styles.input, marginTop: '8px' }}
                                    />
                                )}
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
                                    <label style={styles.label}>Household Number</label>
                                    <select
                                        onChange={(e) => {
                                            const selected = e.target.value;
                                            setFormData(prev => ({ ...prev, householdNumber: selected }));
                                        }}
                                        value={households.includes(formData.householdNumber) ? formData.householdNumber : ''}
                                        style={styles.input}
                                    >
                                        <option value="">Select existing household</option>
                                        {households.map((num, idx) => (
                                            <option key={idx} value={num}>{num}</option>
                                        ))}
                                    </select>
                                </div>

                                {renderField('Date Moved In', 'movedInDate', 'date')}
                            </div>

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
    spinner: {
        marginRight: '8px',
        animation: 'spin 1s linear infinite',
    },
};

export default AddResident;