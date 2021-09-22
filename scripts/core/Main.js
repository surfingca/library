import * as THREE from '../three/build/three.module.js';
import Skybox from '../components/Skybox.js';
import GLTFAsset from '../components/GLTFAsset.js';
import Spaceship from '../components/Spaceship.js';
import InputHandler from './InputHandler.js';
import SessionHandler from './SessionHandler.js';
import global from './global.js';
import MusicVisualizerController from './MusicVisualizerController.js';
import SunsVisualization from './SunsVisualization.js';
import GalacticLightsVisualization from './GalacticLightsVisualization.js';
import HopalongAttractorVisualization from './HopalongAttractorVisualization.js';
import MusicVisualizerMenu from './MusicVisualizerMenu.js';
import BasicMovement from '/library/scripts/components/BasicMovement.js';
import AddImmersion from '/library/scripts/components/AddImmersion.js';

import AudioHandler from '/library/scripts/core/AudioHandler.js';
import InputHandler from '/library/scripts/core/InputHandler.js';
import SessionHandler from '/library/scripts/core/SessionHandler.js';
import global from '/library/scripts/core/global.js';
import * as THREE from '/library/scripts/three/build/three.module.js';

export default class Main {
    constructor() {
        this._renderer;
        this._scene;
        this._camera;
        this._shapes;
        this._clock = new THREE.Clock();
        this._container = document.getElementById('container');
        this._loadingMessage = document.querySelector('#loading');
        this._dynamicAssets = [];
        global.loadingAssets = new Set();

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
        };
    }

    _createRenderer() {
        this._renderer = new THREE.WebGLRenderer({ antialias : true });
        this._renderer.setSize(window.innerWidth, window.innerHeight);
        this._container.appendChild(this._renderer.domElement);
        if(global.deviceType == "XR") {
            this._renderer.xr.enabled = true;
        }
        global.renderer = this._renderer;
    }

    _createScene() {
        this._scene = new THREE.Scene();
        global.scene = this._scene;
    }

    _createUser() {
        this._user = new THREE.Object3D();
        this._camera = new THREE.PerspectiveCamera(
            45, //Field of View Angle
            window.innerWidth / window.innerHeight, //Aspect Ratio
            0.001, //Clipping for things closer than this amount
            1000 //Clipping for things farther than this amount
        );
        this._camera.position.setY(1.7); //Height of your eyes
        this._user.add(this._camera);
        this._scene.add(this._user);
        global.user = this._user;
        global.camera = this._camera;
    }

    _createHandlers() {
        this._sessionHandler = new SessionHandler(this._renderer, this._camera);
        this._inputHandler = new InputHandler(this._renderer, this._user);
        this._audioHandler = new AudioHandler();
        global.inputHandler = this._inputHandler;
    }

    _createAssets() {
        if(BasicMovement.isDeviceTypeSupported(global.deviceType)) {
            let basicMovement = new BasicMovement({ 'Movement Speed (m/s)': 3 });
            this._dynamicAssets.push(basicMovement);
        }

        let musicVisualizerController = new MusicVisualizerController({
            "Sample Music": "/library/audios/c_u_again-cartoon.mp3",
        });
        this._dynamicAssets.push(musicVisualizerController);

        let musicVisualizerMenu = new MusicVisualizerMenu({
            "Scale": 1.25,
            "Position": [0,2,-4],
        });
        musicVisualizerMenu.addToScene(this._scene);
        this._dynamicAssets.push(musicVisualizerMenu);

        let hopalongAttractorVisualization = new HopalongAttractorVisualization({
            "Sprite": "/library/images/galaxy_sprite.png",
            "Levels": 7,
            "Subsets": 3,
        });

        let sunsVisualization = new SunsVisualization({
            "Sun Surface": "/library/images/sun_surface_compressed.jpg",
            "Sun Atmosphere": "/library/images/sun_atmosphere.png",
        });

        let galacticLightsVisualization = new GalacticLightsVisualization({
            "Sprite": "/library/images/galaxy_sprite.png",
        });
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

    _loading() {
        if(global.loadingAssets.size == 0) {
            new AddImmersion();
            $(this._loadingMessage).removeClass("loading");
            this._sessionHandler.displayButton();
            if(global.deviceType == "XR") {
                this._renderer.setAnimationLoop((time, frame) => {
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
        } else {
            $(this._loadingMessage).html("<h2>Loading "
                + global.loadingAssets.size + " more asset(s)</h2>");
        }
    }

    _update() {
        let timeDelta = this._clock.getDelta();
        for(let i = 0; i < this._dynamicAssets.length; i++) {
            this._dynamicAssets[i].update(timeDelta);
        }
        this._renderer.render(this._scene, this._camera);
    }
}

