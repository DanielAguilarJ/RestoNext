// Retaining this comment but removing import to rely on global fetch in Node 18+

const API_URL = 'http://localhost:8000/api';
let ACCESS_TOKEN = '';

// Minimal interfaces
interface LoginResponse {
    access_token: string;
    token_type: string;
}

interface EventLead {
    id: string;
    status: string;
    name: string;
}

async function login() {
    console.log('🔄 Logging in...');
    // Try default credentials first
    const credentials = {
        username: 'admin@restonext.me', // Adjust if needed
        password: 'password'
    };

    // Check if we can use environmental variables or args for customization if this fails
    // For now hardcoding the "happy path" dev credentials

    // Note: The API path for login might be /login/access-token (OAuth2) or /auth/login (JSON)
    // Based on user context, it seems to be /auth/login with JSON

    const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: credentials.username, password: credentials.password })
    });

    if (!res.ok) {
        throw new Error(`Login failed: ${res.status} ${res.statusText} - ${await res.text()}`);
    }

    const data = await res.json() as LoginResponse;
    ACCESS_TOKEN = data.access_token;
    console.log('✅ Login successful');
}

async function authFetch(path: string, options: any = {}) {
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        ...options.headers
    };

    const res = await fetch(`${API_URL}${path}`, {
        ...options,
        headers
    });

    if (!res.ok) {
        throw new Error(`API Request failed for ${path}: ${res.status} ${res.statusText} - ${await res.text()}`);
    }

    return res.json();
}

async function verifyCateringFlow() {
    try {
        await login();

        // 1. Create a Lead
        console.log('\nTesting 1: Create Lead...');
        const leadData = {
            name: 'Test Setup Lead ' + Date.now(),
            email: `testlead${Date.now()}@example.com`,
            phone: '555-000-0000',
            event_date: new Date(Date.now() + 86400000 * 10).toISOString(), // 10 days out
            guest_count: 50,
            status: 'new',
            source: 'web'
        };

        const createdLead = await authFetch('/catering/leads', {
            method: 'POST',
            body: JSON.stringify(leadData)
        }) as EventLead;
        console.log('✅ Lead created:', createdLead.id);

        // 2. Get Lead Details
        console.log('\nTesting 2: Get Lead Details...');
        const fetchedLead = await authFetch(`/catering/leads/${createdLead.id}`) as EventLead;
        if (fetchedLead.id !== createdLead.id) throw new Error('Lead ID mismatch');
        console.log('✅ Lead fetched successfully');

        // 3. Update Status (Kanban Move)
        console.log('\nTesting 3: Update Lead Status...');
        const updatedLead = await authFetch(`/catering/leads/${createdLead.id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status: 'negotiation' })
        }) as EventLead;

        if (updatedLead.status !== 'negotiation') throw new Error('Status update failed');
        console.log('✅ Lead status updated to negotiation');

        // 4. Create Package
        console.log('\nTesting 4: Create Catering Package...');
        const packageData = {
            name: 'Gold Wedding Package ' + Date.now(),
            description: 'Premium package',
            price: 750.00,
            min_guests: 50,
            category: 'weddings',
            items: []
        };
        const createdPackage = await authFetch('/catering/packages', {
            method: 'POST',
            body: JSON.stringify(packageData)
        }) as any;
        console.log('✅ Package created:', createdPackage.id);

        // 5. Cleanup (Optional, implemented if delete exists)
        // await authFetch(`/catering/leads/${createdLead.id}`, { method: 'DELETE' });

        console.log('\n✨ Verified Catering Flow Successfully!');

    } catch (error) {
        console.error('\n❌ Verification Failed:', error);
        process.exit(1);
    }
}

verifyCateringFlow();
