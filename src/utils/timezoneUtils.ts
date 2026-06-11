export interface TzOption {
    label: string;
    value: string;
    offset: string;
}

export const TRAVEL_TIMEZONES: TzOption[] = [
    // Asia
    { label: 'India (IST)', value: 'Asia/Kolkata', offset: 'UTC+5:30' },
    { label: 'China (CST)', value: 'Asia/Shanghai', offset: 'UTC+8' },
    { label: 'Japan (JST)', value: 'Asia/Tokyo', offset: 'UTC+9' },
    { label: 'South Korea (KST)', value: 'Asia/Seoul', offset: 'UTC+9' },
    { label: 'Singapore (SGT)', value: 'Asia/Singapore', offset: 'UTC+8' },
    { label: 'Thailand (THA)', value: 'Asia/Bangkok', offset: 'UTC+7' },
    { label: 'Indonesia – Jakarta (WIB)', value: 'Asia/Jakarta', offset: 'UTC+7' },
    { label: 'Indonesia – Bali (WITA)', value: 'Asia/Makassar', offset: 'UTC+8' },
    { label: 'Vietnam (ICT)', value: 'Asia/Ho_Chi_Minh', offset: 'UTC+7' },
    { label: 'Malaysia (MYT)', value: 'Asia/Kuala_Lumpur', offset: 'UTC+8' },
    { label: 'Philippines (PHT)', value: 'Asia/Manila', offset: 'UTC+8' },
    { label: 'UAE (GST)', value: 'Asia/Dubai', offset: 'UTC+4' },
    { label: 'Saudi Arabia (AST)', value: 'Asia/Riyadh', offset: 'UTC+3' },
    { label: 'Nepal (NPT)', value: 'Asia/Kathmandu', offset: 'UTC+5:45' },
    { label: 'Sri Lanka (SLST)', value: 'Asia/Colombo', offset: 'UTC+5:30' },
    { label: 'Pakistan (PKT)', value: 'Asia/Karachi', offset: 'UTC+5' },
    { label: 'Bangladesh (BST)', value: 'Asia/Dhaka', offset: 'UTC+6' },
    { label: 'Hong Kong (HKT)', value: 'Asia/Hong_Kong', offset: 'UTC+8' },
    { label: 'Taiwan (TST)', value: 'Asia/Taipei', offset: 'UTC+8' },
    { label: 'Israel (IST)', value: 'Asia/Jerusalem', offset: 'UTC+2/+3' },
    { label: 'Turkey (TRT)', value: 'Europe/Istanbul', offset: 'UTC+3' },
    // Europe
    { label: 'UK (GMT/BST)', value: 'Europe/London', offset: 'UTC+0/+1' },
    { label: 'France / Germany / Italy (CET)', value: 'Europe/Paris', offset: 'UTC+1/+2' },
    { label: 'Spain (CET)', value: 'Europe/Madrid', offset: 'UTC+1/+2' },
    { label: 'Greece (EET)', value: 'Europe/Athens', offset: 'UTC+2/+3' },
    { label: 'Russia – Moscow (MSK)', value: 'Europe/Moscow', offset: 'UTC+3' },
    // Africa
    { label: 'Egypt (EET)', value: 'Africa/Cairo', offset: 'UTC+2' },
    { label: 'South Africa (SAST)', value: 'Africa/Johannesburg', offset: 'UTC+2' },
    { label: 'Kenya (EAT)', value: 'Africa/Nairobi', offset: 'UTC+3' },
    { label: 'Nigeria (WAT)', value: 'Africa/Lagos', offset: 'UTC+1' },
    { label: 'Morocco (WET)', value: 'Africa/Casablanca', offset: 'UTC+1' },
    // Americas
    { label: 'USA – New York (ET)', value: 'America/New_York', offset: 'UTC-5/-4' },
    { label: 'USA – Chicago (CT)', value: 'America/Chicago', offset: 'UTC-6/-5' },
    { label: 'USA – Denver (MT)', value: 'America/Denver', offset: 'UTC-7/-6' },
    { label: 'USA – Los Angeles (PT)', value: 'America/Los_Angeles', offset: 'UTC-8/-7' },
    { label: 'Canada – Toronto (ET)', value: 'America/Toronto', offset: 'UTC-5/-4' },
    { label: 'Canada – Vancouver (PT)', value: 'America/Vancouver', offset: 'UTC-8/-7' },
    { label: 'Brazil – São Paulo (BRT)', value: 'America/Sao_Paulo', offset: 'UTC-3' },
    { label: 'Mexico – Mexico City (CST)', value: 'America/Mexico_City', offset: 'UTC-6/-5' },
    // Oceania
    { label: 'Australia – Sydney (AEST)', value: 'Australia/Sydney', offset: 'UTC+10/+11' },
    { label: 'Australia – Melbourne (AEST)', value: 'Australia/Melbourne', offset: 'UTC+10/+11' },
    { label: 'Australia – Perth (AWST)', value: 'Australia/Perth', offset: 'UTC+8' },
    { label: 'New Zealand (NZST)', value: 'Pacific/Auckland', offset: 'UTC+12/+13' },
    // UTC
    { label: 'UTC (Universal)', value: 'UTC', offset: 'UTC+0' },
];

const DESTINATION_TZ_MAP: Record<string, string> = {
    // China
    china: 'Asia/Shanghai', beijing: 'Asia/Shanghai', shanghai: 'Asia/Shanghai',
    shenzhen: 'Asia/Shanghai', guangzhou: 'Asia/Shanghai', chengdu: 'Asia/Shanghai',
    xian: 'Asia/Shanghai', hangzhou: 'Asia/Shanghai',
    // Japan
    japan: 'Asia/Tokyo', tokyo: 'Asia/Tokyo', osaka: 'Asia/Tokyo',
    kyoto: 'Asia/Tokyo', hiroshima: 'Asia/Tokyo', sapporo: 'Asia/Tokyo',
    // South Korea
    korea: 'Asia/Seoul', seoul: 'Asia/Seoul', busan: 'Asia/Seoul',
    // India
    india: 'Asia/Kolkata', mumbai: 'Asia/Kolkata', delhi: 'Asia/Kolkata',
    bangalore: 'Asia/Kolkata', hyderabad: 'Asia/Kolkata', chennai: 'Asia/Kolkata',
    kolkata: 'Asia/Kolkata', goa: 'Asia/Kolkata', jaipur: 'Asia/Kolkata',
    // Thailand
    thailand: 'Asia/Bangkok', bangkok: 'Asia/Bangkok', phuket: 'Asia/Bangkok',
    chiang: 'Asia/Bangkok', pattaya: 'Asia/Bangkok',
    // Singapore
    singapore: 'Asia/Singapore',
    // Malaysia
    malaysia: 'Asia/Kuala_Lumpur', 'kuala lumpur': 'Asia/Kuala_Lumpur', penang: 'Asia/Kuala_Lumpur',
    // Indonesia
    indonesia: 'Asia/Jakarta', jakarta: 'Asia/Jakarta',
    bali: 'Asia/Makassar', lombok: 'Asia/Makassar',
    // Vietnam
    vietnam: 'Asia/Ho_Chi_Minh', 'ho chi minh': 'Asia/Ho_Chi_Minh', hanoi: 'Asia/Ho_Chi_Minh',
    // Philippines
    philippines: 'Asia/Manila', manila: 'Asia/Manila', cebu: 'Asia/Manila',
    // UAE / Gulf
    uae: 'Asia/Dubai', dubai: 'Asia/Dubai', 'abu dhabi': 'Asia/Dubai',
    'saudi arabia': 'Asia/Riyadh', riyadh: 'Asia/Riyadh', jeddah: 'Asia/Riyadh',
    // Nepal / Sri Lanka / Bangladesh / Pakistan
    nepal: 'Asia/Kathmandu', kathmandu: 'Asia/Kathmandu',
    'sri lanka': 'Asia/Colombo', colombo: 'Asia/Colombo',
    bangladesh: 'Asia/Dhaka', dhaka: 'Asia/Dhaka',
    pakistan: 'Asia/Karachi', karachi: 'Asia/Karachi', lahore: 'Asia/Karachi',
    // Hong Kong / Taiwan
    'hong kong': 'Asia/Hong_Kong', taiwan: 'Asia/Taipei', taipei: 'Asia/Taipei',
    // Turkey / Israel
    turkey: 'Europe/Istanbul', istanbul: 'Europe/Istanbul',
    israel: 'Asia/Jerusalem', 'tel aviv': 'Asia/Jerusalem',
    // Europe
    uk: 'Europe/London', england: 'Europe/London', london: 'Europe/London',
    france: 'Europe/Paris', paris: 'Europe/Paris',
    germany: 'Europe/Paris', berlin: 'Europe/Paris',
    italy: 'Europe/Paris', rome: 'Europe/Paris', milan: 'Europe/Paris',
    spain: 'Europe/Madrid', barcelona: 'Europe/Madrid', madrid: 'Europe/Madrid',
    greece: 'Europe/Athens', athens: 'Europe/Athens',
    russia: 'Europe/Moscow', moscow: 'Europe/Moscow',
    // Africa
    egypt: 'Africa/Cairo', cairo: 'Africa/Cairo',
    'south africa': 'Africa/Johannesburg', johannesburg: 'Africa/Johannesburg', cape: 'Africa/Johannesburg',
    kenya: 'Africa/Nairobi', nairobi: 'Africa/Nairobi',
    nigeria: 'Africa/Lagos', lagos: 'Africa/Lagos',
    morocco: 'Africa/Casablanca', casablanca: 'Africa/Casablanca',
    // Americas
    usa: 'America/New_York', 'new york': 'America/New_York', 'los angeles': 'America/Los_Angeles',
    'san francisco': 'America/Los_Angeles', miami: 'America/New_York',
    chicago: 'America/Chicago', houston: 'America/Chicago',
    canada: 'America/Toronto', toronto: 'America/Toronto', vancouver: 'America/Vancouver',
    brazil: 'America/Sao_Paulo', 'sao paulo': 'America/Sao_Paulo', 'rio de janeiro': 'America/Sao_Paulo',
    mexico: 'America/Mexico_City',
    // Oceania
    australia: 'Australia/Sydney', sydney: 'Australia/Sydney', melbourne: 'Australia/Melbourne',
    perth: 'Australia/Perth', brisbane: 'Australia/Sydney',
    'new zealand': 'Pacific/Auckland', auckland: 'Pacific/Auckland',
};

export function guessDestinationTimezone(destination: string): string | null {
    if (!destination) return null;
    const lower = destination.toLowerCase();
    for (const keyword of Object.keys(DESTINATION_TZ_MAP)) {
        if (lower.includes(keyword)) return DESTINATION_TZ_MAP[keyword];
    }
    return null;
}
