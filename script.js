let ctx = null
let audioSrc = null
let analyser = null
let sampleInterval = null
let prevSpec = 0
let source = null
let stream = null
let threshold;

const mouseElement = document.getElementById('mouse')
const buttons = document.querySelectorAll('button')
const player = document.getElementById("player")
const startButton = document.getElementById("start");
const stopButton = document.getElementById("stop");
const resetButton = document.getElementById("reset");
const range = document.getElementById("threshold");
const currentThreshold = document.getElementById("current-threshold");
const imgPath = './image/';

threshold = range.value;
currentThreshold.innerText = threshold;
stopButton.disabled = true;


webAudioSetup = async () => {
  // Web Audio APIの初期化
  ctx = new AudioContext();
  analyser = ctx.createAnalyser();
  analyser.fftSize = 512;
  //analyser.connect(ctx.destination);
  stream = await navigator.mediaDevices.getUserMedia({audio: true});
  source = ctx.createMediaStreamSource(stream);
  source.connect(analyser);
}

syncLip = (spectrums) => {
  let imgName = 'mouse_close.png';
  let totalSpec = 0
  const totalSpectrum = spectrums.reduce(function(a, x) { return a + x })
  if (totalSpectrum - prevSpec > threshold) {
    imgName = 'mouse_open.png';
  } else if (prevSpec - totalSpectrum > threshold) {
    imgName = 'mouse_open_light.png';
  }
  mouseElement.src = imgPath + imgName;
  prevSpec = totalSpectrum
}

startButton.onclick = () => {
  startButton.disabled = true
  stopButton.disabled  = false
  if(!ctx) {
    webAudioSetup()
  }

  sampleInterval = setInterval(() => {
    let spectrums = new Uint8Array(analyser.fftSize)
    analyser.getByteFrequencyData(spectrums)
    syncLip(spectrums)
  }, 50)
}

stopButton.onclick = () => {
  startButton.disabled = false
  stopButton.disabled  = true
  clearInterval(sampleInterval)
  mouseElement.src = imgPath + 'mouse_close.png';
}

resetButton.onclick = () => {
  threshold = 700;
  range.value = threshold;
  currentThreshold.innerText = threshold;
}

range.onchange = (e) => {
  threshold = range.value;
  currentThreshold.innerText = threshold;
}
