const { SerialPort } = require('serialport')
const { DelimiterParser } = require('@serialport/parser-delimiter')

const osc = require("osc")

// Create an osc.js UDP Port listening on port 57121.
const udpPort = new osc.UDPPort({
  localAddress: "0.0.0.0",
  localPort: 57129,
  metadata: true
});

// Listen for incoming OSC messages.
udpPort.on("message", function (oscMsg, timeTag, info) {
  console.log("An OSC message just arrived!", oscMsg);
  console.log("Remote info is: ", info);
});

// Open the socket.
udpPort.open();

const { fft, util } = require("fft-js");

const port = new SerialPort({
  path: '/dev/ttyUSB1',
  baudRate: 115200,
  autoOpen: false,
})

port.open(function (err) {
  if (err) {
    return console.log('Error opening port: ', err.message)
  }

  // Because there's no callback to write, write errors will be emitted on the port:
  port.write('main screen turn on')
})

// The open event is always emitted
port.on('open', function () {
  // open logic
})

let signals = [];
let numDevices = 2;

for (let i = 0; i < numDevices; i++) {
  signals[i] = [];
}

const parser = port.pipe(new DelimiterParser({ delimiter: "\n" }))
parser.on("data", (data) => {
  let xyzs = data.toString().replace(/\s/g, "").split(",");
  let results = [];
  if (xyzs.length == 3 * numDevices) {
    for (let i = 0; i < numDevices; i++) {
      let signal = signals[i];
      let x = parseFloat(xyzs[3 * i + 0]);
      let y = parseFloat(xyzs[3 * i + 1]);
      let z = parseFloat(xyzs[3 * i + 2]);
      signal.push(Math.sqrt(x * x + y * y + z * z));

      if (signal.length > 16) {
        signal.shift();
        let p = fft(signal);
        let mag = util.fftMag(p);
        let value = Math.min(1, mag[7] * 2);
        results.push(value);
    
        udpPort.send({
          address: "/ctrl",
          args: [
            {
              type: "s",
              value: "s" + i
            },
            {
              type: "f",
              value
            },
          ]
        }, "127.0.0.1", 6010);
      }
    }
  }
  if (results.length > 0) {
    console.log(results);
  }
});


