import fs from 'fs';
import Papa from 'papaparse';

// Function to convert a CSV file to a dictionary
const csvToDict = (csvFilePath) => {
    const fileContent = fs.readFileSync(csvFilePath, 'utf8');
    const parsedData = Papa.parse(fileContent, {
        header: true,
        skipEmptyLines: true,
    });
    return parsedData.data;  // Return the parsed data
};

function getCountryByCoordinates(latitude, longitude) {
    const countriesData = csvToDict('./countries.csv');
    
    // Function to calculate the Haversine distance between two coordinates
    const haversineDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371; // Radius of the Earth in kilometers
        const dLat = (lat2 - lat1) * (Math.PI / 180); // Convert degrees to radians
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        
        const a = 
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; // Distance in kilometers
    };

    let closestCountry = null;
    let minDistance = Infinity; // Initialize minimum distance to a very high value

    // Find the country with the closest coordinates
    for (const entry of countriesData) {
        if (entry.latitude && entry.longitude) {
            const entryLat = parseFloat(entry.latitude);
            const entryLong = parseFloat(entry.longitude);
            const distance = haversineDistance(latitude, longitude, entryLat, entryLong);

            if (distance < minDistance) {
                minDistance = distance; // Update the minimum distance
                closestCountry = entry.country; // Update the closest country
            }
        }
    }

    return closestCountry; // Return the closest country
}


// Function to get policies by country, items per year, and page number
export function getClimatePolicies(latitude, longitude, itemsPerYear, pageNumber) {

    const country = getCountryByCoordinates(latitude, longitude);

    const policyData = csvToDict('./climate_policy_data.csv');
    const results = [];

    // Filter policies for the specified country
    const filteredPolicies = policyData.filter(entry => entry.country === country);

    // Organize policies by year
    const policiesByYear = {};
    
    // Initialize years from 2000 to 2022
    for (let year = 2000; year <= 2022; year++) {
        policiesByYear[year] = [];
    }

    filteredPolicies.forEach(policy => {
        const year = new Date(policy.decision_date).getFullYear(); // Assuming there's a 'date' field in policy data
        // Only include policies from the years 2000 to 2022
        if (year >= 2000 && year <= 2022) {
            policiesByYear[year].push({
                policy_name: policy.policy_name,
                policy_description: policy.policy_description,
            });
        }
    });

    // Return only the requested number of items per year and apply pagination
    for (const year in policiesByYear) {
        const policies = policiesByYear[year];
        
        // Calculate start and end indices for pagination
        const startIndex = (pageNumber - 1) * itemsPerYear; // Calculate start index based on page number
        const endIndex = startIndex + itemsPerYear; // Calculate end index
        
        // Slice the policies array based on the calculated indices
        const paginatedPolicies = policies.slice(startIndex, endIndex);
        
        results.push({ year, policies: paginatedPolicies });
    }

    return results; // Return the organized results
}
