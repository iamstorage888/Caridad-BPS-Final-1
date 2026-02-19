// AddressInput.tsx
// Philippine address input with cascading dropdowns
// Uses: PSGC API (free, no API key) + react-select (npm install react-select)
// No Google Maps, no env file needed!

import React, { useEffect, useState, useCallback } from 'react';
import Select from 'react-select';

const PSGC_BASE = 'https://psgc.gitlab.io/api';

// ─── TYPES ───────────────────────────────────────────────────────────────────
interface PSGCItem { code: string; name: string; }
interface SelectOption { value: string; label: string; }

export interface AddressValue {
    region: string;       regionCode: string;
    province: string;     provinceCode: string;
    city: string;         cityCode: string;
    barangay: string;     barangayCode: string;
    street: string;
    zipCode: string;
    fullAddress: string;
}

interface AddressInputProps {
    value: AddressValue;
    onChange: (val: AddressValue) => void;
    error?: string;
    required?: boolean;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const fetchPSGC = async (path: string): Promise<PSGCItem[]> => {
    try {
        const res = await fetch(`${PSGC_BASE}/${path}`);
        if (!res.ok) return [];
        const data = await res.json();
        return data.sort((a: PSGCItem, b: PSGCItem) => a.name.localeCompare(b.name));
    } catch { return []; }
};

const toOptions = (items: PSGCItem[]): SelectOption[] =>
    items.map(i => ({ value: i.code, label: i.name }));

const buildFullAddress = (v: Partial<AddressValue>): string =>
    [v.street, v.barangay, v.city, v.province, v.region, v.zipCode]
        .filter(Boolean).join(', ');

const NCR_CODE = '130000000';

// ─── CUSTOM SELECT STYLES (matches your app's design) ────────────────────────
const selectStyles = (hasError?: boolean) => ({
    control: (base: any, state: any) => ({
        ...base,
        padding: '2px 4px',
        fontSize: '14px',
        borderRadius: '8px',
        border: `2px solid ${hasError ? '#ef4444' : state.isFocused ? '#667eea' : '#e2e8f0'}`,
        backgroundColor: hasError ? '#fef2f2' : '#ffffff',
        boxShadow: state.isFocused ? `0 0 0 3px ${hasError ? '#fee2e2' : '#ede9fe'}` : 'none',
        '&:hover': { borderColor: hasError ? '#ef4444' : '#667eea' },
        minHeight: '46px',
        transition: 'all 0.2s ease',
    }),
    option: (base: any, state: any) => ({
        ...base,
        fontSize: '14px',
        backgroundColor: state.isSelected ? '#667eea' : state.isFocused ? '#f0f0ff' : 'white',
        color: state.isSelected ? 'white' : '#374151',
        cursor: 'pointer',
        padding: '10px 14px',
    }),
    menu: (base: any) => ({
        ...base,
        borderRadius: '8px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        border: '1px solid #e2e8f0',
        zIndex: 9999,
    }),
    placeholder: (base: any) => ({ ...base, color: '#9ca3af', fontSize: '14px' }),
    singleValue: (base: any) => ({ ...base, color: '#374151', fontSize: '14px' }),
    loadingIndicator: (base: any) => ({ ...base, color: '#667eea' }),
    indicatorSeparator: () => ({ display: 'none' }),
    dropdownIndicator: (base: any) => ({ ...base, color: '#9ca3af', '&:hover': { color: '#667eea' } }),
    noOptionsMessage: (base: any) => ({ ...base, fontSize: '13px', color: '#9ca3af' }),
});

// ─── COMPONENT ────────────────────────────────────────────────────────────────
const AddressInput: React.FC<AddressInputProps> = ({ value, onChange, error, required }) => {
    const [regions, setRegions]     = useState<SelectOption[]>([]);
    const [provinces, setProvinces] = useState<SelectOption[]>([]);
    const [cities, setCities]       = useState<SelectOption[]>([]);
    const [barangays, setBarangays] = useState<SelectOption[]>([]);

    const [loadingRegions,   setLoadingRegions]   = useState(true);
    const [loadingProvinces, setLoadingProvinces] = useState(false);
    const [loadingCities,    setLoadingCities]    = useState(false);
    const [loadingBarangays, setLoadingBarangays] = useState(false);

    // Load regions once on mount
    useEffect(() => {
        fetchPSGC('regions/').then(data => {
            setRegions(toOptions(data));
            setLoadingRegions(false);
        });
    }, []);

    const handleRegionChange = useCallback(async (opt: SelectOption | null) => {
        setProvinces([]); setCities([]); setBarangays([]);
        const updated: AddressValue = {
            ...value,
            region: opt?.label ?? '', regionCode: opt?.value ?? '',
            province: '', provinceCode: '',
            city: '', cityCode: '',
            barangay: '', barangayCode: '',
            fullAddress: '',
        };
        onChange(updated);
        if (!opt) return;

        if (opt.value === NCR_CODE) {
            setLoadingCities(true);
            const data = await fetchPSGC(`regions/${opt.value}/cities-municipalities/`);
            setCities(toOptions(data));
            setLoadingCities(false);
        } else {
            setLoadingProvinces(true);
            const data = await fetchPSGC(`regions/${opt.value}/provinces/`);
            setProvinces(toOptions(data));
            setLoadingProvinces(false);
        }
    }, [value, onChange]);

    const handleProvinceChange = useCallback(async (opt: SelectOption | null) => {
        setCities([]); setBarangays([]);
        const updated: AddressValue = {
            ...value,
            province: opt?.label ?? '', provinceCode: opt?.value ?? '',
            city: '', cityCode: '',
            barangay: '', barangayCode: '',
            fullAddress: '',
        };
        onChange(updated);
        if (!opt) return;
        setLoadingCities(true);
        const data = await fetchPSGC(`provinces/${opt.value}/cities-municipalities/`);
        setCities(toOptions(data));
        setLoadingCities(false);
    }, [value, onChange]);

    const handleCityChange = useCallback(async (opt: SelectOption | null) => {
        setBarangays([]);
        const updated: AddressValue = {
            ...value,
            city: opt?.label ?? '', cityCode: opt?.value ?? '',
            barangay: '', barangayCode: '',
            fullAddress: '',
        };
        onChange(updated);
        if (!opt) return;
        setLoadingBarangays(true);
        const data = await fetchPSGC(`cities-municipalities/${opt.value}/barangays/`);
        setBarangays(toOptions(data));
        setLoadingBarangays(false);
    }, [value, onChange]);

    const handleBarangayChange = useCallback((opt: SelectOption | null) => {
        const updated: AddressValue = {
            ...value,
            barangay: opt?.label ?? '', barangayCode: opt?.value ?? '',
        };
        updated.fullAddress = buildFullAddress(updated);
        onChange(updated);
    }, [value, onChange]);

    const handleStreetChange = (street: string) => {
        const updated = { ...value, street };
        updated.fullAddress = buildFullAddress(updated);
        onChange(updated);
    };

    const handleZipChange = (zipCode: string) => {
        const updated = { ...value, zipCode };
        updated.fullAddress = buildFullAddress(updated);
        onChange(updated);
    };

    const isNCR = value.regionCode === NCR_CODE;

    const selectedRegion   = regions.find(r => r.value === value.regionCode) ?? null;
    const selectedProvince = provinces.find(p => p.value === value.provinceCode) ?? null;
    const selectedCity     = cities.find(c => c.value === value.cityCode) ?? null;
    const selectedBarangay = barangays.find(b => b.value === value.barangayCode) ?? null;

    return (
        <div style={s.wrapper}>

            {/* Region + Province */}
            <div style={s.row}>
                <div style={s.field}>
                    <label style={s.label}>
                        Region {required && <span style={s.req}>*</span>}
                    </label>
                    <Select
                        options={regions}
                        value={selectedRegion}
                        onChange={opt => handleRegionChange(opt as SelectOption | null)}
                        isLoading={loadingRegions}
                        placeholder="Select Region..."
                        styles={selectStyles(!!error && !value.regionCode)}
                        isClearable
                        noOptionsMessage={() => 'No regions found'}
                    />
                </div>

                {!isNCR && (
                    <div style={s.field}>
                        <label style={s.label}>
                            Province {required && <span style={s.req}>*</span>}
                        </label>
                        <Select
                            options={provinces}
                            value={selectedProvince}
                            onChange={opt => handleProvinceChange(opt as SelectOption | null)}
                            isLoading={loadingProvinces}
                            isDisabled={!value.regionCode}
                            placeholder={value.regionCode ? 'Select Province...' : 'Select Region first'}
                            styles={selectStyles(!!error && !!value.regionCode && !value.provinceCode)}
                            isClearable
                            noOptionsMessage={() => 'No provinces found'}
                        />
                    </div>
                )}

                {isNCR && <div style={s.field} />}
            </div>

            {/* City + Barangay */}
            <div style={s.row}>
                <div style={s.field}>
                    <label style={s.label}>
                        City / Municipality {required && <span style={s.req}>*</span>}
                    </label>
                    <Select
                        options={cities}
                        value={selectedCity}
                        onChange={opt => handleCityChange(opt as SelectOption | null)}
                        isLoading={loadingCities}
                        isDisabled={isNCR ? !value.regionCode : !value.provinceCode}
                        placeholder={
                            isNCR
                                ? (value.regionCode ? 'Select City...' : 'Select Region first')
                                : (value.provinceCode ? 'Select City...' : 'Select Province first')
                        }
                        styles={selectStyles(!!error && (isNCR ? !!value.regionCode : !!value.provinceCode) && !value.cityCode)}
                        isClearable
                        noOptionsMessage={() => 'No cities found'}
                    />
                </div>

                <div style={s.field}>
                    <label style={s.label}>
                        Barangay {required && <span style={s.req}>*</span>}
                    </label>
                    <Select
                        options={barangays}
                        value={selectedBarangay}
                        onChange={opt => handleBarangayChange(opt as SelectOption | null)}
                        isLoading={loadingBarangays}
                        isDisabled={!value.cityCode}
                        placeholder={value.cityCode ? 'Select Barangay...' : 'Select City first'}
                        styles={selectStyles(!!error && !!value.cityCode && !value.barangayCode)}
                        isClearable
                        noOptionsMessage={() => 'No barangays found'}
                    />
                </div>
            </div>

            {/* Street + ZIP */}
            <div style={s.row}>
                <div style={{ ...s.field, gridColumn: 'span 1' }}>
                    <label style={s.label}>House No. / Street / Subdivision</label>
                    <input
                        type="text"
                        style={s.input}
                        placeholder="e.g. 123 Rizal St., Sunrise Subdivision"
                        value={value.street}
                        onChange={e => handleStreetChange(e.target.value)}
                    />
                </div>
                <div style={s.field}>
                    <label style={s.label}>ZIP Code</label>
                    <input
                        type="text"
                        style={s.input}
                        placeholder="e.g. 6000"
                        maxLength={4}
                        value={value.zipCode}
                        onChange={e => handleZipChange(e.target.value.replace(/\D/g, ''))}
                    />
                </div>
            </div>

            {/* Full address preview */}
            {value.fullAddress && (
                <div style={s.preview}>
                    <span style={s.previewIcon}>📋</span>
                    <span style={s.previewText}>{value.fullAddress}</span>
                </div>
            )}

            {error && <span style={s.errorText}>{error}</span>}
        </div>
    );
};

const s: Record<string, React.CSSProperties> = {
    wrapper:     { display: 'flex', flexDirection: 'column', gap: '16px' },
    row:         { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' },
    field:       { display: 'flex', flexDirection: 'column', gap: '6px' },
    label:       { fontWeight: 600, fontSize: 14, color: '#374151' },
    req:         { color: '#ef4444' },
    input: {
        padding: '12px 16px', fontSize: 14, borderRadius: 8,
        border: '2px solid #e2e8f0', backgroundColor: '#fff',
        outline: 'none', transition: 'border-color 0.2s',
    },
    preview: {
        display: 'flex', alignItems: 'flex-start', gap: 8,
        padding: '10px 14px', backgroundColor: '#f0f9ff',
        borderRadius: 8, border: '1px solid #bae6fd',
    },
    previewIcon: { fontSize: 16, flexShrink: 0, marginTop: 1 },
    previewText: { fontSize: 13, color: '#0369a1', lineHeight: 1.6 },
    errorText:   { color: '#ef4444', fontSize: 12, fontWeight: 500 },
};

export default AddressInput;
