import global from '/library/scripts/core/global.js';
import {insertWrappedTextToCanvas} from '/library/scripts/core/utils.module.js';
import * as THREE from '/library/scripts/three/build/three.module.js';

export default class MusicVisualizerMenu {
    constructor(params) {
        if(params == null) {
            params = {};
        }
        this._scale = (params['Scale']) ? params['Scale'] : 1;
        this._opacity = (params['Opacity']) ? params['Opacity'] : 1;
        this._position = (params['Position']) ? params['Position'] : [0,0,0];
        this._rotation = (params['Rotation']) ? params['Rotation'] : [0,0,0];

        this._pivotPoint = new THREE.Object3D();
        this._pointerPoint = new THREE.Object3D();
        if(global.deviceType == "XR") {
            global.inputHandler.getXRController("RIGHT", "targetRay")
                .add(this._pointerPoint);
        } else {
            this._pointerPoint.position.setX(0.2);
            global.camera.add(this._pointerPoint);
        }
        this._lineMesh;
        this._canvas = document.createElement("canvas");
        this._activeHand = "RIGHT";
        this._texture;
        this._menuMesh;
        this._state;
        this._priorState;
        this._playlists;
        this._playlistsOffset = 0;
        this._playlistsPage = 0;
        this._selectedPlaylist;
        this._playlistTracks;
        this._playlistTracksOffset = 0;
        this._playlistTracksPage = 0;
        this._selectedPlaylistTrack;
        this._visuals = global.musicVisualizerController.visualizations;
        this._visualsPage = 0;
        this._rateLimitReached = false;
        this._samplePlaying = false;
        this._playerActive = false;
        this._menuLock = true;

        this._pivotPoint.position.fromArray(this._position);
        this._pivotPoint.rotation.fromArray(this._rotation);

        this._createMeshes();
    }

    _createMeshes() {
        let width = 900;
        let height = 600;
        this._canvas.width = width;
        this._canvas.height = height;
        let context = this._getContextAndClearMenu();
        context.textAlign = "center";
        context.textBaseline = "middle";
        this._texture = new THREE.Texture(this._canvas);
        if(global.musicVisualizerController.spotifyEnabled) {
            this._state = "PLAYLISTS";
            this._writePlaylistsMenu();
        } else {
            this._menuLock = false;
            this._state = "SAMPLE";
            this._writeSampleMenu();
        }

        let geometry = new THREE.PlaneBufferGeometry(3 * this._scale, 2 * this._scale);
        let material = new THREE.MeshBasicMaterial({
            map: this._texture,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: this._opacity,
        });
        this._menuMesh = new THREE.Mesh( geometry, material );
        this._pivotPoint.add(this._menuMesh);
        this._menuMesh.material.map.needsUpdate = true;
        let lineMaterial = new THREE.LineBasicMaterial( { color: 0xff0000 } );
        let lineGeometry = new THREE.BufferGeometry();
        let vertices = new Float32Array( [
            0.0, 0.0, 0.0,
            0.0, 0.0, -2.0
        ]);
        lineGeometry.setAttribute( 'position', new THREE.BufferAttribute( vertices, 3 ) );
        lineGeometry.setDrawRange(0, 2);
        this._lineMesh = new THREE.Line( lineGeometry, lineMaterial );
        this._lineMesh.visible = false;
        this._pointerPoint.add(this._lineMesh);
    }

    _writeSampleMenu() {
        let context = this._getContextAndClearMenu();
        context.strokeStyle = "#FFFFFF";
        context.fillStyle = "#55FF55";
        context.font = '30px Arial';
        let text;
        if(this._rateLimitReached) {
            text = "Looks like too many people love this app and we've exceeded Spotify's limit. Message Spotify or tweet #spotify to let them know we all want #halfbakedcity limits raised";
        } else if(global.musicVisualizerController.jwt == null) {
            text = "Log In and Connect your Spotify Premium Account to play music from your playlists";
        } else if(global.musicVisualizerController.spotifyEnabled) {
            text = "Upgrade to Spotify Premium to play music from your playlists";
        } else {
            text = "Connect your Spotify Premium Account to play music from your playlists";
        }
        insertWrappedTextToCanvas(context, text, this._canvas.width / 2, this._canvas.height * 0.25, this._canvas.width * 0.9, 40);
        context.fillText("Sample", this._canvas.width / 2, this._canvas.height * 0.1);
        if(!this._samplePlaying) {
            context.fillText("Play Sample", this._canvas.width / 2, this._canvas.height * 0.8);
            context.strokeRect(this._canvas.width * 0.37, this._canvas.height * 0.74, this._canvas.width * 0.26, this._canvas.height * 0.12);
        }
        this._texture.needsUpdate = true;
    }

    _writePlaylistsMenu() {
        let context = this._getContextAndClearMenu();
        context.strokeStyle = "#FFFFFF";
        context.fillStyle = "#55FF55";
        context.font = '30px Arial';
        context.fillText("Playlists", this._canvas.width / 2, this._canvas.height * 0.1);
        context.strokeRect(this._canvas.width * 0.75, this._canvas.height * 0.05, this._canvas.width * 0.15, this._canvas.height * 0.1);
        context.fillText("Visuals", this._canvas.width * 0.825, this._canvas.height * 0.1);
        if(this._menuLock) {
            context.fillText("Loading", this._canvas.width / 2, this._canvas.height * 0.5);
        } else {
            let startingIndex = this._playlistsPage * 5 - this._playlistsOffset;
            let j = 0;
            if(this._playlistsPage != 0) {
                context.strokeRect(this._canvas.width * 0.02, this._canvas.height * 0.175, this._canvas.width * 0.06, this._canvas.height * 0.75);
                context.fillText("<", this._canvas.width * 0.05, this._canvas.height * 0.5625);
            }
            if(this._playlistsPage != Math.floor(Math.abs((this._totalPlaylists - 1) / 5))) {
                context.strokeRect(this._canvas.width * 0.92, this._canvas.height * 0.175, this._canvas.width * 0.06, this._canvas.height * 0.75);
                context.fillText(">", this._canvas.width * 0.95, this._canvas.height * 0.5625);
            }
            context.textAlign = "left";
            for(let i = startingIndex; i < Math.min(startingIndex + 5, this._playlists.length); i++) {
                context.strokeRect(this._canvas.width * 0.1, this._canvas.height * (0.175 + j * 0.15), this._canvas.width * 0.8, this._canvas.height * 0.15);
                context.fillText(this._playlists[i].name, this._canvas.width * 0.15, this._canvas.height * (0.25 + 0.15 * j));
                j++;
            }
        }
        this._texture.needsUpdate = true;
    }

    _writePlaylistTracksMenu() {
        let context = this._getContextAndClearMenu();
        context.strokeStyle = "#FFFFFF";
        context.fillStyle = "#55FF55";
        context.font = '30px Arial';
        context.fillText(this._selectedPlaylist.name, this._canvas.width / 2, this._canvas.height * 0.1);
        context.strokeRect(this._canvas.width * 0.1, this._canvas.height * 0.05, this._canvas.width * 0.15, this._canvas.height * 0.1);
        context.fillText("Playlists", this._canvas.width * 0.175, this._canvas.height * 0.1);
        context.strokeRect(this._canvas.width * 0.75, this._canvas.height * 0.05, this._canvas.width * 0.15, this._canvas.height * 0.1);
        context.fillText("Visuals", this._canvas.width * 0.825, this._canvas.height * 0.1);
        if(this._menuLock) {
            context.fillText("Loading", this._canvas.width / 2, this._canvas.height * 0.5);
        } else {
            let startingIndex = this._playlistTracksPage * 5 - this._playlistTracksOffset;
            let j = 0;
            if(this._playlistTracksPage != 0) {
                context.strokeRect(this._canvas.width * 0.02, this._canvas.height * 0.175, this._canvas.width * 0.06, this._canvas.height * 0.75);
                context.fillText("<", this._canvas.width * 0.05, this._canvas.height * 0.5625);
            }
            if(this._playlistTracksPage != Math.floor(Math.abs((this._totalPlaylistTracks - 1) / 5))) {
                context.strokeRect(this._canvas.width * 0.92, this._canvas.height * 0.175, this._canvas.width * 0.06, this._canvas.height * 0.75);
                context.fillText(">", this._canvas.width * 0.95, this._canvas.height * 0.5625);
            }
            context.textAlign = "left";
            for(let i = startingIndex; i < Math.min(startingIndex + 5, this._playlistTracks.length); i++) {
                context.strokeRect(this._canvas.width * 0.1, this._canvas.height * (0.175 + j * 0.15), this._canvas.width * 0.8, this._canvas.height * 0.15);
                context.fillText(this._playlistTracks[i].track.name, this._canvas.width * 0.15, this._canvas.height * (0.25 + 0.15 * j));
                j++;
            }
        }
        this._texture.needsUpdate = true;
    }

    _writeVisualsMenu() {
        let context = this._getContextAndClearMenu();
        context.strokeStyle = "#FFFFFF";
        context.fillStyle = "#55FF55";
        context.font = '30px Arial';
        context.fillText("Visuals", this._canvas.width / 2, this._canvas.height * 0.1);
        context.strokeRect(this._canvas.width * 0.1, this._canvas.height * 0.05, this._canvas.width * 0.15, this._canvas.height * 0.1);
        context.fillText("Back", this._canvas.width * 0.175, this._canvas.height * 0.1);
        let startingIndex = this._visualsPage * 5
        let j = 0;
        if(this._visualsPage != 0) {
            context.strokeRect(this._canvas.width * 0.02, this._canvas.height * 0.175, this._canvas.width * 0.06, this._canvas.height * 0.75);
            context.fillText("<", this._canvas.width * 0.05, this._canvas.height * 0.5625);
        }
        if(this._visualsPage != Math.floor(Math.abs((this._visuals.length - 1) / 5))) {
            context.strokeRect(this._canvas.width * 0.92, this._canvas.height * 0.175, this._canvas.width * 0.06, this._canvas.height * 0.75);
            context.fillText(">", this._canvas.width * 0.95, this._canvas.height * 0.5625);
        }
        context.textAlign = "left";
        for(let i = startingIndex; i < Math.min(startingIndex + 5, this._visuals.length); i++) {
            context.strokeRect(this._canvas.width * 0.1, this._canvas.height * (0.175 + j * 0.15), this._canvas.width * 0.8, this._canvas.height * 0.15);
            context.fillText(this._visuals[i].name, this._canvas.width * 0.15, this._canvas.height * (0.25 + 0.15 * j));
            j++;
        }
        this._texture.needsUpdate = true;
    }

    _getContextAndClearMenu() {
        let context = this._canvas.getContext('2d');
        //context.fillStyle = "#080808";
        context.fillStyle = "#051616";
        context.fillRect(0, 0, this._canvas.width, this._canvas.height);
        context.textAlign = "center";
        return context;
    }

    _getPlaylists() {
        $.ajax({
            url: 'https://api.spotify.com/v1/me/playlists?limit=50&offset=' + this._playlistsOffset,
            type: "GET",
            beforeSend: (xhr) => {
                    xhr.setRequestHeader("Authorization", "Bearer " + global.musicVisualizerController.spotifyToken);
            },
            success: (response) => {
                this._playlists = response.items;
                this._totalPlaylists = response.total;
                this._menuLock = false;
                this._writePlaylistsMenu();
            },
            error: (xhr, status, error) => {
                let response = xhr.responseJSON;
                console.log(response);
            },
        });
    }

    _getPlaylistTracks() {
        $.ajax({
            url: 'https://api.spotify.com/v1/playlists/' + this._selectedPlaylist.id + '/tracks?limit=100&offset=' + this._playlistTracksOffset,
            type: "GET",
            beforeSend: (xhr) => {
                    xhr.setRequestHeader("Authorization", "Bearer " + global.musicVisualizerController.spotifyToken);
            },
            success: (response) => {
                //console.log(response);
                this._playlistTracks = response.items;
                this._totalPlaylistTracks = response.total;
                this._menuLock = false;
                this._writePlaylistTracksMenu();
            },
            error: (xhr, status, error) => {
                let response = xhr.responseJSON;
                console.log(response);
            },
        });
    }

    _pressTriggerOnMenu(intersection) {
        if(this._menuLock) {
            return;
        }
        this._triggerPressed = true;
        if(intersection == null) {
            intersection = this._getIntersection();
        }
        if(intersection != null) {
            let point = intersection.point.clone();
            this._pivotPoint.worldToLocal(point);
            let width = 3 * this._scale;
            let height = 2 * this._scale;
            console.log("X: " + point.x + ", Y: " + point.y);
            if(this._state == "SAMPLE") {
                if(!this._samplePlaying) {
                    if(height * -0.36 < point.y && point.y < height * -0.24) {
                        if(width * -0.13 < point.x && point.x < width * 0.13) {
                            global.musicVisualizerController.playSample();
                            this._samplePlaying = true;
                            this._writeSampleMenu();
                        }
                    }
                }
            } else if(this._state == "PLAYLISTS") {
                if(height * -0.425 < point.y && point.y < height * 0.325) {
                    if(this._playlistsPage != Math.floor(Math.abs((this._totalPlaylists - 1) / 5)) && width * 0.42 < point.x && point.x < width * 0.48) {
                        this._playlistsPage++;
                        if(this._playlistsPage * 5 >= this._playlistsOffset + 50) {
                            this._menuLock = true;
                            this._writePlaylistsMenu();
                            this._playlistsOffset = this._playlistsOffset + 50;
                            this._getPlaylists();
                        } else {
                            this._writePlaylistsMenu();
                        }
                    } else if(this._playlistsPage != 0 && width * -0.48 < point.x && point.x < width * -0.42) {
                        this._playlistsPage--;
                        if(this._playlistsPage * 5 < this._playlistsOffset) {
                            this._menuLock = true;
                            this._writePlaylistsMenu();
                            this._playlistsOffset = this._playlistsOffset - 50;
                            this._getPlaylists();
                        } else {
                            this._writePlaylistsMenu();
                        }
                    } else if(width * -0.4 < point.x && point.x < width * 0.4) {
                        let index = Math.floor((point.y - (height * 0.325)) / (-0.15 * height));
                        index = this._playlistsPage * 5 + index - this._playlistsOffset;
                        if(index < this._playlists.length) {
                            this._selectedPlaylist = this._playlists[index];
                            this._playlistTracksOffset = 0;
                            this._playlistTracksPage = 0;
                            this._menuLock = true;
                            this._state = "PLAYLIST_TRACKS";
                            this._writePlaylistTracksMenu();
                            this._getPlaylistTracks();
                        }
                    }
                } else if(height * 0.35 < point.y && point.y < height * 0.45) {
                    if(width * 0.25 < point.x && point.x < width * 0.4) {
                        this._state = "VISUALS";
                        this._priorState = "PLAYLISTS";
                        this._writeVisualsMenu();
                    }
                }
            } else if(this._state == "PLAYLIST_TRACKS") {
                if(height * -0.425 < point.y && point.y < height * 0.325) {
                    if(this._playlistTracksPage != Math.floor(Math.abs((this._totalPlaylistTracks - 1) / 5)) && width * 0.42 < point.x && point.x < width * 0.48) {
                        this._playlistTracksPage++;
                        if(this._playlistTracksPage * 5 >= this._playlistTracksOffset + 50) {
                            this._menuLock = true;
                            this._writePlaylistTracksMenu();
                            this._playlistTracksOffset = this._playlistTracksOffset + 50;
                            this._getPlaylistTracks();
                        } else {
                            this._writePlaylistTracksMenu();
                        }
                    } else if(this._playlistTracksPage != 0 && width * -0.48 < point.x && point.x < width * -0.42) {
                        this._playlistTracksPage--;
                        if(this._playlistTracksPage * 5 < this._playlistTracksOffset) {
                            this._menuLock = true;
                            this._writePlaylistTracksMenu();
                            this._playlistTracksOffset = this._playlistTracksOffset - 50;
                            this._getPlaylistTracks();
                        } else {
                            this._writePlaylistTracksMenu();
                        }
                    } else if(width * -0.4 < point.x && point.x < width * 0.4) {
                        let index = Math.floor((point.y - (height * 0.325)) / (-0.15 * height));
                        index = this._playlistTracksPage * 5 + index - this._playlistTracksOffset;
                        if(index < this._playlistTracks.length) {
                            this._selectedPlaylistTrack = this._playlistTracks[index];
                            global.musicVisualizerController.playTrack(this._selectedPlaylistTrack.track.uri, this._selectedPlaylist.uri);
                        }
                    }
                } else if(height * 0.35 < point.y && point.y < height * 0.45) {
                    if(width * -0.4 < point.x && point.x < width * -0.25) {
                        this._state = "PLAYLISTS";
                        this._writePlaylistsMenu();
                    } else if(width * 0.25 < point.x && point.x < width * 0.4) {
                        this._state = "VISUALS";
                        this._priorState = "PLAYLIST_TRACKS";
                        this._writeVisualsMenu();
                    }
                }
            } else if(this._state == "VISUALS") {
                if(height * -0.425 < point.y && point.y < height * 0.325) {
                    if(this._visualsPage != Math.floor(Math.abs((this._totalPlaylists - 1) / 5)) && width * 0.42 < point.x && point.x < width * 0.48) {
                        this._visualsPage++;
                        this._writeVisualsMenu();
                    } else if(this._visualsPage != 0 && width * -0.48 < point.x && point.x < width * -0.42) {
                        this._visualsPage--;
                        this._writeVisualsMenu();
                    } else if(width * -0.4 < point.x && point.x < width * 0.4) {
                        let index = Math.floor((point.y - (height * 0.325)) / (-0.15 * height));
                        index = this._visualsPage * 5 + index;
                        if(index < this._visuals.length) {
                            global.musicVisualizerController.selectVisualization(index);
                        }
                    }
                } else if(height * 0.35 < point.y && point.y < height * 0.45) {
                    if(width * -0.4 < point.x && point.x < width * -0.25) {
                        this._state = this._priorState;
                        if(this._state == "PLAYLISTS") {
                            this._writePlaylistsMenu();
                        } else if(this._state == "PLAYLIST_TRACKS") {
                            this._writePlaylistTracksMenu();
                        }
                    }
                }
            }
        }
    }

    _pressTriggerOffMenu(intersection) {
        this._triggerPressed = true;
        this._pivotPoint.visible = !this._pivotPoint.visible;
    }

    _releaseTrigger() {
        this._triggerPressed = false;
    }

    _getIntersection() {
        let position = new THREE.Vector3();
        let direction = new THREE.Vector3();
        this._pointerPoint.getWorldPosition(position);
        this._pointerPoint.getWorldDirection(direction);
        direction.negate();
        let raycaster = new THREE.Raycaster(position, direction, 0.01, 5);
        let intersections = raycaster.intersectObject(this._menuMesh);
        if(intersections.length > 0) {
            return intersections[0];
        } else {
            return null;
        }
    }

    _updateLine(intersection) {
        let localIntersection = intersection.point.clone();
        this._pointerPoint.worldToLocal(localIntersection);
        let positions = this._lineMesh.geometry.attributes.position.array;
        positions[3] = localIntersection.x;
        positions[4] = localIntersection.y;
        positions[5] = localIntersection.z;
        this._lineMesh.geometry.attributes.position.needsUpdate = true;
    }

    _changeHands(newHand) {
        if(global.deviceType == "XR") {
            if(newHand == "RIGHT") {
                global.inputHandler.getXRController("RIGHT", "targetRay")
                    .add(this._pointerPoint);
            } else if(newHand == "LEFT") {
                global.inputHandler.getXRController("LEFT", "targetRay")
                    .add(this._pointerPoint);
            }
        }
    }

    addToScene(scene) {
        scene.add(this._pivotPoint);
    }

    removeFromScene() {
        this._pivotPoint.parent.remove(this._pivotPoint);
        fullDispose(this._pivotPoint);
    }

    _isTriggerInputPressed() {
        if(global.deviceType == "XR") {
            let gamepad = global.inputHandler.getXRGamepad(this._activeHand);
            return gamepad != null && gamepad.buttons[0].pressed;
        } else if(global.deviceType == "POINTER") {
            return global.inputHandler.isKeyPressed("Space");
        } else if(global.deviceType == "MOBILE") {
            return global.inputHandler.isScreenTouched();
        }
    }

    update(timeDelta) {
        if(this._playerActive != global.musicVisualizerController.playerActive) {
            if(!global.musicVisualizerController.isSpotifyPremium) {
                this._menuLock = false;
                this._state = "SAMPLE";
                this._writeSampleMenu();
            } else if(global.musicVisualizerController.playerActive) {
                this._getPlaylists();
            } else {
                //TODO: Notify User Spotify is not connected
                console.error("TODO: Notify User Spotify is not conencted");
            }
            this._playerActive = global.musicVisualizerController.playerActive;
        }
        if(global.sessionActive) {
            let intersection = null;
            if(this._pivotPoint.visible) {
                intersection = this._getIntersection();
            }
            if(intersection != null) {
                this._updateLine(intersection);

                if(!this._lineMesh.visible) {
                    this._lineMesh.visible = true;
                }
                let triggerInputPressed = this._isTriggerInputPressed();
                if(!this._triggerPressed) {
                    if(triggerInputPressed) {
                        this._pressTriggerOnMenu(intersection);
                    }
                } else if(!triggerInputPressed) {
                    this._releaseTrigger();
                }
            } else {
                if(this._lineMesh.visible) {
                    this._lineMesh.visible = false;
                }
                let triggerInputPressed = this._isTriggerInputPressed();
                if(!this._triggerPressed) {
                    if(triggerInputPressed) {
                        this._pressTriggerOffMenu(intersection);
                    }
                } else if(!triggerInputPressed) {
                    this._releaseTrigger();
                }
            }
        }
        if(this._state == "SAMPLE" && this._samplePlaying && !global.musicVisualizerController._sound.isPlaying) {
            this._samplePlaying = false;
            this._writeSampleMenu();
        }
        if(global.musicVisualizerController.rateLimitReached && !this._rateLimitReached) {
            this._rateLimitReached = true;
            this._state = "SAMPLE";
            this._writeSampleMenu();
        }
    }

    canUpdate() {
        return "musicVisualizerController" in global;
    }

    static isDeviceTypeSupported(deviceType) {
        return true;
    }

    static getScriptType() {
        return 'ASSET';
    }

    static getFields() {
        return [
            {
                "name": "Scale",
                "type": "float",
                "default": 1
            },
            {
                "name": "Opacity",
                "type": "float",
                "default": 1
            },
            {
                "name": "Position",
                "type": "list3",
                "default": [0,0,0]
            },
            {
                "name": "Rotation",
                "type": "list3",
                "default": [0,0,0]
            },
        ];
    }

}
