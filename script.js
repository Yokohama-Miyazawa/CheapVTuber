let ctx = null
let audioSrc = null
let analyser = null
let sampleInterval = null
let prevSpec = 0
let source = null
let stream = null
let threshold;

const body = document.getElementById("body");
const buckgroundUploader = document.getElementById('background');
const mouseElement = document.getElementById('mouse');
const startButton = document.getElementById("start");
const stopButton = document.getElementById("stop");
const resetButton = document.getElementById("reset");
const range = document.getElementById("threshold");
const currentThreshold = document.getElementById("current-threshold");
const imgPath = './image/';

const dbName = 'settingDB';
const dbVersion = '1';
const storeName = 'background';
let db;

threshold = range.value;
currentThreshold.value = threshold;
stopButton.disabled = true;

if('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/CheapVTuber/sw.js');
};

openDB = () => {
  let req = indexedDB.open(dbName, dbVersion);

  req.onsuccess = (evt) => {
    console.log("IndexedDB opened.");
    db = evt.currentTarget.result;
    let trans = db.transaction(storeName, 'readonly');
    let store = trans.objectStore(storeName);
    let getReq = store.get(0);

    getReq.onerror = (evt) => {
      console.error("getReq:", evt.target.errorCode);
    }

    getReq.onsuccess = (evt) => {
      if (typeof evt.target.result != 'undefined') {
        let image = evt.target.result.img;
        let blobUrl = window.URL.createObjectURL(image);
        body.style.backgroundImage = `url("${blobUrl}")`;
        console.log("image changed");
        body.onload = () => {
          window.URL.revokeObjectURL(blobUrl);
          console.log("blobURL revoked.");
        }
      }
    }
  };

  req.onerror = (evt) => {
    console.error("openDB:", evt.target.errorCode);
  };

  req.onupgradeneeded = (evt) => {
    let objectStore = evt.currentTarget.result.createObjectStore(storeName, {keyPath : 'id'})
    objectStore.createIndex("id", "id", { unique: true });
    objectStore.createIndex("img", "img", { unique: false });
    console.log("IndexedDB upgraded.");
  };
}


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
  currentThreshold.value = threshold;
}

range.oninput = (e) => {
  threshold = range.value;
  currentThreshold.value = threshold;
}
currentThreshold.onchange = (e) => {
  range.value = currentThreshold.value;
  range.oninput();
}

buckgroundUploader.onchange = (e) => {
  let file = e.target.files[0];
  let obj = {'id': 0, 'img': file};
  let trans = db.transaction(storeName, 'readwrite');
  let store = trans.objectStore(storeName);
  let req;
  try {
    req = store.put(obj);
  } catch(e) {
    throw e;
  }

  req.onsuccess = (evt) => {
    let blobUrl = window.URL.createObjectURL(file);
    body.style.backgroundImage = `url("${blobUrl}")`;
    console.log("image changed");
    body.onload = () => {
      window.URL.revokeObjectURL(blobUrl);
      console.log("blobURL revoked.");
    }
  }

  req.onerror = () => {
    console.error("backgroundUploader:", this.error);
  }
}

openDB()