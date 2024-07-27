const http = require('http');
const { Readable } = require('stream');
const colors = require('colors/safe');
const url = require('url');
const fs = require('mz/fs');
const path = require('path');

// Setup frames in memory
let original = [];
let flipped = [];

// Load frames asynchronously
(async () => {
  try {
    const framesPath = 'frames';
    const files = await fs.readdir(framesPath);

    // Sort files numerically
    files.sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

    console.log('Loading frames...');
    original = await Promise.all(files.map(async (file) => {
      const frame = await fs.readFile(path.join(framesPath, file));
      return frame.toString();
    }));

    flipped = original.map(f => f.split('').reverse().join(''));
    console.log('Frames loaded successfully');
  } catch (err) {
    console.error('Error loading frames', err);
  }
})();

const colorsOptions = [
  'red', 'yellow', 'green', 'blue', 'magenta', 'cyan', 'white'
];

const numColors = colorsOptions.length;

const selectColor = previousColor => {
  let color;
  do {
    color = Math.floor(Math.random() * numColors);
  } while (color === previousColor);
  return color;
};

const streamer = (stream, opts) => {
  let index = 0;
  let lastColor;
  const frames = opts.flip ? flipped : original;

  // Add a delay before starting the stream
  setTimeout(() => {
    console.log('Starting frame stream...');
    setInterval(() => {
      // clear the screen
      stream.push('\033[2J\033[3J\033[H');

      const newColor = lastColor = selectColor(lastColor);

      console.log(`Displaying frame: ${index}`);
      stream.push(colors[colorsOptions[newColor]](frames[index]));

      index = (index + 1) % frames.length;
    }, 70);
  }, 1000); // Delay of 1 second before starting the stream
};

const validateQuery = ({ flip }) => ({
  flip: String(flip).toLowerCase() === 'true'
});

const server = http.createServer((req, res) => {
  if (req.url === '/healthcheck') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ status: 'ok' }));
  }

  if (req.headers && req.headers['user-agent'] && !req.headers['user-agent'].includes('curl')) {
    res.writeHead(302, { Location: 'https://github.com/bcharthur/br0nson.live' });
    return res.end();
  }

  const stream = new Readable();
  stream._read = function noop() {};
  stream.pipe(res);
  const interval = streamer(stream, validateQuery(url.parse(req.url, true).query));

  req.on('close', () => {
    stream.destroy();
    clearInterval(interval);
  });
});

const port = process.env.BR0NSON_PORT || 3000;
const host = '0.0.0.0'; // Vérifiez que cette ligne est correcte
server.listen(port, host, err => {
  if (err) throw err;
  console.log(`Listening on ${host}:${port}`);
});

module.exports = server;
