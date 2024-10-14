import { setStoryMode } from "./globe.js";

export async function showStory(lat, long) {
    console.log("Showing story");
    setStoryMode(true);
    // Show the story screen and set it to loading mode
    openStoryScreen(); 
    await fetchStoryData(lat, long); 
}

import { Chart, LinearScale, CategoryScale,LineController, LineElement, PointElement   } from 'chart.js';

// Register the required scales
Chart.register(LinearScale, CategoryScale, LineController, LineElement, PointElement );

async function fetchStoryData(lat, long) {
    const url = `/getStory?lat=${lat}&long=${long}&pageNumber=1`;
    const storyContentElement = document.getElementById("storyContent");

    try {
        storyContentElement.textContent = "Loading..."; // Show loading message

        const response = await fetch(url); // Send a GET request to the server
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json(); // Parse the JSON response
        console.log('Story Data:', data); // Log the story data to the console

        // Populate the storyScreen with the actual content from the response
        const years = Array.from({ length: 23 }, (_, i) => 2000 + i); // Generates years from 2000 to 2022
        let emissionsContent = years.map((year, index) => {
            const emissions = data.landEmissions[year]; // Adjusted to get emissions
            const januaryEmissions = emissions && emissions[1] !== undefined ? emissions[1].toFixed(5) : "N/A"; // January emissions
            const policiesForYear = data.climatePolicies[year - 2000]?.policies || []; // Get policies for the year
            
            // Get the policy names, default to "N/A" if not available
            const policyList = policiesForYear.length > 0 
                ? policiesForYear.map(policy => `
                    <div style="margin-bottom: 10px;">
                        <strong style="color: black; cursor: pointer;">${policy.policy_name}</strong><br>
                        <span style="font-size: 12px; color: gray;">${policy.policy_description}</span>
                    </div>
                `).join('') 
                : "N/A"; // Show "N/A" if no policies

            // Calculate the percentage change in emissions from the previous year
            let percentChange = '';
            if (index > 0) { // Avoid calculation for the first year (2000)
                const previousEmissions = data.landEmissions[years[index - 1]];
                const previousJanuaryEmissions = previousEmissions && previousEmissions[1] !== undefined ? previousEmissions[1] : 0;

                if (previousJanuaryEmissions > 0) {
                    const change = ((januaryEmissions - previousJanuaryEmissions) / previousJanuaryEmissions) * 100;
                    percentChange = change.toFixed(2);
                    percentChange = (change > 0 ? `+${percentChange}` : `${percentChange}`).replace(/^(?=-)/, ''); // Ensure a + sign for increases
                }
            }

            // Style the percent change based on whether it increased or decreased
            const percentChangeStyle = percentChange ? (percentChange.startsWith('+') ? 'color: red;' : 'color: green;') : '';

            return `<tr>
                <td style="text-align: center; vertical-align: middle; border: 1px solid lightgray;">${year}</td>
                <td style="text-align: center; color: red; vertical-align: middle; border: 1px solid lightgray;">${januaryEmissions}</td>
                <td style="max-width: 400px; word-wrap: break-word; vertical-align: middle; border: 1px solid lightgray;">
                    ${policyList}
                </td>
                <td style="text-align: center; vertical-align: middle; border: 1px solid lightgray; ${percentChangeStyle}">${percentChange || "N/A"}</td>
            </tr>`;
        }).join('');

        storyContentElement.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center;">
                <div style="font-weight: bold; margin-bottom: 10px;">
                    Closest data availabe | Latitude: ${data.closestLatitude}, Longitude: ${data.closestLongitude}
                </div>
                <div style="width: 100%; max-width: 600px;">
                    <canvas id="emissionsChart"></canvas>
                </div>
                <div style="flex: 1; margin-top: 20px;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr>
                                <th style="border: 1px solid lightgray; text-align: center; padding: 10px 20px">Year</th>
                                <th style="border: 1px solid lightgray; text-align: center; padding: 10px 20px">Land Carbon Emissions (g C/m^2/day)</th>
                                <th style="border: 1px solid lightgray; text-align: center; padding: 10px 20px">Policies Passed</th>
                                <th style="border: 1px solid lightgray; text-align: center; padding: 10px 20px">Policies' effects on carbon emissions (%)</th> <!-- New Header -->
                            </tr>
                        </thead>
                        <tbody>
                            ${emissionsContent}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        // Prepare data for the line chart
        const emissionsDataForChart = years.map(year => {
            const emissions = data.landEmissions[year]; // Get emissions for the year
            return emissions && emissions[1] !== undefined ? emissions[1] : 0; // Get January emissions or default to 0
        });

        // Create the line chart
        const ctx = document.getElementById('emissionsChart').getContext('2d');
        const emissionsChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: years,
                datasets: [{
                    label: 'Carbon Emissions (Jan)',
                    data: emissionsDataForChart,
                    borderColor: 'rgba(255, 99, 132, 1)',
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    fill: true,
                }]
            },
            options: {
                responsive: true,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Year'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Carbon Emissions'
                        },
                        beginAtZero: true
                    }
                }
            }
        });

    } catch (error) {
        console.error('Error fetching story data:', error); // Handle errors
        storyContentElement.textContent = "Failed to load story data. Please try again.";
    }
}




function openStoryScreen() {
    const storyScreen = document.getElementById("storyScreen");
    storyScreen.style.display = "block"; // Show the story screen
}

document.addEventListener("DOMContentLoaded", function() {
    const closeButton = document.getElementById("close-btn");
    // Attach click event listener to the close button
    closeButton.addEventListener("click", closeStoryScreen);
});

function closeStoryScreen() {
    const storyScreen = document.getElementById("storyScreen");
    storyScreen.style.display = "none"; // Hide the story screen
    setStoryMode(false);
}
