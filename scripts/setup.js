import Main from './Main.js';
import global from '/library/scripts/core/global.js';

global.deviceType = "MOBILE";
global.isChrome = navigator.userAgent.indexOf('Chrome') !== -1;

function start() {
    window.main = new Main();
}

function hasPointerLock() {
    let capableOfPointerLock = 'pointerLockElement' in document || 'mozPointerLockElement' in document || 'webkitPointerLockElement' in document;
    return capableOfPointerLock;
}

function checkIfPointer() {
    if(hasPointerLock()) {
        global.deviceType = "POINTER";
    }
}

if('xr' in navigator) {
    navigator.xr.isSessionSupported( 'immersive-vr' )
        .then(function (supported) {
            if (supported) {
                global.deviceType = "XR";
            } else {
                checkIfPointer();
            }
        }).catch(function() {
            checkIfPointer();
        }).finally(function() {
            start();
        });
} else {
    checkIfPointer();
    start();
}
