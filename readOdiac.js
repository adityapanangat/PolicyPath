import { NetCDFReader } from 'netcdfjs';
import fs from 'fs';

let landEmissions = []; //will hold all emission data, years marked 00, 01, 02, etc.
let latitudes = []; //will hold lat data by year
let longitudes = []; //will hold long data by year

function initDataLoader() {
    console.log("Initialization carbon emission data loader");
    for(let i = 2000; i <= 2022; i++) {
        const data = fs.readFileSync(`odiac_dataset/odiac2023_1x1d_${i}.nc`);
        const reader = new NetCDFReader(data);
    
        const numMonths = 12; // Number of months
        const numLatitudes = 180; // Number of latitude points
        const numLongitudes = 360; // Number of longitude points
    
        const rawLandEmissions = reader.getDataVariable('land');

        latitudes[i-2000] = reader.getDataVariable('lat');
        longitudes[i-2000] = reader.getDataVariable('lon');
    
        landEmissions[i-2000] = Array.from({ length: numMonths }, (_, monthIndex) => {
            return Array.from({ length: numLatitudes }, (_, latIndex) => {
                return rawLandEmissions.slice(
                    monthIndex * numLatitudes * numLongitudes + latIndex * numLongitudes,
                    monthIndex * numLatitudes * numLongitudes + latIndex * numLongitudes + numLongitudes
                );
            });
        });
    }
}

//month is 1-indexed
export function getLandEmissionsByTime(closestCoords, year, month = 1) {    
    const toReturn = landEmissions[year - 2000][month - 1][closestCoords.latIndex][closestCoords.lonIndex]; // To inspect the unflattened data
    return toReturn;
}

// Function to find the closest latitude and longitude indices
export function findClosestCoordinates(targetLat, targetLon, year = 0) {
    // Initialize variables to store the closest distance and indices
    let closestDistance = Infinity;
    let closestCoords = { latIndex: -1, lonIndex: -1, closestLat: null, closestLon: null };

    // Loop through all latitude and longitude values
    latitudes[year].forEach((lat, latIndex) => {
        longitudes[year].forEach((lon, lonIndex) => {
            // Calculate the distance using Haversine formula or simple Euclidean distance
            const distance = Math.sqrt(Math.pow(lat - targetLat, 2) + Math.pow(lon - targetLon, 2));
            
            // Check if this is the closest distance found so far
            if (distance < closestDistance) {
                closestDistance = distance;
                closestCoords = {
                    latIndex: latIndex,
                    lonIndex: lonIndex,
                    closestLat: lat,
                    closestLon: lon
                };
            }
        });
    });

    console.log("Got closest coords for land emissions");
    return closestCoords;
}


// Function to get land emissions for all years from 2000 to 2022 for a given lat, long
export function getLandEmissionsForAllYears(latitude, longitude) {
    const closestCoords = findClosestCoordinates(latitude, longitude);
    let emissionsData = {}; // This will store emissions data in the format {year: {month: emissions}}

    for (let year = 2000; year <= 2022; year++) {
        emissionsData[year] = {}; // Initialize an object for the year
        for (let month = 1; month <= 12; month++) {
            // Get land emissions for the specified year, month, and closest coordinates
            emissionsData[year][month] = getLandEmissionsByTime(closestCoords, year, month);
        }
    }
    return {
        emissionsData,
        closestLatitude: closestCoords.closestLat,
        closestLongitude: closestCoords.closestLon,
    }
}


// Coordinates for Dallas, Texas
const dallasLat = 31.2304; // + north ; - south 
const dallasLong = 121.4737; // + east ; - west


// Specify the absolute or relative file path directly
initDataLoader();
