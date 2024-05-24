const { createQuicSocket } = require('node-quic');
const quicSocket = createQuicSocket({
    endpoint: { port: 1234 }
});

quicSocket.on('session', (session) => {
    session.on('stream', (stream) => {
        // handle the incoming stream
    });
});

quicSocket.listen({ alpn: 'webtransport' });