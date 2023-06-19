# Starblast Proximity Voice Chat

Lots of code reused from [demo-proximity-voice](https://github.com/Meshiest/demo-proximity-voice), thanks!

## This repository allows you to set up peer to peer voice chat for the game starblast.io
<br>

### clone this repo and then do the following
<br>

Either generate a self-signed certificate or put the server behind a reverse proxy as voice media can only be used over secure connections:

    openssl genrsa -out key.pem
    openssl req -new -key key.pem -out csr.pem
    openssl x509 -req -days 9999 -in csr.pem -signkey key.pem -out cert.pem
    rm csr.pem

Install dependencies with `npm install` and run with `npm start`. Open `https://127.0.0.1:3000`, `https://yourexternalip:3000`, or `https://yourlanip:3000` in a supporting browser on multiple devices.

Edit the userscript to reflect your servers address and port (the port for https is 443)