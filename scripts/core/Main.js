import * as THREE from '../three/build/three.module.js';
import Skybox from '../components/Skybox.js';
import GLTFAsset from '../components/GLTFAsset.js';
import Spaceship from '../components/Spaceship.js';
import InputHandler from './InputHandler.js';
import SessionHandler from './SessionHandler.js';
import global from './global.js';

export default class Main {
    constructor() {
        this._renderer;
        this._scene;
        this._camera;
        this._shapes;
        this._clock = new THREE.Clock();
        this._container = document.getElementById('container');

        this._createRenderer();
        this._createScene();
        this._createUser();
        this._createHandlers();
        this._createAssets();
        this._addEventListeners();

        if(global.deviceType == "XR") {
            this._renderer.setAnimationLoop((time,frame) => {
                this._inputHandler.update(frame);
                this._update();
            });
        } else if (global.deviceType == "POINTER") {
            this._renderer.setAnimationLoop(() => { this._update(); });
        } else if (global.deviceType == "MOBILE") {
            this._renderer.setAnimationLoop(() => {
                this._sessionHandler.update();
                this._update();
            });
        }
    }

    _createRenderer() {
        this._renderer = new THREE.WebGLRenderer({ antialias : true });
        this._renderer.setSize(window.innerWidth, window.innerHeight);
        this._container.appendChild(this._renderer.domElement);
        if(global.deviceType == "XR") {
            this._renderer.xr.enabled = true;
        }

    }

    _createScene() {
        this._scene = new THREE.Scene();
    }

    _createUser() {
        this._camera = new THREE.PerspectiveCamera(
            45, //Field of View Angle
            window.innerWidth / window.innerHeight, //Aspect Ratio
            0.1, //Clipping for things closer than this amount
            1000 //Clipping for things farther than this amount
        );
        this._camera.position.setY(1.7); //Height of your eyes
        this._scene.add(this._camera);
    }

    _createHandlers() {
        this._sessionHandler = new SessionHandler(this._renderer, this._camera);
        this._inputHandler = new InputHandler(this._renderer, this._scene);
        global.inputHandler = this._inputHandler;
    }

    _createAssets() {
        let skybox = new Skybox({
            "Path": "./images/skyboxes/space/",
            "File Extension": ".png"
        });
        skybox.addToScene(this._scene);

        this._spaceship = new Spaceship({
            "Filename": "./models/lowpoly_spaceship.glb",
            "Speed": 1,
            "Scale": 0.01,
            "Position": [-8,2,-20],
            "Rotation": [0,-Math.PI/2,-Math.PI/4],
        });
        let planet = new GLTFAsset({
            "Filename": "./models/lowpoly_planet.glb",
            "Scale": 0.03,
            "Position": [10,2,-20],
            "Rotation": [0,0,0],
        });
        this._spaceship.addToScene(this._scene);
        planet.addToScene(this._scene);

        //Add light to the scene
        let light = new THREE.PointLight();
        light.position.setY(2);
        this._scene.add(light);
    }

    _addEventListeners() {
        window.addEventListener('resize', () => { this._onResize() });
        window.addEventListener('wheel', function(event) {
                    event.preventDefault();
        }, {passive: false, capture: true});
        
    }

    _onResize () {
        this._renderer.setSize(window.innerWidth, window.innerHeight);
        this._camera.aspect = window.innerWidth / window.innerHeight;
        this._camera.updateProjectionMatrix();
    }

    _update() {
        let timeDelta = this._clock.getDelta();
        this._spaceship.update(timeDelta);
        this._renderer.render(this._scene, this._camera);
    }
}
