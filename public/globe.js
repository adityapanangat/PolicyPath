import * as THREE from 'three';
import Globe from 'three-globe';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as dat from 'dat.gui';
import { createCamera, createRenderer, runApp, updateLoadingProgressBar } from "./core-utils.js"
import { gsap } from "gsap";

// Other deps
import { loadTexture } from "./common-utils.js"
import Albedo from "./assets/Albedo.jpg"
import Bump from "./assets/Bump.jpg"
import Clouds from "./assets/Clouds.png"
import Ocean from "./assets/Ocean.png"

import vertexShader from "./shaders/vertex.glsl"
import fragmentShader from "./shaders/fragment.glsl"

let isDragging = false;
let startMousePos = new THREE.Vector2();

import { showStory } from './story.js';

var storyMode = false;

export function setStoryMode(tf) {
  storyMode = tf;
  storyMode ? setGuiVisibility(false) : setGuiVisibility(true);
}

export function getStoryMode() {
  return storyMode;
}

// On mousedown, record the mouse position
window.addEventListener('mousedown', (event) => {
  isDragging = false; // Reset the dragging flag
  startMousePos.set(event.clientX, event.clientY); // Record starting mouse position
}, false);

// On mousemove, mark as dragging if the mouse moved significantly
window.addEventListener('mousemove', (event) => {
  const moveThreshold = 5; // Distance in pixels to consider it a drag

  // Calculate the distance moved
  const moveX = event.clientX - startMousePos.x;
  const moveY = event.clientY - startMousePos.y;

  // If the mouse moved more than the threshold, mark it as dragging
  if (Math.abs(moveX) > moveThreshold || Math.abs(moveY) > moveThreshold) {
    isDragging = true;
  }
}, false);


export function setGuiVisibility(visible) {
  visible ? gui.domElement.style.display = 'block' : gui.domElement.style.display = 'none';
}

const guiParams = {
  latitude: 0,  // Default latitude
  latDirection: 'North',  // Default direction for latitude (North or South)
  longitude: 0, // Default longitude
  lonDirection: 'East',  // Default direction for longitude (East or West)
  enter: () => handleEnterCoordinates() // Function to handle "Enter" button click
};


function handleEnterCoordinates() {
  console.log("HI!");
  setGuiVisibility(false); //turn off gui
  storyMode = true;
  
  let { latitude, latDirection, longitude, lonDirection } = guiParams;
  latitude = latDirection === 'South' ? -latitude : latitude;
  longitude = lonDirection === 'West' ? -longitude : longitude;
  showStory(latitude, longitude);
}

function validateInput(value, min, max) {
  return value >= min && value <= max; // Returns true if within the range
}

// Define global variable
global.THREE = THREE
THREE.ColorManagement.enabled = true;

// Tweakable parameters
const params = {
  speedFactor: 2.0, // rotation speed of the earth
  ambientIntensity: 3.4, // ambient light intensity
  sunIntensity: 1,
  metalness: 0,
  atmOpacity: { value: 0.7 },
  atmPowFactor: { value: 4.5 },
  atmMultiplier: { value: 10.1 },
}

// Initialize core Three.js components
let scene = new THREE.Scene();

let renderer = createRenderer({ antialias: true }, (_renderer) => {
  _renderer.outputColorSpace = THREE.SRGBColorSpace;
});

let camera = createCamera(45, 1, 1000, { x: 0, y: 0, z: 30 });

const gui = new dat.GUI();

// Create the app object
let app = {
  async initScene() {

    gui.add(guiParams, 'latitude').name('Latitude').onChange((value) => {
      const latIn = parseFloat(value);
      if (!validateInput(latIn, 0, 90)) {
        alert('Latitude must be between 0 and 90.');
        guiParams.latitude = 0; // Reset to default
      }
    });

    gui.add(guiParams, 'latDirection', ['North', 'South']).name('Latitude Direction'); // Dropdown for N/S
    
    gui.add(guiParams, 'longitude').name('Longitude').onChange((value) => {
      const longIn = parseFloat(value);
      if (!validateInput(longIn, 0, 180)) {
        alert('Longitude must be between 0 and 180.');
        guiParams.longitude = 0; // Reset to default
      }
    });
    
    gui.add(guiParams, 'lonDirection', ['East', 'West']).name('Longitude Direction'); // Dropdown for E/W
    gui.add(guiParams, 'enter').name('CLICK to search');



    // GUI parameters for latitude, longitude, and direction

    // OrbitControls
    this.controls = new OrbitControls(camera, renderer.domElement);
    this.controls.enableDamping = true;

    this.controls.minDistance = 14;
    this.controls.maxDistance = 50;

    // Create ambient light
    this.ambientLight = new THREE.AmbientLight(0xffffff, params.ambientIntensity);
    scene.add(this.ambientLight);

    // Create two directional lights
    this.topLight = new THREE.DirectionalLight(0xffffff, params.sunIntensity);
    this.topLight.position.set(0, 50, 30); // Top light
    //scene.add(this.topLight);

    this.bottomLight = new THREE.DirectionalLight(0xffffff, params.sunIntensity);
    this.bottomLight.position.set(0, -50, -30); // Bottom light
    //scene.add(this.bottomLight);

    // Update the progress bar
    await updateLoadingProgressBar(0.1);

    // Load the Earth's color map
    const albedoMap = await loadTexture(Albedo);
    albedoMap.colorSpace = THREE.SRGBColorSpace;
    await updateLoadingProgressBar(0.2);

    const bumpMap = await loadTexture(Bump)
    await updateLoadingProgressBar(0.3)

    const oceanMap = await loadTexture(Ocean)
    await updateLoadingProgressBar(0.5)

    // Create group for easier manipulation
    this.group = new THREE.Group();
    this.group.rotation.z = 23.5 / 360 * 2 * Math.PI;

    let earthGeo = new THREE.SphereGeometry(10, 64, 64);
    let earthMat = new THREE.MeshStandardMaterial({
      map: albedoMap,
      bumpMap: bumpMap,
      bumpScale: 0.03,
      roughnessMap: oceanMap, // will get reversed in the shaders
      metalness: params.metalness, // gets multiplied with the texture values from metalness map
      metalnessMap: oceanMap,
    });
    this.earth = new THREE.Mesh(earthGeo, earthMat);
    this.group.add(this.earth); 

    // Set initial rotational position of Earth
    this.earth.rotateY(-0.3);
    scene.add(this.group);

    // 2. load the clouds map as a texture
    const cloudsMap = await loadTexture(Clouds)
    await updateLoadingProgressBar(0.4)


    // 3. create the clouds mesh using the cloudsMap texture
    let cloudGeo = new THREE.SphereGeometry(10.05, 64, 64)
    let cloudsMat = new THREE.MeshStandardMaterial({
      alphaMap: cloudsMap,
      transparent: true,
      opacity: .85,
    })
    this.clouds = new THREE.Mesh(cloudGeo, cloudsMat)
    this.group.add(this.clouds)

    // set initial rotational position of earth to get a good initial angle
    this.earth.rotateY(-0.3)
    // 1. also set cloud's initial rotational position same as earth so we can calculate shadows position correctly
    this.clouds.rotateY(-0.3)

    let atmosGeo = new THREE.SphereGeometry(12.5, 64, 64)
    let atmosMat = new THREE.ShaderMaterial({
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      uniforms: {
        atmOpacity: params.atmOpacity,
        atmPowFactor: params.atmPowFactor,
        atmMultiplier: params.atmMultiplier
      },
      // notice that by default, Three.js uses NormalBlending, where if your opacity of the output color gets lower, the displayed color might get whiter
      blending: THREE.AdditiveBlending, // works better than setting transparent: true, because it avoids a weird dark edge around the earth
      side: THREE.BackSide // such that it does not overlays on top of the earth; this points the normal in opposite direction in vertex shader
    })

    this.atmos = new THREE.Mesh(atmosGeo, atmosMat)
    this.group.add(this.atmos)
    
    // 2. Insert our custom shader code into the MeshStandardMaterial's shader code to calculate cloud shadows
    earthMat.onBeforeCompile = function( shader ) {

      shader.uniforms.tClouds = { value: cloudsMap }
      shader.uniforms.tClouds.value.wrapS = THREE.RepeatWrapping;
      shader.uniforms.uv_xOffset = { value: 0 }
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `
        #include <common>
        uniform sampler2D tClouds;
        uniform float uv_xOffset;
      `);

      shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', `
        #include <emissivemap_fragment>


        float cloudsMapValue = texture2D(tClouds, vec2(vMapUv.x - uv_xOffset, vMapUv.y)).r;
        
      
        diffuseColor.rgb *= max(1.0 - cloudsMapValue, 0.2 );
      `);

      shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>', `
        float roughnessFactor = roughness;

        #ifdef USE_ROUGHNESSMAP

          vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
          // reversing the black and white values because we provide the ocean map
          texelRoughness = vec4(1.0) - texelRoughness;

          // reads channel G, compatible with a combined OcclusionRoughnessMetallic (RGB) texture
          roughnessFactor *= clamp(texelRoughness.g, 0.5, 1.0);

        #endif
      `);

      // need save to userData.shader in order to enable our code to update values in the shader uniforms,
      // reference from https://github.com/mrdoob/three.js/blob/master/examples/webgl_materials_modified.html
      earthMat.userData.shader = shader
    }


    await updateLoadingProgressBar(1.0, 100);


    // On mouseup, trigger the click event only if not dragging
    window.addEventListener('mouseup', (event) => {
      
      if (!isDragging && !storyMode && isClickOnEarth(event)) {
        setGuiVisibility(false);
        storyMode = true;
        this.onClick(event);
        console.log("bye");
      }
      console.log("a"); 
    }, false);
   // window.addEventListener('mousup', this.onClick.bind(this), false);
  },

  async onClick(event) {
    // Get normalized device coordinates (-1 to +1) for both components
    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;

    // Raycaster to find intersected objects
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    // Calculate objects intersecting the picking ray
    const intersects = raycaster.intersectObject(this.earth);

      const intersect = intersects[0];
        // Assuming hitPoint is a Vector3 (intersection point from raycast in world coordinates)
      const hitPoint = intersect.point;  // Replace with actual hit point

      const localPoint = this.earth.worldToLocal(hitPoint);  // Convert to local coordinates

      // Extract x, y, z from localPoint
      const { x, y, z } = localPoint;

      // Convert to lat and lon
      const { lat, lon } = cartesianToSpherical(x, y, z);
      
      console.log(lat + ", " + lon);

      //USE HERE: do things with lat and lon
      await showStory(lat, lon);
},

  updateScene(interval, elapsed) {
    this.controls.update();
    this.earth.rotateY(interval * 0.005 * params.speedFactor);
    this.clouds.rotateY(interval * 0.01 * params.speedFactor)

    const shader = this.earth.material.userData.shader
    if ( shader ) {
      let offset = (interval * 0.005 * params.speedFactor) / (2 * Math.PI)
      shader.uniforms.uv_xOffset.value += offset % 1
    }  
  }
}

function isClickOnEarth(event) {
  // Get normalized device coordinates (-1 to +1) for both components
  const mouse = new THREE.Vector2();
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;

  // Create a raycaster
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera); // Set the raycaster from the camera using the mouse coordinates

  // Calculate objects intersecting the picking ray
  const intersects = raycaster.intersectObject(app.earth); // Assuming your Earth mesh is accessible as app.earth

  // Return true if there are intersections, otherwise false
  return intersects.length > 0;
}


function cartesianToSpherical(x, y, z) {
    // Compute the radius (distance from the origin)
    const radius = Math.sqrt(x * x + y * y + z * z);
  
    // Calculate latitude in degrees
    const lat = Math.asin(y / radius) * (180 / Math.PI);
  
    // Calculate longitude in degrees
    const lon = -Math.atan2(z, x) * (180 / Math.PI);
  
    return { lat, lon };
}


  

// Run the app
runApp(app, scene, renderer, camera, true, undefined, undefined);
alert("Welcome to Policy Path -- \n1) click anywhere on the globe\n2) see the impact of regional policies on carbon emissions!");
