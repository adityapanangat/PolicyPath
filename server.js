import dotenv from "dotenv"; dotenv.config();
import express from "express";

const PORT = process.env.PORT || 3000;

//dirName for other scripts to access
import { dirname } from "path";
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url))
export { __dirname };

import { findClosestCoordinates, getLandEmissionsForAllYears } from "./readOdiac.js";
import { getClimatePolicies } from "./readPolicies.js";


const app = express();

app.set("view engine", "ejs");
app.use(express.static("public")); //loads all static files from the public folder

// parse application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));
// parse application/json
app.use(express.json());

//server starts listening
app.listen(PORT, () => {
    console.log("Serverside -- server listening");
});

app.get("/", (req, res) => {
    res.render("pages/index.ejs");
});

app.get("/getStory",  function(req, res) {

    const climatePolicies = getClimatePolicies(req.query.lat, req.query.long, 2, req.query.pageNumber);
    const { emissionsData: landEmissions, closestLatitude, closestLongitude } = getLandEmissionsForAllYears(req.query.lat, req.query.long);

    console.log('Land Emissions:', landEmissions); // Check emissions data
    console.log('Climate Policies:', climatePolicies); // Check policies
    console.log('Closest Latitude:', closestLatitude); // Check latitude
    console.log('Closest Longitude:', closestLongitude); // Check longitude

    const toReturn = {
        landEmissions,
        climatePolicies,
        closestLatitude,
        closestLongitude
    };

    res.json(toReturn);
});
