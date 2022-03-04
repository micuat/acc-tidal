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
  path: '/dev/ttyACM0',
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

// Read data that is available but keep the stream in "paused mode"
//port.on('readable', function () {
//  console.log('Data:', port.read().toString())
//})

let signal = [];

const parser = port.pipe(new DelimiterParser({ delimiter: "\n" }))
parser.on("data", (data) => {
  let xyz = data.toString().replace(/\s/g, "").split(",");
  if (isNaN(xyz[0]) === false && xyz[0] !== ""
    && isNaN(xyz[1]) === false && xyz[1] !== ""
    && isNaN(xyz[2]) === false && xyz[2] !== "") {
    //    console.log(xyz)
    let x = parseInt(xyz[0]);
    let y = parseInt(xyz[0]);
    let z = parseInt(xyz[0]);
    signal.push(Math.sqrt(x * x + y * y + z * z));
  }
  else {
    //    console.log("nan", xyz)
  }
  if (signal.length > 16) {
    signal.shift();
    let p = fft(signal);
    let mag = util.fftMag(p);
    //    console.log(mag.slice(2,3));
    console.log(Math.min(1, mag[7] / 1000));

    udpPort.send({
      address: "/ctrl",
      args: [
        {
          type: "s",
          value: "hello"
        },
        {
          type: "f",
          value: Math.min(1, mag[7] / 1000)
        },
      ]
    }, "127.0.0.1", 6010);

    // udpPort.send({
    //   address: "/processing",
    //   args: mag.map(m => {
    //     return {
    //       type: "f",
    //       value: m
    //     }
    //   })
    // }, "127.0.0.1", 6060);

  }
});


