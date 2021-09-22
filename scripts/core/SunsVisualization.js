import global from '/library/scripts/core/global.js';
import {
    createLoadingLock,
    fullDispose
} from '/library/scripts/core/utils.module.js';
import * as THREE from '/library/scripts/three/build/three.module.js';

export default class SunsVisualization {
    constructor(params) {
        if(params == null) {
            params = {};
        }
        this._surface = (params['Sun Surface'])
            ? params['Sun Surface']
            : '/library/defaults/default.png';
        this._atmosphere = (params['Sun Atmosphere'])
            ? params['Sun Atmosphere']
            : '/library/defaults/default.png';
        this._size = (params['Sun Size']) ? params['Sun Size'] : 1;
        this._rings = (params['Rings']) ? params['Rings'] : 6;


        this._pivotPoint = new THREE.Object3D();
        this._sunGroups = new THREE.Object3D();
        this._materials = [];
        this._sunMesh;
        this._audioAnalysis;

        this._pivotPoint.add(this._sunGroups);
        //this._pivotPoint.translateZ(-30);
        this._pivotPoint.translateY(1.7);
        //this._pivotPoint.scale.set(2,2,2);

        this._createShaders();
        this._createMeshes();
        if("musicVisualizerController" in global) {
            global.musicVisualizerController.registerVisualization(this, "Suns");
        }
    }

    _createShaders() {
        this._fragmentShader = 'uniform float time;\n' +
                    'uniform sampler2D texture1;\n' +
                    'uniform sampler2D texture2;\n' +
                    'varying vec2 texCoord;\n' +
                    'void main( void ) {\n' +
                    '   vec4 noise = texture2D( texture1, texCoord );\n' +
                    '   vec2 T1 = texCoord + vec2( 1.5, -1.5 ) * time  * 0.01;\n' +
                    '   vec2 T2 = texCoord + vec2( -0.5, 2.0 ) * time *  0.01;\n' +
                    '   T1.x -= noise.r * 2.0;\n' +
                    '   T1.y += noise.g * 4.0;\n' +
                    '   T2.x += noise.g * 0.2;\n' +
                    '   T2.y += noise.b * 0.2;\n' +
                    '   float p = texture2D( texture1, T1 * 2.0 ).a + 0.25;\n' +
                    '   vec4 color = texture2D( texture2, T2 );\n' +
                    '   vec4 temp = color * 2.0 * ( vec4( p, p, p, p ) ) + ( color * color );\n' +
                    '   gl_FragColor = temp;\n' +
                    '}';
        this._vertexShader = 'varying vec2 texCoord;\n' +
                    'void main() {\n' +
                    '	texCoord = uv;\n' +
                    '	vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );\n' +
                    '	gl_Position = projectionMatrix * mvPosition;\n' +
                    '}';
    }

    _createMeshes() {
        let light = new THREE.PointLight(0xffffff,1,0,1);
        let light2 = light.clone();
        light.translateY(100);
        light2.translateY(-100);
        this._pivotPoint.add(light);
        this._pivotPoint.add(light2);
        let sunGroup = new THREE.Object3D();
        for(let i = 1; i < this._rings + 1; i++) {
            //let geometry = new THREE.TorusKnotBufferGeometry( 1, 0.4, 64, 8 );
            let geometry = new THREE.TorusBufferGeometry( i / 2 + 0.8, 0.2, 2, 100 );
            let material = new THREE.MeshPhongMaterial();
            material.color.setHSL(i * 2.3 / this._rings, 1, 0.6);
            //material.color.setHSL(Math.random(), 1, 0.6);
            this._materials.push(material);
            let torus = new THREE.Mesh( geometry, material );
            //torus.rotation.x = Math.PI * Math.random();
            //torus.rotation.y = Math.PI * Math.random();
            //torus.rotation.z = Math.PI * Math.random();
            sunGroup.add(torus);
        }
        let lock = createLoadingLock();
        new THREE.TextureLoader().load(
            this._surface,
            (surfaceTexture) => {
                new THREE.TextureLoader().load(
                    this._atmosphere,
                    (atmosphereTexture) => {
                        this._uniforms = {
                            time: {
                                //type: "f",
                                value: 1.0
                            },
                            texture1: {
                                //type: "t",
                                value: atmosphereTexture
                            },
                            texture2: {
                                //type: "t",
                                value: surfaceTexture
                            }
                        };
                        this._uniforms.texture1.value.wrapS = THREE.RepeatWrapping;
                        this._uniforms.texture1.value.wrapT = THREE.RepeatWrapping;
                        this._uniforms.texture2.value.wrapS = THREE.RepeatWrapping;
                        this._uniforms.texture2.value.wrapT = THREE.RepeatWrapping;
                        let material = new THREE.ShaderMaterial({
                            uniforms: this._uniforms,
                            vertexShader: this._vertexShader,
                            fragmentShader: this._fragmentShader
                        });
                        let geometry = new THREE.SphereGeometry(this._size, 64, 64);
                        this._sunMesh = new THREE.Mesh(geometry, material);
                        sunGroup.add(this._sunMesh);
                        this._multiplyAndAddSunGroups(sunGroup);
                        global.loadingAssets.delete(lock);
                    }
                );
            }
        );
    }

    _multiplyAndAddSunGroups(sunGroup) {
        let scalePoint = new THREE.Object3D();
        let pivotPoint = new THREE.Object3D();
        scalePoint.add(sunGroup);
        pivotPoint.add(scalePoint);
        this._randomizeRings(pivotPoint.children[0].children[0]);
        this._sunGroups.add(pivotPoint);
        for(let i = 0; i < 17; i++) {
            let clone = pivotPoint.clone();
            this._randomizeRings(clone.children[0].children[0]);
            this._sunGroups.add(clone);
        }
        for(let i = 0; i < 8; i++) {
            let child = this._sunGroups.children[i];
            child.children[0].translateZ(-15);
            child.rotation.y = Math.PI * i / 4;
        }
        for(let i = 8; i < 12; i++) {
            let child = this._sunGroups.children[i];
            let child2 = this._sunGroups.children[i+4];
            child.children[0].translateZ(-15);
            child2.children[0].translateZ(-15);
            child.rotateY(Math.PI * i / 2);
            child2.rotateY(Math.PI * i / 2);
            child.rotateX(Math.PI / 4);
            child2.rotateX(-Math.PI / 4);
        }
        this._sunGroups.children[16].children[0].translateZ(-15);
        this._sunGroups.children[17].children[0].translateZ(-15);
        this._sunGroups.children[16].rotateX(Math.PI / 2);
        this._sunGroups.children[17].rotateX(-Math.PI / 2);
    }

    _randomizeRings(sunGroup) {
        for(let i = 0; i < sunGroup.children.length-1; i++) {
            let ring = sunGroup.children[i];
            ring.rotation.x = Math.PI * Math.random();
            ring.rotation.y = Math.PI * Math.random();
            ring.rotation.z = Math.PI * Math.random();
        }
    }
    
    addToScene(scene, fromController) {
        if(fromController) {
            scene.add(this._pivotPoint);
        }
    }

    removeFromScene() {
        this._pivotPoint.parent.remove(this._pivotPoint);
        fullDispose(this._pivotPoint);
    }

    _mapToSigmoid(x) {
        return 1 / (1 + Math.E**(4-8*x));
    }

    _updateFromAudioAnalysis() {
        if(this._audioAnalysis != global.musicVisualizerController.audioAnalysis) {
            this._audioAnalysis = global.musicVisualizerController.audioAnalysis;
            this._currentSegmentIndex = 0;
            this._currentLoudness = null;
        }
        if(this._audioAnalysis != null) {
            let audioPosition = global.musicVisualizerController.getAudioPosition();
            let response = this._audioAnalysis.getCurrentLoudness(audioPosition, this._currentSegmentIndex);
            if(response != null) {
                this._currentLoudness = response.currentLoudness;
                this._currentSegmentIndex = response.index;
            }
        }
    }

    update(timeDelta) {
        this._updateFromAudioAnalysis();
        for(let i = 1; i < this._rings + 1; i++) {
            this._materials[i-1].color.offsetHSL(timeDelta / (15 + i), 0, 0);
        }
        for(let i = 0; i < this._sunGroups.children.length; i++) {
            if(this._currentLoudness != null) {
                let scaledLoudness = this._audioAnalysis.scaleLoudness(this._audioAnalysis.clipLoudness(this._currentLoudness));
                let scale = scaledLoudness / 1 + 0.5;
                //let scale = this._mapToSigmoid(scaledLoudness) * 2;
                this._sunGroups.children[i].children[0].children[0].scale.set(scale, scale, scale);
            } else {
                this._sunGroups.children[i].children[0].children[0].scale.set(1,1,1);
            }
            let ringsAndSun = this._sunGroups.children[i].children[0].children[0].children;
            for(let j = 0; j < ringsAndSun.length - 1; j++) {
                ringsAndSun[j].rotation.x += Math.PI * timeDelta / (j + 1) / 2;
                ringsAndSun[j].rotation.y += Math.PI * timeDelta / (j + 1.3) / 2;
            }
            ringsAndSun[ringsAndSun.length-1].rotation.y -= timeDelta / 3;
        }
        this._uniforms.time.value += timeDelta * 2;
    }

    canUpdate() {
        return false;//Well, actually this can be updated, but we won't have it updated by the main class
    }

    static isDeviceTypeSupported(deviceType) {
        return true;
    }

    static getFields() {
        return [
            {
                "name": "Sun Surface",
                "type": "image",
                "default": "/library/defaults/default.png"
            },
            {
                "name": "Sun Atmosphere",
                "type": "image",
                "default": "/library/defaults/default.png"
            },
            {
                "name": "Sun Size",
                "type": "float",
                "default": 1
            },
            {
                "name": "Rings",
                "type": "integer",
                "default": 6
            },
        ];
    }
}
