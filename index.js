const fs = require('mz/fs');
const path = require('path');
const http = require('http');
const url = require('url');
const { Readable } = require('stream');
const colors = require('colors/safe');

// Setup frames in memory
let original;
let flipped;
let files;

(async () => {
  const framesPath = 'frames';
  try {
    files = await fs.readdir(framesPath);

    // Sort files numerically
    files.sort((a, b) => {
      return parseInt(a, 10) - parseInt(b, 10);
    });

    original = await Promise.all(files.map(async (file) => {
      const frame = await fs.readFile(path.join(framesPath, file));
      return frame.toString();
    }));

    flipped = original.map(f => {
      return f
        .split('')
        .reverse()
        .join('');
    });

    console.log('Frames loaded successfully');
  } catch (err) {
    console.error('Error loading frames', err);
  }
})();

const colorsOptions = [
  'white',
  'white',
  'white',
  'white',
  'white',
  'white',
  'white'
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

  return setInterval(() => {
    // clear the screen
    stream.push('\033[2J\033[3J\033[H');

    const newColor = lastColor = selectColor(lastColor);

    console.log(`Displaying frame: ${files[index]}`);
    stream.push(colors[colorsOptions[newColor]](frames[index]));

    index = (index + 1) % frames.length;
  }, 70);
};

const validateQuery = ({ flip }) => ({
  flip: String(flip).toLowerCase() === 'true'
});

const server = http.createServer((req, res) => {
  if (req.url === '/healthcheck') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ status: 'ok' }));
  }

  if (
    req.headers &&
    req.headers['user-agent'] &&
    !req.headers['user-agent'].includes('curl')
  ) {
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
server.listen(port, err => {
  if (err) throw err;
  console.log(`Listening on localhost:${port}`);
});
