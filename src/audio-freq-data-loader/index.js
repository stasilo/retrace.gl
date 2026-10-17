
async function audioFreqDataLoader(url, options = {}) {
    const {
        type = 'freq', // 'time' || 'freq'
        startTime = 0,
        endTime = 1,
        fftSize = 2048,
        smoothingTimeConstant = 0.9
    } = options;

    const resp = await fetch(url, {cache: 'no-store'});

    if(!resp.ok) {
        throw `Could not fetch audio data: ${resp.status}`;
    }

    const respBuffer = await resp.arrayBuffer();
    let ctx = new AudioContext();

    return new Promise((resolve, reject) => {
        ctx.decodeAudioData(respBuffer, (buffer) => {
            let offlineCtx = new OfflineAudioContext(
                buffer.numberOfChannels,
                buffer.length,
                buffer.sampleRate
            );

            let bufferSource = offlineCtx.createBufferSource();
            bufferSource.buffer = buffer;

            let analyser = offlineCtx.createAnalyser();

            analyser.fftSize = fftSize;
            analyser.smoothingTimeConstant = smoothingTimeConstant;

            let scp = offlineCtx.createScriptProcessor(256, 0, 1);

            bufferSource.connect(analyser);
            scp.connect(offlineCtx.destination);

            let freqData = new Uint8Array(analyser.frequencyBinCount);
            let freqTotal = [];

            scp.onaudioprocess = (e) => {
                if(type === 'time') {
                    analyser.getByteTimeDomainData(freqData);
                } else {
                    analyser.getByteFrequencyData(freqData);
                }

                if (e.playbackTime >= startTime && e.playbackTime <= endTime) {
                    freqTotal = [...freqTotal, ...freqData];
                }

                if(e.playbackTime > endTime) {
                    scp.onaudioprocess = undefined;
                    resolve(new Uint8Array(freqTotal));
                }
            };

            bufferSource.start(0);

            offlineCtx.startRendering();
        });
    });
}

export {audioFreqDataLoader};
