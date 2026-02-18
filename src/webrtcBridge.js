let wrtc;
try {
  wrtc = require('@roamhq/wrtc');
} catch (e) {
  console.warn('[WebRTC] @roamhq/wrtc not available. Using browser-only WebRTC mode.');
  wrtc = null;
}

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' }
];

function isAvailable() {
  return wrtc !== null;
}

function createPeerConnection(label) {
  if (!wrtc) {
    throw new Error('Node.js WebRTC not available. Use browser-only mode.');
  }

  const pc = new wrtc.RTCPeerConnection({ iceServers: ICE_SERVERS });

  pc.oniceconnectionstatechange = () => {
    console.log(`[WebRTC:${label}] ICE state: ${pc.iceConnectionState}`);
  };

  pc.onconnectionstatechange = () => {
    console.log(`[WebRTC:${label}] Connection state: ${pc.connectionState}`);
  };

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      console.log(`[WebRTC:${label}] ICE candidate: ${event.candidate.candidate.substring(0, 60)}...`);
    }
  };

  return pc;
}

function filterSdpForWhatsApp(sdp) {
  const lines = sdp.split('\r\n');
  const filtered = lines
    .filter(line => {
      // Keep only SHA-256 fingerprints
      if (line.startsWith('a=fingerprint:') && !line.includes('sha-256')) {
        return false;
      }
      return true;
    })
    .map(line => {
      // Change setup to active for answers
      if (line === 'a=setup:actpass') {
        return 'a=setup:active';
      }
      return line;
    });

  return filtered.join('\r\n');
}

function bridgeAudio(peerA, peerB) {
  peerA.ontrack = (event) => {
    console.log('[WebRTC] Bridging track from peerA -> peerB');
    event.streams[0].getTracks().forEach(track => {
      peerB.addTrack(track, event.streams[0]);
    });
  };

  peerB.ontrack = (event) => {
    console.log('[WebRTC] Bridging track from peerB -> peerA');
    event.streams[0].getTracks().forEach(track => {
      peerA.addTrack(track, event.streams[0]);
    });
  };
}

async function createOfferSdp(pc) {
  // Add audio transceiver
  pc.addTransceiver('audio', { direction: 'sendrecv' });

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  // Wait for ICE gathering to complete
  await waitForIceGathering(pc);

  return pc.localDescription.sdp;
}

async function createAnswerSdp(pc, remoteSdp) {
  const remoteDesc = new wrtc.RTCSessionDescription({
    type: 'offer',
    sdp: remoteSdp
  });
  await pc.setRemoteDescription(remoteDesc);

  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);

  // Wait for ICE gathering to complete
  await waitForIceGathering(pc);

  return pc.localDescription.sdp;
}

async function setRemoteAnswer(pc, remoteSdp) {
  const remoteDesc = new wrtc.RTCSessionDescription({
    type: 'answer',
    sdp: remoteSdp
  });
  await pc.setRemoteDescription(remoteDesc);
}

function waitForIceGathering(pc, timeoutMs = 5000) {
  return new Promise((resolve) => {
    if (pc.iceGatheringState === 'complete') {
      return resolve();
    }

    const timeout = setTimeout(() => {
      console.log('[WebRTC] ICE gathering timed out, proceeding with current candidates');
      resolve();
    }, timeoutMs);

    pc.onicegatheringstatechange = () => {
      if (pc.iceGatheringState === 'complete') {
        clearTimeout(timeout);
        resolve();
      }
    };
  });
}

module.exports = {
  isAvailable,
  createPeerConnection,
  filterSdpForWhatsApp,
  bridgeAudio,
  createOfferSdp,
  createAnswerSdp,
  setRemoteAnswer
};
