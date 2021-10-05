let ctx = null
let audioSrc = null
let analyser = null
let sampleInterval = null
let prevSpec = 0
let source = null
let stream = null
let audioTrack = null
let threshold;

const body = document.getElementById("body");
const settingSwitch = document.getElementById("setting-switch");
const controlPanel = document.getElementById("control-panel");
const backgroundUploader = document.getElementById('background');
const characterUploaders = document.querySelectorAll('.character-image-input');
const setCharacter = document.getElementById("set-character");
const faceElement = document.getElementById('face');
const mouthElement = document.getElementById('mouth');
const muteButton = document.getElementById("mute");
const resetButton = document.getElementById("reset");
const range = document.getElementById("threshold");
const currentThreshold = document.getElementById("current-threshold");
const positionResetButton = document.getElementById("position-reset");
const characterSize = document.getElementById("size");
const currentCharacterSize = document.getElementById("current-size");
const crosswise = document.getElementById("crosswise");
const currentCrosswise = document.getElementById("current-crosswise");
const vertical = document.getElementById("vertical");
const currentVertical = document.getElementById("current-vertical");
const imgPath = './image/';
let mouthClose = imgPath + 'mouth_close.png';
let mouthOpenLight = imgPath + 'mouth_open_light.png';
let mouthOpen = imgPath + 'mouth_open.png';

const dbName = 'settingDB';
const dbVersion = '1';
const layoutStore = 'layout';
const characterStore = 'character';
const backgroundStore = 'background';
let db;

threshold = range.value;
currentThreshold.value = threshold;


if('serviceWorker' in navigator && window.location.hostname != "localhost") {
    navigator.serviceWorker.register('/CheapVTuber/sw.js');
};

openDB = () => {
  let req = indexedDB.open(dbName, dbVersion);

  req.onsuccess = (evt) => {
    console.log("IndexedDB opened.");
    db = evt.currentTarget.result;
    let bgTrans = db.transaction(backgroundStore, 'readonly');
    let bgStore = bgTrans.objectStore(backgroundStore);
    let bgGetReq = bgStore.get(0);

    bgGetReq.onerror = (evt) => {
      console.error("bgGetReq:", evt.target.errorCode);
    }

    bgGetReq.onsuccess = (evt) => {
      if (typeof evt.target.result != 'undefined') {
        let image = evt.target.result.img;
        let blobUrl = window.URL.createObjectURL(image);
        body.style.backgroundImage = `url("${blobUrl}")`;
        console.log("background image changed");
        body.onload = () => {
          window.URL.revokeObjectURL(blobUrl);
          console.log("blobURL revoked.");
        }
      }
    }

    let charaTrans = db.transaction(characterStore, 'readonly');
    let charaStore = charaTrans.objectStore(characterStore);
    let charaGetReq = charaStore.get(0);

    charaGetReq.onerror = (evt) => {
      console.error("charaGetReq:", evt.target.errorCode);
    }

    charaGetReq.onsuccess = (evt) => {
      if (typeof evt.target.result != 'undefined') {
        faceElement.src = window.URL.createObjectURL(evt.target.result.face);
        mouthClose = window.URL.createObjectURL(evt.target.result.mouthClose);
        mouthOpenLight = window.URL.createObjectURL(evt.target.result.mouthOpenLight);
        mouthOpen = window.URL.createObjectURL(evt.target.result.mouthOpen);
        mouthElement.src = mouthClose;
      }
    }

    let layTrans = db.transaction(layoutStore, 'readonly');
    let layStore = layTrans.objectStore(layoutStore);
    let layGetReq;
    Array("size", "top", "left").forEach((k) => {
      layGetReq = layStore.get(k);

      layGetReq.onerror = (evt) => {
        console.error("layGetReq:", evt.target.errorCode);
      }

      layGetReq.onsuccess = (evt) => {
        if (typeof evt.target.result != 'undefined') {
          let value = evt.target.result.value;
          switch(k) {
            case 'size':
              faceElement.style.width = mouthElement.style.width = `${value}px`;
              characterSize.value = currentCharacterSize.value = value;
              break;
            case 'top':
              faceElement.style.top = mouthElement.style.top = `${value}px`;
              vertical.value = currentVertical.value = value;
              break;
            case 'left':
              faceElement.style.left = mouthElement.style.left = `${value}px`;
              crosswise.value = currentCrosswise.value = value;
              break;
          }
        }
      }
    });
  };

  req.onerror = (evt) => {
    console.error("openDB:", evt.target.errorCode);
  };

  req.onupgradeneeded = (evt) => {
    let backgroundObjectStore = evt.currentTarget.result.createObjectStore(backgroundStore, {keyPath : 'id'})
    backgroundObjectStore.createIndex("id", "id", { unique: true });
    backgroundObjectStore.createIndex("img", "img", { unique: false });
    let characterObjectStore = evt.currentTarget.result.createObjectStore(characterStore, {keyPath: 'id'})
    characterObjectStore.createIndex("id", "id", { unique: true });
    characterObjectStore.createIndex("face", "face", { unique: false });
    characterObjectStore.createIndex("mouthClose", "mouthClose", { unique: false });
    characterObjectStore.createIndex("mouthOpenLight", "mouthOpenLight", { unique: false });
    characterObjectStore.createIndex("mouthOpen", "mouthOpen", { unique: false });
    let layoutObjectStore = evt.currentTarget.result.createObjectStore(layoutStore, {keyPath: 'kind'})
    layoutObjectStore.createIndex("kind", "kind", { unique: true });
    layoutObjectStore.createIndex("value", "value", { unique: false });
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
  audioTrack = stream.getAudioTracks()[0];
  source = ctx.createMediaStreamSource(stream);
  source.connect(analyser);

  sampleInterval = setInterval(() => {
    let spectrums = new Uint8Array(analyser.fftSize)
    analyser.getByteFrequencyData(spectrums)
    syncLip(spectrums)
  }, 50)
}

syncLip = (spectrums) => {
  let imgSrc = mouthClose;
  const totalSpectrum = spectrums.reduce(function(a, x) { return a + x })
  if (totalSpectrum - prevSpec > threshold) {
    imgSrc = mouthOpen;
  } else if (prevSpec - totalSpectrum > threshold) {
    imgSrc = mouthOpenLight;
  }
  mouthElement.src = imgSrc;
  prevSpec = totalSpectrum
}

settingSwitch.onclick = () => {
  if(controlPanel.style.display == "block") {
    controlPanel.style.display = "none";
  } else {
    controlPanel.style.display = "block";
  }
}

muteButton.onclick = () => {
  if (muteButton.innerText == "UNMUTE") {  // become unmute
    if(!ctx) {
      webAudioSetup()
    } else {
      audioTrack.enabled = true;
    }
    muteButton.innerText = "MUTE";
  } else {
    audioTrack.enabled = false;
    mouthElement.src = mouthClose;
    muteButton.innerText = "UNMUTE";
  }
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

setLayoutDB = (kind, value) => {
  let obj = {'kind': kind, 'value': value};
  let trans = db.transaction(layoutStore, 'readwrite');
  let store = trans.objectStore(layoutStore);
  let req;
  try {
    req = store.put(obj);
  } catch(e) {
    throw e;
  }
}

positionResetButton.onclick = () => {
  let size = 400;
  let left = 0;
  let top = 0;
  characterSize.value = size;
  crosswise.value = left;
  vertical.value = top;
  characterSize.oninput();
  crosswise.oninput();
  vertical.oninput();
}

characterSize.oninput = (e) => {
  let size = characterSize.value;
  currentCharacterSize.value = size;
  faceElement.style.width = mouthElement.style.width = `${size}px`;
  setLayoutDB('size', size);
}

currentCharacterSize.onchange = (e) => {
  characterSize.value = currentCharacterSize.value;
  characterSize.oninput();
}

crosswise.oninput = (e) => {
  let left = crosswise.value;
  currentCrosswise.value = left;
  faceElement.style.left = mouthElement.style.left = `${left}px`;
  setLayoutDB('left', left);
}

currentCrosswise.onchange = (e) => {
  crosswise.value = currentCrosswise.value;
  crosswise.oninput();
}

vertical.oninput = (e) => {
  let top = vertical.value;
  currentVertical.value = top;
  faceElement.style.top = mouthElement.style.top = `${top}px`;
  setLayoutDB('top', top);
}

currentVertical.onchange = (e) => {
  vertical.value = currentVertical.value;
  vertical.oninput();
}

backgroundUploader.onchange = (e) => {
  let file = e.target.files[0];
  console.log(file);
  let obj = {'id': 0, 'img': file};
  let trans = db.transaction(backgroundStore, 'readwrite');
  let store = trans.objectStore(backgroundStore);
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

setCharacter.onclick = () => {
  let uploaders = Array.from(characterUploaders);
  if(uploaders.some((t) => {return (t.value === 'undefined' || t.value === '')})){
    alert("There are unset images.");
    return;
  }

  let face, close, halfOpen, open;
  characterUploaders.forEach((t) => {
    switch(t.id) {
      case 'input-face':
        face = t.files[0];
        break;
      case 'input-mouth_close':
        close = t.files[0];
        break;
      case 'input-mouth_open_light':
        halfOpen = t.files[0];
        break;
      case 'input-mouth_open':
        open = t.files[0];
        break;
    }
  });

  let obj = {'id': 0, 'face': face, 'mouthClose': close, 'mouthOpenLight': halfOpen, 'mouthOpen': open};
  let trans = db.transaction(characterStore, 'readwrite');
  let store = trans.objectStore(characterStore);
  let req;
  try {
    req = store.put(obj);
  } catch(e) {
    throw e;
  }

  req.onsuccess = (evt) => {
    faceElement.src = window.URL.createObjectURL(face);
    mouthClose = window.URL.createObjectURL(close);
    mouthOpenLight = window.URL.createObjectURL(halfOpen);
    mouthOpen = window.URL.createObjectURL(open);
    mouthElement.src = mouthClose;
    console.log("character image changed");
  }

  req.onerror = () => {
    console.error("characterUploader:", this.error);
  }
}

controlPanel.style.display = "none";
openDB()
