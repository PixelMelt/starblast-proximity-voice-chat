// ==UserScript==
// @name         SB VC
// @version      0.0.1
// @description  Proximity voice chat for Starblast
// @author       Pix
// @namespace    https://greasyfork.org/en/users/226344
// @license      All rights reserved, this code may not be reproduced or used in any way without the express written consent of the author.
// @match        https://starblast.io/
// @grant        none
// @run-at        document-end
// ==/UserScript==

const server = 'sbvc.fly.dev';
const port = 443;
// const server = '127.0.0.1';
// const port = 3000;

function runExternalScript(url){
    // xhr
    // var xhr = new XMLHttpRequest();
    // xhr.open('GET', url, true);
    // xhr.setRequestHeader('package', 'true');
    // xhr.onload = function() {
    //     if (xhr.status === 200) {
    //         var script = document.createElement('script');
    //         script.textContent = xhr.responseText;
    //         document.head.appendChild(script);
    //     } else {
    //         console.error(`Error loading script: ${url}`);
    //     }
    // }
    // xhr.send();

    // script tag
    var script = document.createElement('script');
    script.src = url;
    document.head.appendChild(script);
}

runExternalScript(`https://cdnjs.cloudflare.com/ajax/libs/peerjs/1.3.1/peerjs.min.js`)
runExternalScript(`https://cdnjs.cloudflare.com/ajax/libs/socket.io/2.4.0/socket.io.js`)

setTimeout(() => {
    const $ = document.querySelector.bind(document);
    var vclog = function(msg){console.log(`%c[SB VC] ${msg}`, "color: #768bd1");}
    
    
    
    let audioStream;
    let isMuted = false; // Add a variable to track the mute state
    const muteKey = 'm'; // Change this to the key you want to use for muting
    
    
    const SOUND_CUTOFF_RANGE = 160;
    const SOUND_NEAR_RANGE = 20;
    window.myPos = {x: 0, y: 0};
    var lastPos = {x: 0, y: 0};
    var players = [];
    var id, peer;
    
    const socket = io(`https://${server}${port ? `:${port}` : ''}`);
    
    // ask for mic permission, if denied, tell the user to enable it
    navigator.mediaDevices.getUserMedia({audio: true}).then(stream => {
        vclog('Mic permission granted.');
    }).catch(err => {
        vclog('Mic permission denied. Please enable it in your browser settings.');
        alert('Mic permission denied. Please enable it in your browser settings.');
    });

    function getGame(){
        // bacon?
        return window.location.href.replace(`https://starblast.io/`,``);
    }

    // throttle a function
    const throttle = (func, limit) => {
        let lastFunc
        let lastRan
        return function() {
            const context = this
            const args = arguments
            if (!lastRan) {
                func.apply(context, args)
                lastRan = Date.now()
            } else {
                clearTimeout(lastFunc)
                lastFunc = setTimeout(function() {
                    if ((Date.now() - lastRan) >= limit) {
                        func.apply(context, args)
                lastRan = Date.now()
            }
            }, limit - (Date.now() - lastRan))
        }
        }
    }
    
    // move the player
    function movePlayer(x, y) {
        window.myPos.x = x;
        window.myPos.y = y;
        emitPos();
    }
    
    function calcVolumes(listenerPos, soundPos) {
        if(listenerPos == undefined || soundPos == undefined) return [0, 0];
        if(listenerPos.x == "unknown" || listenerPos.y == "unknown" || soundPos.x == "unknown" || soundPos.y == "unknown") return [0, 0];
        // calulate angle and distance from listener to sound
        const theta = Math.atan2(soundPos.y - listenerPos.y, soundPos.x - listenerPos.x);
        const dist = Math.hypot(soundPos.y - listenerPos.y, soundPos.x - listenerPos.x);
        const scale = 1 - (dist - SOUND_NEAR_RANGE) / (SOUND_CUTOFF_RANGE - SOUND_NEAR_RANGE);
    
        // target is too far away, no volume
        if (dist > SOUND_CUTOFF_RANGE)
            return [0, 0];
    
        // target is very close, max volume
        if (dist < SOUND_NEAR_RANGE)
            return [1, 1];
    
        const cos = Math.cos(theta);
        const sin = Math.sin(theta);
    
        return [
            (Math.pow((cos < 0 ? cos : 0), 2) + Math.pow(sin, 2)) * scale,
            (Math.pow((cos > 0 ? cos : 0), 2) + Math.pow(sin, 2)) * scale,
        ];
    }
    
    // emit my position, throttled
    const sendPos = throttle((id, x, y) => socket.emit('pos', id, getGame(), x, y), 25);
    
    function emitPos() {
        sendPos(id, window.myPos.x, window.myPos.y);
        lastPos.x = window.myPos.x;
        lastPos.y = window.myPos.y;
        // vclog(`emitted pos ${window.myPos.x}, ${window.myPos.y} as ${id}`);
    }
    
    
    // get the current user's audio stream
    async function getAudioStream() {
        if (!audioStream) {
            audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        }
        return audioStream;
    }
    
    // Add a mute indicator
    const muteIndicator = document.createElement('div');
    muteIndicator.style.position = 'fixed';
    muteIndicator.style.width = '25px';
    muteIndicator.style.height = '25px';
    muteIndicator.style.borderRadius = '50%';
    muteIndicator.style.top = '10px';
    muteIndicator.style.left = '10px';
    muteIndicator.style.zIndex = '1000';
    
    // make clicking the mute indicator toggle the mute state
    muteIndicator.addEventListener('click', toggleAudioStream);
    
    document.body.appendChild(muteIndicator);
    
    // Add the box-shadow property to the mute indicator element
    function setGlowColor(color) {
        muteIndicator.style.boxShadow = `0 0 5px 2px ${color}`;
    }
    
    // Update the updateMuteIndicator function to set the glow color
    function updateMuteIndicator() {
        const color = isMuted ? 'red' : 'green';
        muteIndicator.style.backgroundColor = color;
        setGlowColor(color);
    }
    
    // Modify the muteAudioStream and unmuteAudioStream functions into a single function
    function toggleAudioStream() {
        if (audioStream) {
            audioStream.getAudioTracks().forEach(track => {
                track.enabled = !track.enabled;
            });
            isMuted = !isMuted;
            updateMuteIndicator();
            vclog(`audio ${isMuted ? 'muted' : 'unmuted'}`);
        }
    }
    
    updateMuteIndicator();
    
    document.addEventListener('keydown', (event) => {
        if (event.key.toLowerCase() === muteKey.toLowerCase() && !event.repeat) {
            toggleAudioStream();
        }
    });
    
    // split an audio stream into left and right channels
    class StreamSplit {
        constructor(stream, {left=1, right=1}={}) {
            this.stream = stream;
        
            // create audio context using the stream as a source
            const track = stream.getAudioTracks()[0];
            this.context = new AudioContext();
            this.source = this.context.createMediaStreamSource(new MediaStream([track]));
        
            // create a channel for each ear (left, right)
            this.channels = {
                left: this.context.createGain(),
                right: this.context.createGain(),
            };
        
            // connect the gains
            this.source.connect(this.channels.left);
            this.source.connect(this.channels.right);
        
            // create a merger to join the two gains
            const merger = this.context.createChannelMerger(2);
            this.channels.left.connect(merger, 0, 0);
            this.channels.right.connect(merger, 0, 1);
        
            // set the volume for each side
            this.setVolume(left, right);
        
            // connect the merger to the audio context
            merger.connect(this.context.destination);
        
            this.destination = this.context.createMediaStreamDestination();
        }
        
        // set the volume
        setVolume(left=0, right=0) {
            // clamp volumes between 0 and 1
            left = Math.max(Math.min(left, 1), 0);
            right = Math.max(Math.min(right, 1), 0);
        
            // disable the stream if the volume is 0
            this.stream.enabled = left !== 0 && right !== 0;
        
            // set the volumes for each channel's gain
            this.channels.left.gain.value = left;
            this.channels.right.gain.value = right;
        }
    
        // close the context, stop the audio
        close() {
            return this.context.close();
        }
    }
    
    // play an audio stream
    function playAudioStream(stream, target) {
        // create the video element for the stream
        const elem = document.createElement('video');
        elem.srcObject = stream;
        elem.muted = true;
        elem.setAttribute('data-peer', target);
        elem.onloadedmetadata = () => elem.play();
    
        // add it to the stream container
        document.querySelector('body').appendChild(elem);
    }
    
    // create peer, setup handlers
    function initPeer() {
        peer = new Peer(id, {host: server, port: port, path: '/peerjs'});
    
        peer.on('open', id => { vclog(`My peer ID is: ${id}`); });
        peer.on('disconnected', id => { vclog('lost connection'); });
        peer.on('error', err => { console.error(err); });
    
        // run when someone calls us. answer the call
        peer.on('call', async call => {
            vclog(`call from ${call.peer}`);
            call.answer(await getAudioStream());
            receiveCall(call);
        });
    }
    
    // start a call with target
    async function startCall(target) {
        if (!peer) return;
        const call = peer.call(target, await getAudioStream());
        receiveCall(call);
    }
    
    // play the stream from the call in a video element
    function receiveCall(call) {
        call.on('stream', stream => {
            stream.noiseSuppression = true;
            const player = players.find(p => p.id === call.peer);
            if (!player) {
                vclog(`couldn't find player for stream ${call.peer}`);
            } else {
                player.stream = new StreamSplit(stream, {left: 1, right: 1});
                playAudioStream(stream, call.peer);
                vclog(`created stream for ${call.peer}`);
                // mute the stream
                player.stream.setVolume(0, 0);
            }
            // playAudioStream(stream, call.peer);
        });
    }
    
    // setup peer when user receives id
    socket.on('id', async connId => {
        // this only happens if we lose connection with the server
        if (id) {
            vclog(`destroying old identity ${id} and replacing with ${connId}`);
            peer.destroy();
            peer = undefined;
            return;
        }
    
        id = connId;
        initPeer();
    });
    
    // talk to any user who joins
    socket.on('join', (target, pos) => {
        vclog(`calling ${target}`);
        players.push({ id: target, g: "unknown", team: 0, pos});
        startCall(target);
    });
    
    socket.on('players', existingPlayers => {
        console.log('players from hostserver', existingPlayers);
        let tempp = [];
        for (const p of existingPlayers) {
            tempp.push({
                id: p.id,
                g: p.g,
                team: 0,
                pos: p.pos,
            });
        }
        players = tempp;
    });
    
    // position updates from other players
    socket.on('pos', (target, g, incomingpos) => {
        // vclog(`pos update from ${target} to ${incomingpos.x}, ${incomingpos.y}`);
        const player = players.find(p => p.id === target);
        if (!player) {
            vclog(`couldn't find player for pos ${target}`);
        } else {
            player.pos.x = incomingpos.x;
            player.pos.y = incomingpos.y;
            player.g = g;
        }
    });
    
    
    socket.on('leave', target => {
        vclog(`call dropped from ${target}`);
        const elem = $(`[data-peer="${target}"]`);
        if (elem) elem.remove();
    
        // remove player from players list
        const index = players.findIndex(p => p.id === target);
        if (index > -1) {
        // close the stream
        if (players[index].stream)
            players[index].stream.close();
        players.splice(index, 1)
        };
    });
    
    function ingamecheck(){
        if (window.location.pathname == "/") {
            if (Object.values(window.module.exports.settings).find(v => v && v.mode).mode.id != 'welcome') {
                if (window.location.href != `https://starblast.io/#`) {
                    return true
                }
            }
        }
        return false
    }
    
    setInterval(() => {
        console.log(`calling with ${players.length} players`, players)
    }, 10000);
    
    setInterval(() => {
        // calculate volumes for each player
        for (const p of players) {
            if (p.stream) {
                // set the volume for the player to nothing
                p.stream.setVolume(0, 0);
                if(p.g == "unknown") return;
                if(p.g != getGame()) return;
                // if the player is in the same game, calculate the volume
                const [left, right] = calcVolumes(window.myPos, p.pos);
                p.stream.setVolume(left, right);
            }
        }
    
        // pull players coordinates from the game
        if(Object.values(Object.values(window.module.exports.settings).find(v => v.mode)).find(v => v.status).status != undefined && ingamecheck()){
            window.myPos = Object.values(Object.values(window.module.exports.settings).find(v => v.mode)).find(v => v.status).status;
            if(window.myPosOld == undefined) window.myPosOld = window.myPos;
    
            // if(window.myPos.x != window.myPosOld.x || window.myPos.y != window.myPosOld.y){
                movePlayer(window.myPos.x, window.myPos.y);
                // console.log('moved player');
                window.myPosOld = window.myPos;
            // }
        }
    }, 300);
    
    movePlayer(10,10)
}, 1000);